// Copyright 2022 Meta Mind AB
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  AppConfigService,
  BetaUser,
  Environment,
  isRoleAtMost,
  IUser,
  Member,
  OrganizationAccount,
  OrganizationAccountDocument,
  OrganizationRole,
  PartialUser,
  User,
  UserDocument,
  UserInput,
  UserRoles,
} from '@normative/utils';
import { User as Auth0User, UserData as CreateAuth0UserData } from 'auth0';
import * as crypto from 'crypto';
import _ from 'lodash';
import { Model, Types } from 'mongoose';

import { Auth0AuthenticationClient } from '../components/auth0/authentication-client';
import { Auth0ManagementClient } from '../components/auth0/management-client';
import { parseAuth0Payload } from '../components/auth0/utils';
import { EmailService } from '../components/email/email.service';

import { getWelcomeEmail } from './welcome-email';

const BYPASS_BETA_CHECK = /@(normative\.io|google\.com)$/;

@Injectable()
export class UserService {
  readonly auth0SmsConnection: string;
  readonly auth0DbConnection: string;

  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(BetaUser.name) private betaUserModel: Model<BetaUser>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(OrganizationAccount.name) private organizationAccountModel: Model<OrganizationAccount>,
    private readonly appConfigService: AppConfigService,
    private readonly auth0ManagementClient: Auth0ManagementClient,
    private readonly auth0AuthenticationClient: Auth0AuthenticationClient,
    private readonly emailService: EmailService,
  ) {
    this.auth0SmsConnection = this.appConfigService.getRequired(Environment.AUTH0_SMS_CONNECTION);
    this.auth0DbConnection = this.appConfigService.getRequired(Environment.AUTH0_DB_CONNECTION);
  }

  async fetchMyUser(userId: Types.ObjectId) {
    const [user, organizations] = await Promise.all([
      this.findUser(userId).lean<IUser>(),
      this.organizationAccountModel
        .find({ 'members.user': userId }, { accountType: 1, name: 1, members: 'members.$', vat: 1 })
        .lean<OrganizationAccountDocument[]>()
        .then((organizationAccounts: OrganizationAccountDocument[]) =>
          organizationAccounts.map((organization) => {
            const { _id, accountType, name, vat, members } = organization;
            return { _id, accountType, name, vat, role: members[0].role };
          }),
        ),
    ]);

    // including organizations the user is part of
    user.organizationAccounts = organizations;

    return user;
  }

  async updateTerms(userId: Types.ObjectId, terms: boolean) {
    if (!terms) {
      throw new BadRequestException('Expected terms to be set');
    }
    const propertyChanges: PartialUser = {
      terms: new Date(),
      lastUpdated: new Date(),
      firstTime: false,
    };

    // no need to update linked accounts as they don't contain any related data
    return this.changeUser(userId, propertyChanges, false);
  }

  async updateBccTerms(userId: Types.ObjectId, bccTerms: boolean) {
    if (!bccTerms) {
      throw new BadRequestException('Expected Bcc terms to be set');
    }
    const propertyChanges: PartialUser = {
      bccTerms: new Date(),
      lastUpdated: new Date(),
      firstTime: false,
    };

    // no need to update linked accounts as they don't contain any related data
    return this.changeUser(userId, propertyChanges, false);
  }

  getAllUsers() {
    return this.userModel.find({}, '-password -salt');
  }

  findUser(userId: Types.ObjectId) {
    return this.userModel.findById(userId).select('-password -salt');
  }

  findUserByEmail(email: string) {
    return this.userModel.findOne({ email }).select('-password -salt').lean();
  }

  findUserByAuth0Id(auth0Id: string) {
    return this.userModel.findOne({ auth0Id }).select('-password -salt').lean();
  }

  async createUser(user: UserInput, locale?: string) {
    const password = user.password;
    const localUser = new this.userModel(user);
    const { id, email, name, role } = localUser;

    const [auth0User] = await Promise.all([
      this.createUserInAuth0Db({
        email,
        password,
        name,
        app_metadata: { localUserId: id, role },
        user_metadata: { locale },
      }),
    ]);

    if (auth0User) {
      if (!auth0User.email) {
        throw new InternalServerErrorException(`User has no email specified; can't send reset-password email.`);
      }
      localUser.auth0Id = auth0User.user_id;
      localUser.provider = 'auth0';
      await this.sendResetPasswordEmail(auth0User.email);
    } else {
      localUser.provider = 'local';
    }

    return localUser.save();
  }

  /**
   * Create a user in the local database associated to provided Auth0Id.
   * Validates that no other user with provided email or Auth0ID exists
   * and checks with Auth0 that the user exists within
   *
   * @param auth0UserInput email and auth0Id
   * @param locale
   * @returns
   */
  async createFromAuth0User(auth0UserInput: UserInput) {
    if (!auth0UserInput) {
      throw new BadRequestException(`Missing values`);
    }

    const { email, auth0Id } = auth0UserInput;

    if (!email) {
      throw new BadRequestException(`Missing email`);
    }

    if (!auth0Id) {
      throw new BadRequestException(`Missing auth0Id`);
    }

    // The auth0Id in the request might not match the _primary_ auth0Id for the email address.
    // This happens the first time someone logs in using social (oauth) login for an email address that already has an account.
    // In this case, we don't want to create a new user for them we just want to match the existing user and return it.
    // The linking of auth0 accounts themselves is handled on the Auth0 side using a custom rule.

    const auth0Users = await this.getUsersFromAuth0DbByEmail(email);
    const auth0Identites = _.flatMap(auth0Users, (auth0User) => auth0User.identities ?? []);
    const requestingAuth0Identity = auth0Identites.find((ident) => ident.provider + '|' + ident.user_id === auth0Id);
    if (!requestingAuth0Identity) {
      this.logger.debug(
        `createFromAuth0User: found ${auth0Users.length} auth0 users (${auth0Identites.length} identities) ` +
          `with email ${email} but none matched auth0Id ${auth0Id}`,
      );
      throw new ConflictException(`The user with Auth0Id (${auth0Id}) does not exist in Auth0 yet.`);
    }

    // For idempotency, if the specified user already exists, we just return the existing record.
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      if (!existingUser.auth0Id) {
        this.logger.debug(`createFromAuth0User: matched user ${existingUser._id} but they have no stored auth0 ID`);
        throw new ConflictException(
          `A user with the specified email address exists but does not match the requesting Auth0 record.`,
        );
      }

      const matchedAuth0Identity = auth0Identites.find(
        (ident) => ident.provider + '|' + ident.user_id === existingUser.auth0Id,
      );
      if (matchedAuth0Identity) {
        this.logger.debug(`createFromAuth0User: matched existing user ${existingUser._id}`);
        return existingUser;
      } else {
        this.logger.debug(
          `createFromAuth0User: user ${existingUser._id} does not match auth0 records for email ${email} / ${auth0Id}`,
        );
        throw new ConflictException(
          `A user with the specified email address exists but does not match the requesting Auth0 record.`,
        );
      }
    }

    // There is no existing user record for this auth0 ID. Each user record needs one primary auth0 ID,
    // so if the requesting user already has multiple IDs then we have a problem - we don't know which to use as primary.
    // Also see the logic in the Auth0 actions/rules for 'link-accounts-with-the-same-emails' which similarly
    // aborts with an error if there are multiple existing Auth0 accounts for the same email address.
    if (auth0Users.length > 1) {
      throw new ConflictException(
        `Multiple auth0 records were found for the requested email address; primary cannot be chosen.`,
      );
    }
    const primaryAuth0Id = auth0Users[0].user_id;

    const user: UserInput = {
      email,
      auth0Id: primaryAuth0Id,
      provider: 'auth0',
      role: UserRoles.USER,
    };

    const localUser = new this.userModel(user);
    try {
      await localUser.save();
    } catch (err) {
      throw new ConflictException(`User couldn't be created from input, error: ${err}`);
    }

    try {
      await this.sendWelcomeEmailToBcc(localUser);
    } catch (err) {
      throw new InternalServerErrorException(`Couldn't send welcome email: ${err}`);
    }

    return localUser;
  }

  /**
   * Updates a given user from the db given its id and new values.
   *
   * @param {ObjectId} userId
   * @param {any} userUpdates
   */
  async changeUser(userId: Types.ObjectId, userUpdates: UserInput, updateLinked = true): Promise<IUser> {
    const user = await this.findUser(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    _.forIn(userUpdates, (value, key) => {
      // Only change if there is a new value to change to and if it is
      // different from last value, even if empty.
      // don't save password locally
      if (key !== 'password' && (value || value !== user[key])) {
        user[key] = value;
      }
    });

    user.lastUpdated = new Date();
    user.firstTime = false;

    if (updateLinked) {
      try {
        await this.updateLinkedAccounts(user, userUpdates);
      } catch (err) {
        this.logger.error(err);
      }
    }

    try {
      await user.save();
    } catch (err) {
      throw new UnprocessableEntityException(err instanceof Error ? err.message : `Could not update user ${userId}`);
    }
    return user;
  }

  /**
   * Updates user phone number in local and Auth0 databases
   *
   * @param {ObjectId} userId
   * @param {string} newPhoneNumber
   */
  async changeUserPhone(userId: Types.ObjectId, newPhoneNumber: string): Promise<{ phone_number: string }> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const auth0UserId = user.auth0Id;
    if (!auth0UserId) {
      throw new UnprocessableEntityException('Matched user is missing their auth0 ID');
    }

    user.phone_number = newPhoneNumber;
    user.lastUpdated = new Date();
    user.firstTime = false;

    // save phone number to local database
    await user.save().catch((err) => {
      throw new UnprocessableEntityException(err.message);
    });

    const auth0Users: Auth0User[] = (await this.getUsersFromAuth0DbByEmail(user.email)) as Auth0User[];

    if (auth0Users && auth0Users.length) {
      // create new user with "sms" connection
      const createdSmsProvidedUser = await this.createUserInAuth0Db(
        {
          email: user.email,
          phone_number: newPhoneNumber,
        },
        this.auth0SmsConnection,
      );
      const createdSmsUserId = createdSmsProvidedUser.user_id;
      if (!createdSmsUserId) {
        throw new InternalServerErrorException(`Auth0 created user without a user_id`);
      }
      // get "auth0" provided primary user with "sms" provided identity
      const userWithSmsProvidedIdentity = auth0Users.find(
        (auth0User) => !!(auth0User.identities ?? []).find((i) => i.provider === this.auth0SmsConnection),
      );

      if (!userWithSmsProvidedIdentity) {
        // link new "sms" provided user to "auth0" provided primary user
        // removes "sms" provided user and creates new "sms" provided identity in identities array of primary user
        await this.linkUsersInAuth0Db(auth0UserId, createdSmsUserId, this.auth0SmsConnection);
      }
    }

    return { phone_number: newPhoneNumber };
  }

  /**
   * Updates user email in local, Intercom and Auth0 databases
   *
   * @param {ObjectId} userId
   * @param {string} newEmail
   */
  async changeUserEmail(userId: Types.ObjectId, newEmail: string): Promise<IUser> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userWithNewEmail = await this.userModel.findOne({ email: newEmail });
    if (userWithNewEmail) {
      throw new ConflictException('New email used by other user');
    }

    user.email = newEmail;
    user.lastUpdated = new Date();
    user.firstTime = false;

    await this.updateLinkedAccounts(user, { email: newEmail, email_verified: true });

    return await user.save().catch((err) => {
      throw new UnprocessableEntityException(err.message);
    });
  }

  /**
   * Returns true if given email is included in the list of Beta users and false otherwise
   */
  async isBetaUser(userEmail: string): Promise<boolean> {
    if (BYPASS_BETA_CHECK.test(userEmail)) {
      return true;
    } else {
      const doc = await this.betaUserModel.exists({ email: userEmail }).exec();
      return Boolean(doc);
    }
  }

  /**
   * Adds user to organization members
   *
   * @param { name: string; email: string; locale: string; role: OrganizationRole } userData The user that is being invited.
   * @param {OrganizationAccountDocument} organization The organization to which the user will be invited.
   * @param {UserDocument} invitedByUser The user that is initiating the invite.
   */
  async inviteUserToOrganization(
    userData: {
      name: string;
      email: string;
      locale: string;
      role: OrganizationRole;
    },
    organization: OrganizationAccountDocument,
    invitedByUser: UserDocument,
  ) {
    const { name, email, locale, role } = userData;
    if (!name || !email || !role) {
      throw new BadRequestException('Properties "name", "email" and "role" must be specified');
    }

    // Check for privilege escalation
    // If the requesting user is not a site admin, then the new user must have a role equal to to less than
    // that of the requesting user.
    if (invitedByUser.role !== UserRoles.ADMIN) {
      const inviterRoleInOrg = organization.members.find((m) => m.user._id.equals(invitedByUser._id))?.role;
      if (!isRoleAtMost(role, inviterRoleInOrg)) {
        throw new ForbiddenException(
          `A user can only invite another use to the organization with the same or lower role. The requester had role ${inviterRoleInOrg} and invited the new user to have role ${role}.`,
        );
      }
    }

    const isMember = organization.members.find((currentMember: Member) => {
      // Type assertion is because currentMember.user could be just an ObjectId,
      // or it could be a full UserDocument (if Mongoose populate() was used).
      // In this case the query does populate members.user.
      // But the query is far away, in `AuthzService.loadOrganizationWithMembers`.
      return (currentMember.user as UserDocument).email === email;
    });

    if (isMember) {
      throw new BadRequestException('User with specified email is already organization member');
    }

    // Check if user exists in local database.
    const localUser: UserDocument | null = await this.userModel.findOne({ email });
    // If there's no local user, invite a non-local user.
    const invitedUser: UserDocument = localUser ?? (await this.inviteNonLocalUser(name, email, locale));

    // add user to organization members
    const member = {
      user: invitedUser,
      role,
    };
    organization.members.push(member);

    const updatedOrganization = await organization.save();
    const addedMember = _.find(updatedOrganization.members, (currentMember): boolean =>
      currentMember.user._id.equals(invitedUser._id),
    );
    if (!addedMember) {
      throw new InternalServerErrorException(`Adding member ${email} to ${organization.id} failed unexpectedly.`);
    }
    return {
      role: addedMember.role,
      user: {
        _id: invitedUser._id,
        role: invitedUser.role,
        name: invitedUser.name,
        email: invitedUser.email,
      },
    };
  }

  async resendUserVerificationEmail(email: string) {
    const auth0Users = await this.getUsersFromAuth0DbByEmail(email);

    if (!auth0Users || !auth0Users.length) {
      throw new NotFoundException('User not found');
    }

    const dbProvidedUser = auth0Users.find(
      (user) => !!(user.identities ?? []).find((i) => i.connection === this.auth0DbConnection),
    );

    if (!dbProvidedUser || !dbProvidedUser.user_id) {
      throw new ForbiddenException('User does not have database-provided identity');
    }

    return this.auth0ManagementClient.sendUserEmailVerification(dbProvidedUser.user_id);
  }

  /**
   * Deletes a given user from the db given its email.
   *
   * @param userEmail
   */
  async deleteUserByEmail(userEmail: string) {
    const user = await this.userModel.findOne({ email: userEmail.toLowerCase() });
    if (!user) {
      throw new NotFoundException(`User ${userEmail} not found.`);
    }
    return this.deleteUser(user);
  }

  /**
   * Deletes the users which emails are passed in to the function.
   *
   * @param userEmails
   */
  async deleteUsersByEmail(userEmails: string[]) {
    const userEmailsLowerCased = _.map(userEmails, (userEmail) => userEmail.toLowerCase());
    const users = await this.userModel.find({
      email: {
        $in: userEmailsLowerCased,
      },
    });

    return this.deleteUsers(users);
  }

  async deleteUsersByJSON(users: UserInput[]) {
    const emails = users.map((x) => x.email).filter((x): x is string => typeof x === 'string');
    return this.deleteUsersByEmail(emails);
  }

  async deleteUsersByIds(userIds: Types.ObjectId[]) {
    const users = await this.userModel.find({
      _id: {
        $in: userIds,
      },
    });

    return this.deleteUsers(users);
  }

  async deleteUserById(userId: Types.ObjectId) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found.`);
    }
    return this.deleteUser(user);
  }

  private setAuth0MetaData(localUser: UserDocument) {
    if (!localUser.auth0Id) {
      throw new InternalServerErrorException(`Cannot set Auth0 metadata for user ${localUser.id} which has no auth0Id`);
    }
    const defaultAuth0Props = { app_metadata: { localUserId: localUser._id, role: localUser.role } };
    return this.updateUserDataInAuth0Db(localUser.auth0Id, defaultAuth0Props);
  }

  /**
   * Links user with secondaryUserId to user with primaryUserId
   *
   * @param {string} primaryUserId
   * @param {string} secondaryUserId
   * @param {string} secondaryUserProvider
   */
  private linkUsersInAuth0Db(primaryUserId: string, secondaryUserId: string, secondaryUserProvider: string) {
    return this.auth0ManagementClient.linkAuth0Users(primaryUserId, secondaryUserId, secondaryUserProvider);
  }

  /**
   * Gets the user with specified auth0 id from Auth0 database
   *
   * @param {string} id
   */
  private getUserFromAuth0DbById(id: string) {
    return this.auth0ManagementClient.getAuth0UserById(id);
  }

  /**
   * Gets a list of users with specified email from Auth0 database
   *
   * @param {string} email
   */
  private getUsersFromAuth0DbByEmail(email: string) {
    return this.auth0ManagementClient.getAuth0UsersByEmail(email);
  }

  /**
   * Creates new user in Auth0 database
   *
   * @param {CreateAuth0UserData} userData
   * @param {string} connection
   */
  private createUserInAuth0Db(userData: CreateAuth0UserData, connection?: string) {
    const user = parseAuth0Payload(userData);
    return this.auth0ManagementClient.createAuth0User({ connection: connection ?? this.auth0DbConnection, ...user });
  }

  /**
   * Sends reset password email to auth0 user
   *
   * @param {string} email
   */
  private sendResetPasswordEmail(email: string) {
    return this.auth0AuthenticationClient.sendResetUserPasswordEmail(email);
  }

  /**
   * Removes user in Auth0 database by id
   *
   * @param auth0UserId
   */
  private deleteUserFromAuth0Db(auth0UserId: string) {
    return this.auth0ManagementClient.deleteAuth0User(auth0UserId);
  }

  private deleteUsers(users: UserDocument[]) {
    return Promise.all(users.map((user) => this.deleteUser(user)));
  }

  private async deleteUser(user: UserDocument) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const result = await Promise.all([
      user.auth0Id ? this.deleteUserFromAuth0Db(user.auth0Id) : Promise.resolve(),
      user.remove(),
    ]);

    return _.last(result);
  }

  /**
   * @param {string} name
   * @param {string} email
   * @param {string} locale
   */
  private async inviteNonLocalUser(name: string, email: string, locale: string): Promise<IUser> {
    const password = await this.getTempPassword();
    const localUser: IUser = new this.userModel({ email, password, name });
    const [auth0User] = await Promise.all([
      this.createUserInAuth0Db({
        name,
        email,
        password,
        app_metadata: {
          localUserId: localUser._id,
          role: localUser.role,
        },
        user_metadata: { locale },
      }),
    ]);

    if (auth0User) {
      if (!auth0User.email) {
        throw new InternalServerErrorException(`auth0 user created without an email address.`);
      }
      localUser.auth0Id = auth0User.user_id;
      localUser.provider = 'auth0';
      await this.sendResetPasswordEmail(auth0User.email);
    } else {
      localUser.provider = 'local';
    }

    return localUser.save();
  }

  /**
   * Generates random string
   */
  private getTempPassword(): Promise<string> {
    const byteSize = 128;
    return new Promise((resolve, reject) =>
      crypto.randomBytes(byteSize, (err, password) => (err ? reject(err) : resolve(password.toString('base64')))),
    );
  }

  /**
   * Updates user data in Auth0 database.
   * Returns Promise with Auth0 user instance in case of successful update.
   *
   * @param {string} auth0UserConnection
   * @param {string} auth0UserId
   * @param {Partial<IUser>} userUpdates
   */
  private async updateUserDataInAuth0Db(auth0UserId: string, userUpdates: UserInput): Promise<Auth0User | void> {
    let auth0Updates = parseAuth0Payload(userUpdates);
    if (!auth0Updates) {
      return;
    }
    if (userUpdates.email && userUpdates.password) {
      // Needs for avoiding error "Cannot update password and email simultaneously"
      const { email, ...updates } = auth0Updates;
      const result = await Promise.all([
        // Force email verification
        this.auth0ManagementClient.updateAuth0User(auth0UserId, {
          email,
          email_verified: true,
        }),
        this.auth0ManagementClient.updateAuth0User(auth0UserId, updates),
      ]);
      return _.last(result);
    } else if (userUpdates.email) {
      // Force email verification
      auth0Updates = { ...auth0Updates, email_verified: true };
    }
    return this.auth0ManagementClient.updateAuth0User(auth0UserId, auth0Updates);
  }

  /**
   * Updates user data in remote services (Auth0, Intercom, etc...)
   *
   * @param {IUser} user
   * @param {Partial<IUser>} userUpdates
   */
  private async updateLinkedAccounts(user: IUser, userUpdates: UserInput) {
    const requests: Promise<IUser | Auth0User | void>[] = [];
    if (user.auth0Id) {
      requests.push(this.updateUserDataInAuth0Db(user.auth0Id, userUpdates));
    }

    const result = await Promise.all(requests);
    return _.last(result);
  }

  private async sendWelcomeEmailToBcc(user: IUser) {
    const applicationName = 'The Business Carbon Calculator';

    const emailAddress = user.email;

    const emailData = {
      to: emailAddress,
      subject: `Welcome to ${applicationName}!`,
      // Fill it with your validated email on SendGrid account
      from: 'Normative <noreply@normative.io>',
      html: getWelcomeEmail(
        user,
        applicationName,
        'en',
        'bcc@normative.io',
        this.appConfigService.get(Environment.EMAIL_WELCOME_SITE),
      ),
    };

    return await this.emailService.send(emailData);
  }
}
