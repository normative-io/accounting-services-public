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

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  isObjectIdsEquals,
  AnalyticsModules,
  ImpactCalculationModels,
  DataUploadSdkService,
  Member,
  NormativeServerSDKService,
  OrganizationAccount,
  OrganizationAccountDocument,
  OrganizationAccountModule,
  OrganizationAccountType,
  OrganizationModules,
  OrganizationRole,
  UserDocument,
  UserRoles,
} from '@normative/utils';
import _ from 'lodash';
import { Model, Types, PopulateOptions } from 'mongoose';

@Injectable()
export class OrganizationAccountService {
  defaultStarterModlules: OrganizationAccountModule[] = [
    {
      name: OrganizationModules.STARTER,
      submodules: [],
    },
    {
      name: OrganizationModules.DATA_SOURCES,
      submodules: ['EDIT SOURCE'],
    },
    {
      name: OrganizationModules.IMPACT_MODEL,
      submodules: [ImpactCalculationModels.V2_NORMID],
    },
    {
      name: OrganizationModules.REPORTING,
      submodules: [],
    },
  ];
  defaultModules: OrganizationAccountModule[] = [
    {
      name: OrganizationModules.DATA_SOURCES,
      submodules: ['EDIT SOURCE'],
    },
    {
      name: OrganizationModules.SUPPLIERS,
      submodules: [],
    },
    {
      name: OrganizationModules.TRANSACTIONS,
      submodules: [],
    },
    {
      name: OrganizationModules.ANALYTICS,
      submodules: [AnalyticsModules.POWER_BI],
    },
    {
      name: OrganizationModules.IMPACT_MODEL,
      submodules: [ImpactCalculationModels.V1_6],
    },
  ];
  private readonly logger = new Logger(OrganizationAccountService.name);

  constructor(
    @InjectModel(OrganizationAccount.name)
    private organizationAccountModel: Model<OrganizationAccount>,
    private dataUploadSdkService: DataUploadSdkService,
    private normativeServerSdkService: NormativeServerSDKService,
  ) {}

  hasMember(organizationAccount: OrganizationAccountDocument, user: Types.ObjectId): PromiseLike<boolean> {
    const isMember = organizationAccount.members.some((member) => _.eq(member.user, user));
    if (isMember) {
      return Promise.resolve(true);
    }
    return this.hasIndirectMember(organizationAccount._id, user);
  }

  hasAdminMember(organizationAccount: OrganizationAccountDocument, user: Types.ObjectId): PromiseLike<boolean> {
    const isAdminMember = organizationAccount.members.some(
      (member) =>
        member.user._id.equals(user) &&
        (member.role === OrganizationRole.SUPER_ADMIN || member.role === OrganizationRole.ADMIN),
    );
    if (isAdminMember) {
      return Promise.resolve(true);
    } else {
      return Promise.resolve(false);
    }
  }

  hasIndirectMember(organization: Types.ObjectId, user: Types.ObjectId): Promise<boolean> {
    return this.organizationAccountModel
      .aggregate()
      .match({ _id: organization })
      .graphLookup({
        from: 'organizationaccounts',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'children',
        as: 'parents',
        depthField: 'depth',
      })
      .project({ parents: 1 })
      .unwind({
        path: '$parents',
      })
      .replaceRoot({
        newRoot: '$parents',
      })
      .project({
        users: '$newRoot.members.user',
      })
      .project({
        isMember: { $in: [user, '$users'] },
      })
      .exec()
      .then((isMemberOfParentsArray) => {
        this.logger.debug(`isMemberOfParentsArray = ${JSON.stringify(isMemberOfParentsArray)}`);
        return isMemberOfParentsArray;
      })
      .then((isMemberOfParentsArray) =>
        isMemberOfParentsArray.some((parent) => {
          return parent.isMember;
        }),
      );
  }

  getAllOrganizationAccounts() {
    return this.organizationAccountModel.find({}).lean();
  }

  getOrganizationAccountsForUser(userId: Types.ObjectId, accountType?: OrganizationAccountType) {
    // Include only organizationAccounts in which the calling user is a member.
    const query: { [key: string]: unknown } = {
      'members.user': userId,
    };
    accountType && (query.accountType = accountType);
    return this.organizationAccountModel.find(query).lean();
  }

  /**
   * Get organization account by tradeshift id, returning undefined if id is falsy
   *
   * @param tradeshiftCompanyAccountId The corresponding company id in Tradeshift which we've saved.
   */
  async getByTradeshiftId(tradeshiftCompanyAccountId: string): Promise<OrganizationAccountDocument | null> {
    if (!tradeshiftCompanyAccountId) {
      return null;
    }
    return await this.organizationAccountModel.findOne({ tradeshiftCompanyAccountId });
  }

  /**
   * Gets organizationAccount by ID
   *
   * @param {string} organizationAccountId
   * @param {UserRoles} role
   */
  async getOrganizationAccountById(organizationAccountId: Types.ObjectId, role: UserRoles) {
    this.logger.debug(`Getting organization account for org: ${organizationAccountId} and role: ${role}.`);
    const populateMembers: PopulateOptions = {
      path: 'members.user',
      select: 'name email role',
    };

    // If the user is not a site admin,
    // then we don't populate the member user IDs -> (name, email, role)
    // for the organization's admins.
    if (role !== UserRoles.ADMIN) {
      populateMembers.match = { role: { $ne: 'admin' } };
    }
    const organizationAccount = await this.organizationAccountModel
      .findById(organizationAccountId)
      .populate(populateMembers)
      .populate({
        path: 'children',
        options: { lean: true },
      })
      .lean();
    if (!organizationAccount) {
      throw new NotFoundException('OrganizationAccount not found');
    }
    const parentOrganizations = await this.organizationAccountModel.find({ children: organizationAccountId }).lean();
    organizationAccount.hasParent = !!parentOrganizations.length;
    if (role !== UserRoles.ADMIN) {
      organizationAccount.members = _.filter(
        organizationAccount.members,
        (member) => member.role !== OrganizationRole.SUPER_ADMIN,
      );
    }
    return organizationAccount;
  }

  /**
   * Create an starter/free organization account. Any autheniticated user can create such an organization account.
   *
   * @param organizationAccountData The initial organization account data.
   * @param admin The user that should be admin for the created organization account.
   * @returns The created organization account (in a promise).
   */
  async createStarterOrganizationAccount(
    organizationAccountData: Partial<OrganizationAccountDocument>,
    adminUserId: Types.ObjectId,
  ): Promise<OrganizationAccountDocument> {
    if (!organizationAccountData) {
      throw new BadRequestException('Body not found');
    }

    // Limit initialization of certain organization account properties.
    // Such as those that would effectively make this a premium account.
    organizationAccountData.accountType = OrganizationAccountType.STARTER;
    organizationAccountData.modules = this.defaultStarterModlules;

    // Add the specified admins
    organizationAccountData.members = [
      {
        // TODO: Eliminate the need to do this type assertion.
        user: adminUserId as unknown as UserDocument,
        role: OrganizationRole.ADMIN,
      },
    ];
    // Save the new organization account in the database.
    const organization = await new this.organizationAccountModel(organizationAccountData).save();
    return organization;
  }

  async createOrgAccount(newOrgAccount: Partial<OrganizationAccountDocument>) {
    if (!newOrgAccount) {
      throw new BadRequestException('Body not found');
    }

    if (!newOrgAccount.modules) {
      newOrgAccount.modules = [];
    }
    newOrgAccount.modules = this.addDefaultModules(newOrgAccount.modules);
    const org = new this.organizationAccountModel(newOrgAccount).save();
    return org;
  }

  /**
   * Updates organization account
   *
   * @param {string} organizationAccountId
   * @param {Partial<OrganizationAccountDocument>} updatedObj
   */
  async updateOrganizationAccountById(
    organizationAccountId: Types.ObjectId,
    updatedObj: Partial<OrganizationAccountDocument>,
  ) {
    if (!updatedObj) {
      throw new BadRequestException('Body not found');
    }

    const organizationAccount = await this.organizationAccountModel.findById(organizationAccountId);
    if (!organizationAccount) {
      throw new NotFoundException('OrganizationAccount not found');
    }

    delete updatedObj._id;
    organizationAccount.lastUpdated = new Date();
    organizationAccount.set(updatedObj);
    return await organizationAccount.save();
  }

  async deleteOrgAccount(authToken: string, organizationId: Types.ObjectId) {
    const org = await this.organizationAccountModel.findById(organizationId);

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    await this.normativeServerSdkService.deleteOrgDataSources(authToken, organizationId);
    await this.normativeServerSdkService.deleteOrgReports(authToken, organizationId);
    await this.dataUploadSdkService.deleteStarterEntries(authToken, organizationId);

    const query = { children: organizationId };
    await this.organizationAccountModel.updateMany(query, { $pull: query }).exec();

    return org.remove();
  }

  /**
   * Updates organization member role
   *
   * @param {OrganizationAccountDocument} organization
   * @param {string} userId
   * @param {OrganizationRole} role
   */
  updateUsersOrganizationRole(
    organization: OrganizationAccountDocument,
    userId: Types.ObjectId,
    role: OrganizationRole,
  ) {
    if (!role) {
      throw new BadRequestException('Role must be provided');
    }
    const allowedRoles = [OrganizationRole.ADMIN, OrganizationRole.GUEST, OrganizationRole.USER];
    if (!role || !_.includes(allowedRoles, role)) {
      throw new ForbiddenException(`Role not allowed: ${role}`);
    }
    const member = _.find(organization.members || [], (m) => m.user._id.equals(userId));
    if (!member) {
      throw new NotFoundException(`User ${userId} is not a member in organization ${organization.name}.`);
    }
    const index = _.indexOf(organization.members, member);
    organization.members[index].role = role;
    organization.lastUpdated = new Date();
    return organization.save();
  }

  async removeUserFromOrganization(organization: OrganizationAccountDocument, userId: Types.ObjectId) {
    _.remove(organization.members, (m) => m.user._id.equals(userId));
    organization.markModified('members');
    return organization.save();
  }

  /**
   * Gets which impact calculation model is active for an organization
   * from its id
   */
  async getOrgImpactCalculationModel(organizationAccountId: Types.ObjectId): Promise<ImpactCalculationModels> {
    const organizationAccount = await this.organizationAccountModel.findById(organizationAccountId);
    if (!organizationAccount) {
      throw new NotFoundException('OrganizationAccount not found');
    }
    return this.getImpactCalculationModelByOrg(organizationAccount);
  }

  /**
   * Checks, if current organizationAccount has access to specified module & optionally submodule
   *
   * @param {string} organizationAccountId
   * @param {OrganizationModules} module
   */
  hasOrganizationModule(
    organizationAccountId: Types.ObjectId,
    module: OrganizationModules,
    submodule?: string | ImpactCalculationModels | AnalyticsModules,
  ) {
    const query = {
      _id: organizationAccountId,
      'modules.name': module,
    };
    if (submodule) {
      query['modules.submodules'] = submodule;
    }
    return this.organizationAccountModel.findOne(query).then((result) => !!result);
  }

  private isOrganizationMembersEquals(members: Member[], membersToCompare: Member[]) {
    if (members.length !== membersToCompare.length) {
      return false;
    }
    // TODO: isObjectIdEquals shouldn't really be needed; we should *know* whether we have a string or an ObjectId.
    return members.reduce((acc, member) => {
      return acc
        ? !!membersToCompare.find((m) => isObjectIdsEquals(member.user._id, m.user._id) && member.role === m.role)
        : false;
    }, true);
  }

  /**
   * Gets which impact calculation model is active for an organization
   *
   * @param organizationAccount A fully formed object containing the different
   * modules it's a part of
   * @returns ImpactCalculationModels - the active model used by the organization
   */
  private async getImpactCalculationModelByOrg(
    organizationAccount: OrganizationAccountDocument,
  ): Promise<ImpactCalculationModels> {
    const impactModelModule = _.find(
      organizationAccount.modules,
      (module) => module.name === OrganizationModules.IMPACT_MODEL,
    );

    const impactModels = _.get(impactModelModule, 'submodules') as ImpactCalculationModels[];

    // only one impact model should be chosen per organization account
    // TODO: consider throwing error if there are more than 1 model
    const firstImpactModel = _.head(impactModels);

    if (!firstImpactModel) {
      throw new Error('No impact model defined for this organization');
    }

    return firstImpactModel;
  }

  private addDefaultModules(modules: OrganizationAccountModule[]): OrganizationAccountModule[] {
    for (const defaultModule of this.defaultModules) {
      if (!modules.some((module) => module.name === defaultModule.name)) {
        modules.push(defaultModule);
      }
    }
    return modules;
  }
}
