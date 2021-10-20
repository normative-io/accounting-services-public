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

import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import {
  AnalyticsModules,
  ImpactCalculationModels,
  DataUploadSdkService,
  NormativeServerSDKService,
  OrganizationAccount,
  OrganizationAccountDocument,
  OrganizationAccountModule,
  OrganizationAccountSchema,
  OrganizationModules,
  OrganizationRole,
  rootMongooseTestModule,
  stopInMemoryMongoDb,
  User,
  UserRoles,
  UserSchema,
} from '@normative/utils';
import _ from 'lodash';
import { Model, Types } from 'mongoose';

import { OrganizationAccountService } from './organizationAccount.service';

const ObjectId = Types.ObjectId;
const TEST_AUTH_TOKEN = '23423232';

class DataUploadSdkServiceMock {
  deleteStarterEntries = jest.fn((authToken, orgId) => {
    return Promise.resolve();
  });
}

class NormativeServerSDKServiceMock {
  deleteOrgDataSources = jest.fn((authToken, orgId) => {
    return Promise.resolve();
  });

  deleteOrgReports = jest.fn((authToken, orgId) => {
    return Promise.resolve();
  });
}

describe('OrganizationAccount Service', () => {
  let service: OrganizationAccountService;
  let organizationAccount: OrganizationAccountDocument;
  let mockOrganizationAccountModel: Model<OrganizationAccount>;
  let dataUploadSdkService;
  let normativeServerSdkService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrganizationAccountService,
        { provide: DataUploadSdkService, useClass: DataUploadSdkServiceMock },
        { provide: NormativeServerSDKService, useClass: NormativeServerSDKServiceMock },
      ],
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: OrganizationAccount.name, schema: OrganizationAccountSchema },
          { name: User.name, schema: UserSchema },
        ]),
      ],
    }).compile();
    service = module.get<OrganizationAccountService>(OrganizationAccountService);
    dataUploadSdkService = module.get(DataUploadSdkService) as DataUploadSdkServiceMock;
    normativeServerSdkService = module.get(NormativeServerSDKService) as NormativeServerSDKServiceMock;
    mockOrganizationAccountModel = module.get(getModelToken(OrganizationAccount.name));
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await stopInMemoryMongoDb();
  });

  describe('"IMPACT MODEL" as default organization module', () => {
    beforeEach(async () => {
      organizationAccount = await mockOrganizationAccountModel.create({
        vat: '123456789',
        name: 'Test',
      });
    });

    afterEach(async () => {
      if (organizationAccount) {
        await mockOrganizationAccountModel.deleteOne(organizationAccount._id);
      }
    });

    it('should be initialized with no default values for any modules', () => {
      expect(Array.isArray(organizationAccount.modules));
      expect(organizationAccount.modules).toHaveLength(0);
    });
  });

  describe('getOrgImpactCalculationModel', () => {
    beforeEach(async () => {
      organizationAccount = await service.createOrgAccount({
        vat: '123456789',
        name: 'Test',
      });
    });

    afterEach(async () => {
      if (organizationAccount) {
        await service.deleteOrgAccount(TEST_AUTH_TOKEN, organizationAccount._id);
      }
    });

    it('has no active impact calculation model hence it should throw error', async () => {
      expect.assertions(1);
      // Remove any impact model modules
      organizationAccount.modules = _.filter(
        organizationAccount.modules,
        (module) => module.name !== OrganizationModules.IMPACT_MODEL,
      );
      await organizationAccount.save();
      const expectedError = new Error('No impact model defined for this organization');
      return expect(service.getOrgImpactCalculationModel(organizationAccount._id)).rejects.toThrow(expectedError);
    });

    it('should return "v2-normid" as an active impact calculation model', async () => {
      expect.assertions(1);
      organizationAccount.modules = [
        {
          name: OrganizationModules.IMPACT_MODEL,
          submodules: [ImpactCalculationModels.V2_NORMID],
        },
      ];
      await organizationAccount.save();

      const impactCalculationModel = await service.getOrgImpactCalculationModel(organizationAccount._id);

      expect(impactCalculationModel).toEqual(ImpactCalculationModels.V2_NORMID);
    });
  });

  describe('organization module middleware', () => {
    beforeEach(async () => {
      organizationAccount = await service.createOrgAccount({
        vat: '123456789',
        name: 'Test',
      });
    });

    afterEach(async () => {
      if (organizationAccount) {
        await service.deleteOrgAccount(TEST_AUTH_TOKEN, organizationAccount._id);
      }
    });

    it('should not have impact module', async () => {
      expect.assertions(1);
      organizationAccount.modules = [
        {
          name: OrganizationModules.ACCOUNTING,
          submodules: [],
        },
      ];
      await organizationAccount.save();

      const hasImpactModule = await service.hasOrganizationModule(
        organizationAccount._id,
        OrganizationModules.IMPACT_MODEL,
      );

      expect(hasImpactModule).toBeFalsy();
    });

    it('should have impact module with empty submodules', async () => {
      expect.assertions(1);
      organizationAccount.modules = [
        {
          name: OrganizationModules.IMPACT_MODEL,
          submodules: [],
        },
      ];
      await organizationAccount.save();

      const hasImpactModule = await service.hasOrganizationModule(
        organizationAccount._id,
        OrganizationModules.IMPACT_MODEL,
      );

      expect(hasImpactModule).toBeTruthy();
    });

    it('should have impact module with non-empty submodules', async () => {
      expect.assertions(1);
      organizationAccount.modules = [
        {
          name: OrganizationModules.IMPACT_MODEL,
          submodules: [ImpactCalculationModels.V2_NORMID],
        },
      ];
      await organizationAccount.save();

      const hasImpactModule = await service.hasOrganizationModule(
        organizationAccount._id,
        OrganizationModules.IMPACT_MODEL,
      );

      expect(hasImpactModule).toBeTruthy();
    });

    it('should have impact sub module with specified NormId', async () => {
      expect.assertions(1);
      organizationAccount.modules = [
        {
          name: OrganizationModules.IMPACT_MODEL,
          submodules: [ImpactCalculationModels.V2_NORMID],
        },
      ];
      await organizationAccount.save();

      const hasImpactModule = await service.hasOrganizationModule(
        organizationAccount._id,
        OrganizationModules.IMPACT_MODEL,
        ImpactCalculationModels.V2_NORMID,
      );

      expect(hasImpactModule).toBeTruthy();
    });

    it('should not have impact sub module with a different NormId', async () => {
      expect.assertions(1);
      organizationAccount.modules = [
        {
          name: OrganizationModules.IMPACT_MODEL,
          submodules: [ImpactCalculationModels.V1_5_UNSPSC_SCOPE12],
        },
      ];
      await organizationAccount.save();

      const hasImpactModule = await service.hasOrganizationModule(
        organizationAccount._id,
        OrganizationModules.IMPACT_MODEL,
        ImpactCalculationModels.V2_NORMID,
      );

      expect(hasImpactModule).toBeFalsy();
    });
  });

  describe('createOrgAccount', () => {
    it('creates organization with all the default modules', async () => {
      expect.assertions(4);
      const params = {
        vat: 'BR11235813',
        name: 'test-account',
      };

      const organization = await service.createOrgAccount(params);

      const modules = organization.modules;
      expect(organization.vat).toEqual(params.vat);
      expect(organization.name).toEqual(params.name);
      expect(modules).toHaveLength(service.defaultModules.length);
      const resultModules: OrganizationAccountModule[] = modules.map((module) => ({
        name: module.name,
        submodules: module.submodules,
      }));
      expect(resultModules).toEqual(service.defaultModules);
    });
  });

  describe('creates organization with non-default module containing special submodules', () => {
    const nonDefaultModules: OrganizationAccountModule[] = [
      {
        name: OrganizationModules.ANALYTICS,
        submodules: [AnalyticsModules.CUMULIO],
      },
      {
        name: OrganizationModules.IMPACT_MODEL,
        submodules: [ImpactCalculationModels.V1_5_UNSPSC_SCOPE12],
      },
      {
        name: OrganizationModules.IMPACT_MODEL,
        submodules: [ImpactCalculationModels.V1_UNSPSC],
      },
      {
        name: OrganizationModules.IMPACT_MODEL,
        submodules: [ImpactCalculationModels.V2_NORMID],
      },
    ];

    nonDefaultModules.forEach((module) => {
      it(`has ${module.name} module with ${module.submodules[0]} submodule`, async () => {
        expect.assertions(6);
        const params = {
          vat: 'BR11235813',
          name: `test-account-${module.name}-${module.submodules[0]}`,
          modules: [module],
        };

        const organization = await service.createOrgAccount(params);

        const modules = organization.modules;
        expect(organization.vat).toEqual(params.vat);
        expect(organization.name).toEqual(params.name);
        expect(modules).toHaveLength(service.defaultModules.length);

        const filteredResultModules = modules.filter((x) => x.name === module.name);
        expect(filteredResultModules).toHaveLength(1);

        const submodules = filteredResultModules[0].submodules;
        expect(submodules).toHaveLength(1);
        expect(submodules[0]).toEqual(module.submodules[0]);
      });
    });
  });

  describe('deleteOrgAccount', () => {
    it('deleteOrgAccount should delete all assets belongings to organization', async () => {
      expect.assertions(7);
      const params = {
        name: 'test-account',
        vat: 'BR11235813',
      };

      const organization = await service.createOrgAccount(params);
      expect(organization.name).toEqual(params.name);

      await service.deleteOrgAccount(TEST_AUTH_TOKEN, organization._id);

      // Data sources deletion
      expect(normativeServerSdkService.deleteOrgDataSources).toHaveBeenCalledTimes(1);
      expect(normativeServerSdkService.deleteOrgDataSources).toHaveBeenNthCalledWith(
        1,
        TEST_AUTH_TOKEN,
        organization._id,
      );

      // Reports deletion
      expect(normativeServerSdkService.deleteOrgReports).toHaveBeenCalledTimes(1);
      expect(normativeServerSdkService.deleteOrgReports).toHaveBeenNthCalledWith(1, TEST_AUTH_TOKEN, organization._id);

      // Starter Entries deletion
      expect(dataUploadSdkService.deleteStarterEntries).toHaveBeenCalledTimes(1);
      expect(dataUploadSdkService.deleteStarterEntries).toHaveBeenNthCalledWith(1, TEST_AUTH_TOKEN, organization._id);
    });

    it("deleteOrgAccount should delete the organization wherever it's listed as child", async () => {
      expect.assertions(2);
      const childOrg = await service.createOrgAccount({
        vat: '123123123',
        name: 'Wayne Enterprises',
      });
      const parentOrg = await service.createOrgAccount({
        vat: '123123123',
        name: 'LexCorp',
        children: [childOrg._id],
      });

      // Verify that parentOrg has children before deleting childOrg
      let foundOrganization = await service.getOrganizationAccountById(parentOrg._id, UserRoles.USER);
      expect(foundOrganization.children).toHaveLength(1);

      await service.deleteOrgAccount(TEST_AUTH_TOKEN, childOrg._id);

      // Verify that parentOrg doesn't have children after deleting childOrg
      foundOrganization = await service.getOrganizationAccountById(parentOrg._id, UserRoles.USER);
      expect(foundOrganization.children).toHaveLength(0);
    });
  });

  describe('updateOrganizationAccountById', () => {
    beforeEach(async () => {
      organizationAccount = await mockOrganizationAccountModel.create({
        vat: '123456789',
        name: 'Test',
      });
    });

    it('should successfully update an organization with field allowed to be updated', async () => {
      expect.assertions(2);
      const updatedOrganization = {
        name: 'updatedName',
      };

      const organization = await service.updateOrganizationAccountById(organizationAccount._id, updatedOrganization);

      expect(organization.name).toEqual(updatedOrganization.name);

      // Verify the changes are saved to DB as well.
      const organizationFromDatabase = await service.getOrganizationAccountById(
        organizationAccount._id,
        UserRoles.ADMIN,
      );
      expect(organizationFromDatabase.name).toEqual(updatedOrganization.name);
    });
  });

  describe('hasMember', () => {
    let member;
    let stub;

    beforeEach(async () => {
      member = {
        user: new ObjectId(),
        role: 'user',
      };
      organizationAccount = await mockOrganizationAccountModel.create({
        vat: '123456789',
        name: 'Test',
      });
      return organizationAccount.members.push(member);
    });

    afterEach(() => {
      if (stub) {
        stub.restore();
      }
    });

    it('should return true if organization has member', async () => {
      expect.assertions(1);
      const hasMember = await service.hasMember(organizationAccount, member.user);
      return expect(hasMember).toBeTruthy();
    });

    it('should return true if hasIndirectMember returns true', async () => {
      expect.assertions(1);
      const indirectUserId = new ObjectId();
      service.hasIndirectMember = jest.fn().mockImplementation(() => true);

      const hasMember = await service.hasMember(organizationAccount, indirectUserId);

      return expect(hasMember).toBeTruthy();
    });

    it('should return false hasIndirectMember returns false', async () => {
      expect.assertions(1);
      const missingUserId = new ObjectId();
      service.hasIndirectMember = jest.fn().mockImplementation(() => false);

      const hasMember = await service.hasMember(organizationAccount, missingUserId);

      return expect(hasMember).toBeFalsy();
    });
  });

  describe('hasIndirectMember', () => {
    let orgMember;
    let childOrg: OrganizationAccountDocument;
    let middleOrg: OrganizationAccountDocument;
    let parentOrg: OrganizationAccountDocument;

    beforeEach(async () => {
      orgMember = {
        _id: new ObjectId(),
        user: new ObjectId(),
        role: 'user',
      };
      childOrg = {
        _id: new ObjectId(),
        vat: '123123123',
        name: 'Child Org',
      } as OrganizationAccountDocument;
      middleOrg = {
        _id: new ObjectId(),
        vat: '123123123',
        name: 'Middle Org',
        children: [childOrg._id],
      } as OrganizationAccountDocument;
      parentOrg = {
        _id: new ObjectId(),
        vat: '123123456',
        name: 'Parent Org',
        children: [middleOrg._id],
      } as OrganizationAccountDocument;

      return mockOrganizationAccountModel.insertMany([childOrg, middleOrg, parentOrg]);
    });

    afterEach(() => {
      return mockOrganizationAccountModel
        .deleteMany({
          _id: {
            $in: [childOrg, middleOrg, parentOrg].map((org) => org._id),
          },
        })
        .exec();
    });

    it('should return false if parent organization does not have member', async () => {
      expect.assertions(1);
      const hasIndirectMember = await service.hasIndirectMember(middleOrg._id, orgMember.user);

      expect(hasIndirectMember).toBeFalsy();
    });

    it('should return true if parent organization has member', async () => {
      expect.assertions(1);
      await mockOrganizationAccountModel
        .updateMany(parentOrg as OrganizationAccount, {
          $set: { members: [orgMember] },
        })
        .exec();

      const hasIndirectMember = await service.hasIndirectMember(middleOrg._id, orgMember.user);

      expect(hasIndirectMember).toBeTruthy();
    });

    it('should return true if some parent have member', async () => {
      expect.assertions(1);
      await mockOrganizationAccountModel
        .updateMany(parentOrg as OrganizationAccount, {
          $set: { members: [orgMember] },
        })
        .exec();

      const hasIndirectMember = await service.hasIndirectMember(childOrg._id, orgMember.user);

      expect(hasIndirectMember).toBeTruthy();
    });
  });

  describe('createStarterOrganizationAccount', () => {
    it('creates an organization account with the specified admins', async () => {
      expect.assertions(5);
      const userId = new ObjectId('123412341234');
      const organizationAccountInitialData = {
        vat: 'BR11235813',
        name: 'test-account',
      };

      const organization = await service.createStarterOrganizationAccount(organizationAccountInitialData, userId);

      expect(organization.vat).toEqual(organizationAccountInitialData.vat);
      expect(organization.name).toEqual(organizationAccountInitialData.name);
      expect(organization.members).toHaveLength(1);
      const member = organization.members[0];
      expect(member.role).toEqual(OrganizationRole.ADMIN);
      expect(member.user).toEqual(userId);
    });

    it('limits the modules available on a starter organization account', async () => {
      expect.assertions(1);
      const organizationAccountInitialData = {
        vat: 'BR11235813',
        name: 'test-account',
      };
      const starterOrganizationAccount = await service.createStarterOrganizationAccount(
        organizationAccountInitialData,
        new Types.ObjectId(),
      );
      expect(starterOrganizationAccount.modules).toEqual(service.defaultStarterModlules);
    });
  });
});
