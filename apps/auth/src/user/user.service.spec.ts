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

import { HttpException, ForbiddenException } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import {
  rootMongooseTestModule,
  stopInMemoryMongoDb,
  AppConfigModule,
  BetaUser,
  BetaUserSchema,
  IUser,
  User,
  UserSchema,
  UserRoles,
  UserDocument,
  OrganizationRole,
  OrganizationAccount,
  OrganizationAccountSchema,
  DataUploadSdkModule,
  NormativeServerSDKModule,
} from '@normative/utils';
import { Model } from 'mongoose';

import { Auth0AuthenticationClient } from '../components/auth0/authentication-client';
import { Auth0ManagementClient } from '../components/auth0/management-client';
import { EmailService } from '../components/email/email.service';
import { OrganizationAccountService } from '../organizationAccount/organizationAccount.service';

import { UserService } from './user.service';

const mockUser = {
  provider: 'local',
  name: 'Mock User',
  email: 'mock@userservice.com',
} as UserDocument;

const mockUser1 = {
  provider: 'local',
  name: 'Mock User1',
  email: 'moc1k@userservice.com',
} as UserDocument;

const mockUser2 = {
  provider: 'local',
  name: 'Mock User2',
  email: 'mock2@userService.com',
} as UserDocument;

const AUTH0_ACCOUNT_DATA = [
  {
    email: 'local-admin@userservice.com',
    name: 'local-admin@userservice.com',
    user_id: 'auth0|admin-id',
    identities: [
      {
        provider: 'auth0',
        user_id: 'admin-id',
      },
    ],
  },
  {
    email: 'local-user@userservice.com',
    name: 'local-user@userservice.com',
    user_id: 'auth0|local-user-id',
    identities: [
      {
        provider: 'auth0',
        user_id: 'local-user-id',
      },
    ],
  },
  {
    email: 'auth0_signup@normative.io',
    name: 'auth0_signup@normative.io',
    user_id: 'auth0|auth0_signup',
    identities: [
      {
        provider: 'auth0',
        user_id: 'auth0_signup',
      },
    ],
  },
  {
    email: 'auth0_signup_multi_id@normative.io',
    name: 'auth0_signup_multi_id@normative.io',
    user_id: 'auth0|auth0_signup_multi_id',
    identities: [
      {
        provider: 'auth0',
        user_id: 'auth0_signup_multi_id',
      },
      {
        provider: 'social-oauth2',
        user_id: '1122334455667788',
      },
    ],
  },
  {
    email: 'auth0_signup_multi_account@normative.io',
    name: 'auth0_signup_multi_account@normative.io',
    user_id: 'auth0|auth0_signup_multi_account_1',
    identities: [
      {
        provider: 'auth0',
        user_id: 'auth0_signup_multi_account_1',
      },
    ],
  },
  {
    email: 'auth0_signup_multi_account@normative.io',
    name: 'auth0_signup_multi_account@normative.io',
    user_id: 'auth0|auth0_signup_multi_account_2',
    identities: [
      {
        provider: 'social-oauth2',
        user_id: '8877665544332211',
      },
    ],
  },
];

// Info matching one record above.
const validAuth0Id = 'auth0|auth0_signup';
const validEmail = 'auth0_signup@normative.io';

const Auth0AuthenticationClientStub = {
  sendResetUserPasswordEmail: () => Promise.resolve(),
};

const MailServiceStub = {
  send: () => Promise.resolve(),
};

const Auth0ManagementClientStub = {
  getAuth0UserById: (id) => {
    const result = AUTH0_ACCOUNT_DATA.find((item) => item.user_id === id) ?? null;
    return Promise.resolve(result);
  },

  getAuth0UsersByEmail: (email) => {
    return Promise.resolve(AUTH0_ACCOUNT_DATA.filter((item) => item.email === email));
  },

  createAuth0User: ({ email }) => Promise.resolve({ email, user_id: 'auth0-user-id' }),

  updateAuth0User: () => Promise.resolve({}),

  deleteAuth0User: () => Promise.resolve({}),
};

describe('User userService', () => {
  let module: TestingModule;
  let orgService: OrganizationAccountService;
  let userService: UserService;
  let organizationAccountModel: Model<OrganizationAccount>;
  let userModel: Model<User>;
  let betaUserModel: Model<BetaUser>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        AppConfigModule.withStaticEnvironment({
          AUTH0_DB_CONNECTION: 'test-auth0-db-connection',
          AUTH0_SMS_CONNECTION: 'test-auth0-sms-connection',
          NORMATIVE_DATA_UPLOAD_URL: 'https://data-upload-url',
          NORMATIVE_SERVER_URL: 'https://normative-server-url',
        }),
        DataUploadSdkModule,
        MongooseModule.forFeature([
          { name: OrganizationAccount.name, schema: OrganizationAccountSchema },
          { name: User.name, schema: UserSchema },
          { name: BetaUser.name, schema: BetaUserSchema },
        ]),
        NormativeServerSDKModule,
      ],
      providers: [
        OrganizationAccountService,
        UserService,
        {
          provide: Auth0AuthenticationClient,
          useValue: Auth0AuthenticationClientStub,
        },
        {
          provide: Auth0ManagementClient,
          useValue: Auth0ManagementClientStub,
        },
        {
          provide: EmailService,
          useValue: MailServiceStub,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    orgService = module.get<OrganizationAccountService>(OrganizationAccountService);
    organizationAccountModel = module.get(getModelToken(OrganizationAccount.name));
    userModel = module.get(getModelToken(User.name));
    betaUserModel = module.get(getModelToken(BetaUser.name));
  });

  afterAll(async () => {
    await stopInMemoryMongoDb();
  });

  afterEach(async () => {
    await Promise.all([
      userModel.deleteMany({}),
      organizationAccountModel.deleteMany({}),
      betaUserModel.deleteMany({}),
    ]);
  });

  describe('User deletion', () => {
    beforeEach(async () => {
      await userService.deleteUsersByJSON([mockUser, mockUser1, mockUser2]).catch((err) => expect(err).toBeNull());
    });

    afterEach(async () => {
      await userService.deleteUsersByJSON([mockUser, mockUser1, mockUser2]).catch((err) => expect(err).toBeNull());
    });

    it('should delete one user by email', async () => {
      const foundUser = await userService.findUserByEmail(mockUser.email).catch((err) => expect(err).toBeNull());
      expect(foundUser).toBeNull();

      const createdUser: IUser = (await userService
        .createUser(mockUser)
        .catch((createErr) => expect(createErr).toBeNull())) as IUser;
      expect(createdUser).not.toBeNull();
      expect(createdUser._id).not.toBeNull();

      await userService.deleteUserByEmail(createdUser.email).catch((deleteErr) => expect(deleteErr).toBeNull());

      const deletedUser = await userService.findUser(createdUser._id).catch((findErr) => expect(findErr).toBeNull());
      expect(deletedUser).toBeNull();
    });

    it('should delete two users by JSON', async () => {
      const createdUser1: IUser = (await userService
        .createUser(mockUser1)
        .catch((err) => expect(err).toBeNull())) as IUser;
      const createdUser2: IUser = (await userService
        .createUser(mockUser2)
        .catch((err) => expect(err).toBeNull())) as IUser;

      await userService.deleteUsersByJSON([createdUser1, createdUser2]).catch((err) => expect(err).toBeNull());

      const deletedUser1 = await userService.findUser(createdUser1._id).catch((err) => expect(err).toBeNull());
      expect(deletedUser1).toBeNull();

      const deletedUser2 = await userService.findUser(createdUser2._id).catch((err) => expect(err).toBeNull());
      expect(deletedUser2).toBeNull();
    });

    it('should delete two users by ids', async () => {
      const createdUser1: IUser = (await userService
        .createUser(mockUser1)
        .catch((err) => expect(err).toBeNull())) as IUser;
      const createdUser2: IUser = (await userService
        .createUser(mockUser2)
        .catch((err) => expect(err).toBeNull())) as IUser;

      await userService.deleteUsersByIds([createdUser1._id, createdUser2._id]).catch((err) => expect(err).toBeNull());

      const deletedUser1 = await userService.findUser(createdUser1._id).catch((err) => expect(err).toBeNull());
      expect(deletedUser1).toBeNull();

      const deletedUser2 = await userService.findUser(createdUser2._id).catch((err) => expect(err).toBeNull());
      expect(deletedUser2).toBeNull();
    });
  });

  describe('User Auth0 signup', () => {
    it('should return created user from valid Auth0Id', async () => {
      expect.assertions(2);
      const createdUser = await userService.createFromAuth0User({ auth0Id: validAuth0Id, email: validEmail });
      expect(createdUser.email).toEqual(validEmail);

      const foundUser = await userService.findUserByEmail(validEmail);

      expect(foundUser?.email).toEqual(validEmail);
    });

    it('should return existing user if auth0 matches', async () => {
      expect.assertions(3);

      // Create a user.
      const createdUser = await userService.createFromAuth0User({ auth0Id: validAuth0Id, email: validEmail });
      expect(createdUser.email).toEqual(validEmail);

      const foundUser = await userService.findUserByEmail(validEmail);
      expect(foundUser?.email).toEqual(validEmail);

      // Attempting to create the same user should succeed and return the same information.
      const createdUser2 = await userService.createFromAuth0User({ auth0Id: validAuth0Id, email: validEmail });
      expect(createdUser2.email).toEqual(validEmail);
    });

    it('should return existing user even if request uses different identity', async () => {
      expect.assertions(4);

      // Create a user.
      const createdUser = await userService.createFromAuth0User({
        auth0Id: 'auth0|auth0_signup_multi_id',
        email: 'auth0_signup_multi_id@normative.io',
      });
      expect(createdUser.email).toEqual('auth0_signup_multi_id@normative.io');

      const foundUser = await userService.findUserByEmail('auth0_signup_multi_id@normative.io');
      expect(foundUser?.auth0Id).toEqual('auth0|auth0_signup_multi_id');

      // Attempting to create the same user using their alternate identity should return the existing user.
      const createdUser2 = await userService.createFromAuth0User({
        auth0Id: 'social-oauth2|1122334455667788',
        email: 'auth0_signup_multi_id@normative.io',
      });
      // The returned user should use the _primary_ auth0 ID even though it was requested using the secondary.
      expect(createdUser2.email).toEqual('auth0_signup_multi_id@normative.io');
      expect(createdUser2.auth0Id).toEqual('auth0|auth0_signup_multi_id');
    });

    it('should create new user using primary auth0 id', async () => {
      expect.assertions(4);

      // Create a user using their secondary identity
      const createdUser = await userService.createFromAuth0User({
        auth0Id: 'social-oauth2|1122334455667788',
        email: 'auth0_signup_multi_id@normative.io',
      });
      expect(createdUser.email).toEqual('auth0_signup_multi_id@normative.io');
      // New user should record the primary auth0 ID, not the secondary.
      expect(createdUser.auth0Id).toEqual('auth0|auth0_signup_multi_id');

      const foundUser = await userService.findUserByEmail('auth0_signup_multi_id@normative.io');
      expect(foundUser?.email).toEqual('auth0_signup_multi_id@normative.io');
      expect(foundUser?.auth0Id).toEqual('auth0|auth0_signup_multi_id');
    });

    it('should throw error without auth0Id', async () => {
      expect.assertions(2);
      try {
        await userService.createFromAuth0User({ email: validEmail });
      } catch (error: unknown) {
        expect((error as HttpException).message).toEqual(`Missing auth0Id`);
        expect((error as HttpException).getStatus()).toEqual(400);
      }
    });

    it('should throw error without email', async () => {
      expect.assertions(2);
      try {
        await userService.createFromAuth0User({ auth0Id: validAuth0Id });
      } catch (error: unknown) {
        expect((error as HttpException).message).toEqual(`Missing email`);
        expect((error as HttpException).getStatus()).toEqual(400);
      }
    });

    it('should throw error if auth0Id exists', async () => {
      expect.assertions(1);
      await userService.createFromAuth0User({ auth0Id: validAuth0Id, email: validEmail });

      try {
        const differentEmail = validEmail + '0';
        await userService.createFromAuth0User({ auth0Id: validAuth0Id, email: differentEmail });
      } catch (error: unknown) {
        expect((error as HttpException).getStatus()).toEqual(409);
      }
    });

    it('should throw error if email already exists for different auth0Id', async () => {
      expect.assertions(1);
      await userService.createFromAuth0User({ auth0Id: validAuth0Id, email: validEmail });

      try {
        const differentAuth0Id = validAuth0Id + '0';
        await userService.createFromAuth0User({ auth0Id: differentAuth0Id, email: validEmail });
      } catch (error: unknown) {
        expect((error as HttpException).getStatus()).toEqual(409);
      }
    });

    it('should throw error if there are multiple matching auth0 accounts', async () => {
      expect.assertions(2);

      // Create a user with an email that has multiple _unlinked_ auth0 accounts
      try {
        await userService.createFromAuth0User({
          auth0Id: 'auth0|auth0_signup_multi_account_1',
          email: 'auth0_signup_multi_account@normative.io',
        });
      } catch (error: unknown) {
        expect((error as HttpException).message).toMatch(
          `Multiple auth0 records were found for the requested email address`,
        );
        expect((error as HttpException).getStatus()).toEqual(409);
      }
    });
  });

  describe('User invitation', () => {
    const newUserData = {
      name: 'New User',
      email: 'new-user@email.com',
      role: OrganizationRole.GUEST,
      locale: 'en',
    };
    let siteAdmin;
    let orgSuperAdmin;
    let orgAdmin;
    let orgUser;
    let orgGuest;
    let locallyProvidedUser;
    let auth0ProvidedUser;
    let orgAccount;
    let orgAccountWithPopulatedMembers;

    beforeEach(async () => {
      locallyProvidedUser = await userService.createUser({
        provider: 'local',
        name: 'Mock User4',
        email: 'mock4@userservice.com',
      });

      auth0ProvidedUser = await userService.createUser({
        provider: 'auth0',
        name: 'Mock User5',
        email: 'mock5@userservice.com',
      });

      siteAdmin = await userService.createUser({
        provider: 'local',
        name: 'Mock User6',
        email: 'mock6@userservice.com',
        role: UserRoles.ADMIN,
      });

      orgSuperAdmin = await userService.createUser({
        provider: 'local',
        name: 'Super Admin',
        email: 'superAdmin@userservice.com',
        role: UserRoles.USER,
      });

      orgAdmin = await userService.createUser({
        provider: 'local',
        name: 'Admin',
        email: 'admin@userservice.com',
        role: UserRoles.USER,
      });

      orgUser = await userService.createUser({
        provider: 'local',
        name: 'Org User',
        email: 'orgUser@userservice.com',
      });

      orgGuest = await userService.createUser({
        provider: 'local',
        name: 'Org Guest',
        email: 'orgGuest@userservice.com',
      });

      orgAccount = await orgService.createOrgAccount({
        vat: 'SE5569677361012',
        name: 'Mock Organization',
        members: [
          {
            user: orgSuperAdmin._id,
            role: OrganizationRole.SUPER_ADMIN,
          },
          {
            user: orgAdmin._id,
            role: OrganizationRole.ADMIN,
          },
          {
            user: orgUser._id,
            role: OrganizationRole.USER,
          },
          {
            user: orgGuest._id,
            role: OrganizationRole.GUEST,
          },
        ],
      });

      orgAccountWithPopulatedMembers = await organizationAccountModel.findById(orgAccount._id).populate('members.user');
    });

    it('should be able to add existing auth0 provided user to organization', async () => {
      const newOrgMember = await userService.inviteUserToOrganization(
        auth0ProvidedUser,
        orgAccountWithPopulatedMembers,
        orgAdmin,
      );

      const isExistingAuth0ProvidedUser =
        newOrgMember.user._id.equals(auth0ProvidedUser._id) && newOrgMember.role === OrganizationRole.USER;
      expect(isExistingAuth0ProvidedUser).toEqual(true);
    });

    it('should be able to add existing locally provided user to organization', async () => {
      const newOrgMember = await userService.inviteUserToOrganization(
        locallyProvidedUser,
        orgAccountWithPopulatedMembers,
        orgAdmin,
      );

      const isExistingLocallyProvidedUser =
        newOrgMember.user._id.equals(locallyProvidedUser._id) && newOrgMember.role === OrganizationRole.USER;
      expect(isExistingLocallyProvidedUser).toEqual(true);
    });

    it('should be able to add new user to organization', async () => {
      await userService.inviteUserToOrganization(newUserData, orgAccountWithPopulatedMembers, orgAdmin);

      const updatedOrg = await organizationAccountModel.findById(orgAccount._id).populate('members.user');
      const newOrgMember = updatedOrg?.members?.find((member) => {
        // member.user is (Types.ObjectId | UserDocument), because the runtime type depends on
        // whether the query used populate('members.user') or not. This query does use it, so
        // we can assert that member.user is UserDocument.
        const user = member.user as UserDocument;
        return (
          user.email === newUserData.email &&
          user.name === newUserData.name &&
          user.role === UserRoles.USER &&
          member.role === OrganizationRole.GUEST
        );
      });
      expect(newOrgMember).toBeTruthy();
    });

    it('should not add user to organization twice', async () => {
      // First invite should work.
      await userService.inviteUserToOrganization(newUserData, orgAccountWithPopulatedMembers, orgAdmin);
      // Second invite should fail.
      const err = await userService
        .inviteUserToOrganization(newUserData, orgAccountWithPopulatedMembers, orgAdmin)
        .then(() => undefined)
        .catch((e) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect(err.message).toEqual('User with specified email is already organization member');
    });

    it.each([
      [() => orgSuperAdmin, OrganizationRole.SUPER_ADMIN, true],
      [() => orgSuperAdmin, OrganizationRole.ADMIN, true],
      [() => orgSuperAdmin, OrganizationRole.USER, true],
      [() => orgSuperAdmin, OrganizationRole.GUEST, true],
      [() => orgAdmin, OrganizationRole.SUPER_ADMIN, false],
      [() => orgAdmin, OrganizationRole.ADMIN, true],
      [() => orgAdmin, OrganizationRole.USER, true],
      [() => orgAdmin, OrganizationRole.GUEST, true],
      [() => orgUser, OrganizationRole.SUPER_ADMIN, false],
      [() => orgUser, OrganizationRole.ADMIN, false],
      [() => orgUser, OrganizationRole.USER, true],
      [() => orgUser, OrganizationRole.GUEST, true],
      [() => orgGuest, OrganizationRole.SUPER_ADMIN, false],
      [() => orgGuest, OrganizationRole.ADMIN, false],
      [() => orgGuest, OrganizationRole.USER, false],
      [() => orgGuest, OrganizationRole.GUEST, true],
    ])(
      'Should not allow privilege escalation, while allowing all valid requests.',
      async (getInviter, newUserOrgRole, allowed) => {
        const callToAddUser = userService.inviteUserToOrganization(
          { ...newUserData, role: newUserOrgRole },
          orgAccountWithPopulatedMembers,
          getInviter(),
        );
        if (allowed) {
          await expect(callToAddUser).resolves.toBeTruthy();
        } else {
          await expect(callToAddUser).rejects.toThrow(ForbiddenException);
        }
      },
    );

    it.each(Object.values(OrganizationRole))(
      'Should allow a site admin to invite a user with any privilege',
      async (newUserRole) => {
        await expect(
          userService.inviteUserToOrganization(
            {
              name: `New ${newUserRole}`,
              email: `new-${newUserRole}-user@email.com`,
              role: newUserRole,
              locale: 'en',
            },
            orgAccountWithPopulatedMembers,
            siteAdmin,
          ),
        ).resolves.toBeTruthy();
      },
    );
  });

  describe('is Beta user', () => {
    let newUser;

    beforeEach(async () => {
      newUser = await new userModel(mockUser).save();
    });

    it('should return true when user is added to betaUsers list', async () => {
      expect.assertions(1);
      newUser = await new betaUserModel({ email: newUser.email }).save();

      const actual = await userService.isBetaUser(newUser.email);

      expect(actual).toEqual(true);
    });

    it('should return true if a user is from Normative', async () => {
      expect.assertions(1);

      const actual = await userService.isBetaUser('user@normative.io');

      expect(actual).toEqual(true);
    });

    it('should return true if a user is from Google', async () => {
      expect.assertions(1);

      const actual = await userService.isBetaUser('google@google.com');

      expect(actual).toEqual(true);
    });

    it('should return false when user is not added to betaUsers list', async () => {
      expect.assertions(1);
      const actual = await userService.isBetaUser('dummy@xxx.com');

      expect(actual).toEqual(false);
    });
  });

  describe('update terms', () => {
    let newUser;

    beforeEach(async () => {
      newUser = await new userModel(mockUser1).save();
    });

    it('should fail when terms is set to false', async () => {
      expect.assertions(1);

      return userService
        .updateTerms(newUser._id, false)
        .catch((err) => expect(err.message).toContain('Expected terms to be set'));
    });

    it('should set the terms to current date', async () => {
      expect.assertions(2);
      await userService.updateTerms(newUser._id, true);

      const foundUser = await userService.findUser(newUser._id);
      expect(foundUser?.firstTime).toBeFalsy();
      expect(foundUser?.terms).not.toBeNull();
    });

    it('should fail when Bcc terms is set to false', async () => {
      expect.assertions(1);

      return userService
        .updateBccTerms(newUser._id, false)
        .catch((err) => expect(err.message).toContain('Expected Bcc terms to be set'));
    });

    it('should set the bccTerms to current date', async () => {
      expect.assertions(2);
      await userService.updateBccTerms(newUser._id, true);

      const foundUser = await userService.findUser(newUser._id);
      expect(foundUser?.firstTime).toBeFalsy();
      expect(foundUser?.bccTerms).not.toBeNull();
    });
  });
});
