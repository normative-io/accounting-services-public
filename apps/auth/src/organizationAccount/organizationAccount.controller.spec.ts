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
import { Test, TestingModule } from '@nestjs/testing';
import {
  OrganizationAccountDocument,
  OrganizationAccountType,
  OrganizationRole,
  OrganizationAccount,
  OrganizationAccountSchema,
  rootMongooseTestModule,
  stopInMemoryMongoDb,
  SentryTraceInterceptor,
} from '@normative/utils';

import { Request } from 'express';
import { Model, Types } from 'mongoose';
import * as httpMocks from 'node-mocks-http';

import { AuthzService } from '../authz/authz.service';

import { OrganizationAccountController } from './organizationAccount.controller';
import { OrganizationAccountParser } from './organizationAccount.parser';
import { OrganizationAccountService } from './organizationAccount.service';

const ObjectId = Types.ObjectId;
type ObjectId = Types.ObjectId;

class MockAuthzService {
  loadOrganizationWithMembers = jest.fn(async (orgId: ObjectId) => {
    return {} as OrganizationAccountDocument;
  });

  checkSiteRoleAdminOrOrgRole = jest.fn(async (req: Request, orgId: ObjectId, role: OrganizationRole) => {
    /* no-op; always allow */
    return;
  });
}

class MockOrganizationAccountService {
  updateOrganizationAccountById = jest.fn(
    (organizationAccountId: Types.ObjectId, updatedObj: Partial<OrganizationAccountDocument>) => {
      return updatedObj;
    },
  );
}

class MockSentryTraceInterceptor {
  intercept(context, next) {
    return next.handle();
  }
}

describe('OrganizationAccountController', () => {
  let testingModule: TestingModule;
  let organizationAccount: OrganizationAccountDocument;
  let mockOrganizationAccountModel: Model<OrganizationAccount>;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      controllers: [OrganizationAccountController],
      providers: [
        OrganizationAccountParser,
        { provide: AuthzService, useClass: MockAuthzService },
        { provide: OrganizationAccountService, useClass: MockOrganizationAccountService },
        { provide: SentryTraceInterceptor, useClass: MockSentryTraceInterceptor },
      ],
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([{ name: OrganizationAccount.name, schema: OrganizationAccountSchema }]),
      ],
    })
      .overrideInterceptor(SentryTraceInterceptor)
      .useClass(MockSentryTraceInterceptor)
      .compile();
    mockOrganizationAccountModel = testingModule.get(getModelToken(OrganizationAccount.name));
  });

  afterAll(async () => {
    await stopInMemoryMongoDb();
  });

  describe('updateOrganizationAccountDetails', () => {
    let request: Request;
    let organizationAccountController;
    let organizationAccountService;

    beforeEach(async () => {
      organizationAccount = await mockOrganizationAccountModel.create({
        vat: '123456789',
        name: 'Test',
      });
      request = httpMocks.createRequest({
        method: 'POST',
        url: `/starter/${organizationAccount}._id}/details`,
        params: {
          orgId: organizationAccount._id,
        },
      });

      organizationAccountController = testingModule.get<OrganizationAccountController>(OrganizationAccountController);
      organizationAccountService = testingModule.get(OrganizationAccountService) as MockOrganizationAccountService;
    });

    it('should successfully update an organization with field allowed to be updated', async () => {
      expect.assertions(1);
      const requestBodyWithOrgUpdates = {
        name: 'updatedName',
      };

      await organizationAccountController.updateOrganizationAccountDetails(
        request,
        requestBodyWithOrgUpdates,
        organizationAccount._id,
      );

      expect(organizationAccountService.updateOrganizationAccountById).toHaveBeenCalledWith(
        organizationAccount._id,
        requestBodyWithOrgUpdates,
      );
    });

    it('should successfully update an organization by ignoring the fields not allowed to be updated', async () => {
      expect.assertions(1);
      const requestBodyWithOrgUpdates = {
        name: 'updatedName',
        accountType: OrganizationAccountType.PREMIUM,
      };

      await organizationAccountController.updateOrganizationAccountDetails(
        request,
        requestBodyWithOrgUpdates,
        organizationAccount._id,
      );

      const allowedFieldsToBeUpdatd = {
        name: 'updatedName',
      };
      expect(organizationAccountService.updateOrganizationAccountById).toHaveBeenCalledWith(
        organizationAccount._id,
        allowedFieldsToBeUpdatd,
      );
    });
  });
});
