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

import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AuthenticatedUser,
  OrganizationAccountDocument,
  SentryTraceInterceptor,
  UserDocument,
  UserRoles,
} from '@normative/utils';
import { plainToClass } from 'class-transformer';
import { Request } from 'express';
import { Types } from 'mongoose';
import * as httpMocks from 'node-mocks-http';

import { CalculatedImpactService } from '../calculatedImpact/calculatedImpact.service';

import { EntryService } from './entry/entry.service';
import { StarterAuthzService } from './starter.authz.service';
import { StarterController } from './starter.controller';
import { EntrySubmissionDataDto } from './starter.dto';
import { EntrySubmissionData, NormativeDataRefs } from './starter.model';
import { StarterService } from './starter.service';

const ObjectId = Types.ObjectId;
type ObjectId = Types.ObjectId;

class MockEntryService {
  getStarterEntries = jest.fn((organizationAccountId: ObjectId) => {
    return [];
  });

  getStarterEntry = jest.fn((organizationAccountId: ObjectId, entryId: ObjectId) => {
    return {};
  });

  createStarterEntry = jest.fn(
    (userId: ObjectId, orgId: ObjectId, entryData: EntrySubmissionData, dataRefs: NormativeDataRefs) => {
      return {};
    },
  );

  updateStarterEntry = jest.fn(
    (
      userId: ObjectId,
      orgId: ObjectId,
      entryId: string,
      entryData: EntrySubmissionData,
      dataRefs: NormativeDataRefs,
    ) => {
      return {};
    },
  );

  deleteStarterEntries = jest.fn((orgId: ObjectId) => {
    // do nothing.
  });
}

class MockCalculatedImpactService {
  getImpactForDataSources = jest.fn((organizationAccountId: ObjectId, sources: ObjectId[]) => {
    return {};
  });
  getStarterImpactResults = jest.fn((organizationAccountId: ObjectId) => {
    return {};
  });
  isCalculationCompleteForDataSources = jest.fn((dataSources: ObjectId[]) => {
    return true;
  });
}

class MockStarterService {
  submitStarterData = jest.fn((token: string, starterDataUploadRequest: EntrySubmissionData) => {
    return EXAMPLE_DATA_REFS;
  });
}

class MockStarterAuthzService {
  checkUserIsAdminOnStarterOrg = jest.fn(async (req: Request, orgId: ObjectId) => {
    /* no-op; always allow */
    return [TEST_AUTHENTICATED_USER, {} as OrganizationAccountDocument];
  });
}

class MockSentryTraceInterceptor {
  intercept(context, next) {
    return next.handle();
  }
}

const EXAMPLE_DATA_REFS: NormativeDataRefs = {
  reportId: new Types.ObjectId(),
  dataSources: [new Types.ObjectId()],
};

const TEST_ORG_ACCOUNT_ID = new Types.ObjectId();
const TEST_STARTER_ENTRY_ID = new Types.ObjectId();
const TEST_USER_ID = new Types.ObjectId();
const TEST_AUTH_TOKEN = 'AUTH_TOKEN';
const EXAMPLE_REQUEST_BODY: EntrySubmissionDataDto = plainToClass(EntrySubmissionDataDto, {
  organizationAccountId: TEST_ORG_ACCOUNT_ID,
  numberOfEmployees: 15,
  revenue: {
    value: 1000000,
    unit: 'SEK',
  },
  timePeriod: {
    startDate: '2020-01-01',
    endDate: '2020-12-31',
  },
  electricity: {
    renewablePercent: 90,
    spend: {
      value: 1200,
      unit: 'SEK',
    },
  },
  facilities: {
    size: {
      value: 1000,
      unit: 'm^2',
    },
  },
  fuel: {
    distance: {
      value: 3000,
      unit: 'miles',
    },
  },
  heating: {
    districtHeating: true,
  },
});

const TEST_AUTHENTICATED_USER: AuthenticatedUser = {
  userDoc: {
    id: TEST_USER_ID.toHexString(),
    _id: TEST_USER_ID,
    email: 'test-user@example.com',
    role: UserRoles.USER,
  } as UserDocument,
  sub: 'test JWT sub value',
};

describe('StarterController', () => {
  let starter: TestingModule;

  beforeAll(async () => {
    starter = await Test.createTestingModule({
      imports: [HttpModule],
      controllers: [StarterController],
      providers: [
        { provide: EntryService, useClass: MockEntryService },
        { provide: CalculatedImpactService, useClass: MockCalculatedImpactService },
        { provide: StarterService, useClass: MockStarterService },
        { provide: StarterAuthzService, useClass: MockStarterAuthzService },
        { provide: SentryTraceInterceptor, useClass: MockSentryTraceInterceptor },
      ],
    })
      .overrideInterceptor(SentryTraceInterceptor)
      .useClass(MockSentryTraceInterceptor)
      .compile();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('createStarterEntry', () => {
    it('should upload the submitted data using StarterService', async () => {
      const starterController = starter.get<StarterController>(StarterController);
      const starterService = starter.get(StarterService) as MockStarterService;
      const entryService = starter.get(EntryService) as MockEntryService;
      const request = httpMocks.createRequest({
        method: 'POST',
        url: `/starter/${TEST_ORG_ACCOUNT_ID}/entries`,
        params: {
          orgId: TEST_ORG_ACCOUNT_ID,
        },
      });

      await starterController.createStarterEntry(request, TEST_AUTH_TOKEN, TEST_ORG_ACCOUNT_ID, EXAMPLE_REQUEST_BODY);

      expect(starterService.submitStarterData).toHaveBeenCalledWith(
        TEST_AUTH_TOKEN,
        TEST_ORG_ACCOUNT_ID,
        EXAMPLE_REQUEST_BODY,
      );
      // Should pass the data refs returned from StarterService.submitStarterData into EntryService.createStarterEntry.
      expect(entryService.createStarterEntry).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_ORG_ACCOUNT_ID,
        EXAMPLE_REQUEST_BODY,
        EXAMPLE_DATA_REFS,
      );
    });
  });

  describe('resubmitStarterEntry', () => {
    it('should fetch the existing starter entry and update it', async () => {
      const starterController = starter.get<StarterController>(StarterController);
      const entryService = starter.get(EntryService) as MockEntryService;
      const request = httpMocks.createRequest({
        method: 'POST',
        url: `/starter/${TEST_ORG_ACCOUNT_ID}/entries/${TEST_STARTER_ENTRY_ID}/resubmit`,
        params: {
          orgId: TEST_ORG_ACCOUNT_ID,
          entryId: TEST_STARTER_ENTRY_ID,
        },
      });
      const exampleSourceIds = [new Types.ObjectId(), new Types.ObjectId()];
      const exampleRawClientState = {
        someRawClientStateKey: 'someRawClientStateValue',
      };
      entryService.getStarterEntry.mockReturnValueOnce({
        dataSources: exampleSourceIds,
        rawClientState: exampleRawClientState,
      });

      await starterController.resubmitStarterEntry(
        request,
        TEST_AUTH_TOKEN,
        TEST_ORG_ACCOUNT_ID,
        TEST_STARTER_ENTRY_ID,
      );

      expect(entryService.getStarterEntry).toHaveBeenCalledWith(TEST_ORG_ACCOUNT_ID, TEST_STARTER_ENTRY_ID);
      // Should pass the data refs returned from StarterService.submitStarterData
      // and the existing starter entry raw client state
      // into EntryService.updateStarterEntry.
      expect(entryService.updateStarterEntry).toHaveBeenCalledWith(
        TEST_AUTH_TOKEN,
        TEST_USER_ID,
        TEST_ORG_ACCOUNT_ID,
        TEST_STARTER_ENTRY_ID,
        exampleRawClientState,
        EXAMPLE_DATA_REFS,
      );
    });
  });

  describe('updateStarterEntry', () => {
    it('should upload the submitted data using StarterService', async () => {
      const starterController = starter.get<StarterController>(StarterController);
      const starterService = starter.get(StarterService) as MockStarterService;
      const entryService = starter.get(EntryService) as MockEntryService;
      const request = httpMocks.createRequest({
        method: 'PUT',
        url: `/starter/${TEST_ORG_ACCOUNT_ID}/entries/${TEST_STARTER_ENTRY_ID}`,
        params: {
          orgId: TEST_ORG_ACCOUNT_ID,
          entryId: TEST_STARTER_ENTRY_ID,
        },
      });

      await starterController.updateStarterEntry(
        request,
        TEST_AUTH_TOKEN,
        TEST_ORG_ACCOUNT_ID,
        TEST_STARTER_ENTRY_ID,
        EXAMPLE_REQUEST_BODY,
      );

      expect(starterService.submitStarterData).toHaveBeenCalledWith(
        TEST_AUTH_TOKEN,
        TEST_ORG_ACCOUNT_ID,
        EXAMPLE_REQUEST_BODY,
      );
      // Should pass the data refs returned from StarterService.submitStarterData into EntryService.updateStarterEntry.
      expect(entryService.updateStarterEntry).toHaveBeenCalledWith(
        TEST_AUTH_TOKEN,
        TEST_USER_ID,
        TEST_ORG_ACCOUNT_ID,
        TEST_STARTER_ENTRY_ID,
        EXAMPLE_REQUEST_BODY,
        EXAMPLE_DATA_REFS,
      );
    });
  });

  describe('getStarterEntries', () => {
    it('should call the entry service with the correct org id', async () => {
      const starterController = starter.get<StarterController>(StarterController);
      const authzService = starter.get(StarterAuthzService) as MockStarterAuthzService;
      const entryService = starter.get<unknown>(EntryService) as MockEntryService;
      const request = httpMocks.createRequest({
        method: 'GET',
        url: `/starter/${TEST_ORG_ACCOUNT_ID}/entries`,
        params: {
          orgId: TEST_ORG_ACCOUNT_ID,
        },
      });

      const result = await starterController.getStarterEntries(request, TEST_ORG_ACCOUNT_ID);

      expect(authzService.checkUserIsAdminOnStarterOrg).toHaveBeenCalledWith(request, TEST_ORG_ACCOUNT_ID);
      expect(entryService.getStarterEntries).toHaveBeenCalledWith(TEST_ORG_ACCOUNT_ID);
      expect(result).toHaveLength(0);
    });
  });

  describe('getStarterEntry', () => {
    it('should call the entry service with the correct org id and entry id', async () => {
      const starterController = starter.get<StarterController>(StarterController);
      const authzService = starter.get(StarterAuthzService) as MockStarterAuthzService;
      const entryService = starter.get<unknown>(EntryService) as MockEntryService;
      const request = httpMocks.createRequest({
        method: 'GET',
        url: `/starter/${TEST_ORG_ACCOUNT_ID}/entries/`,
        params: {
          orgId: TEST_ORG_ACCOUNT_ID,
          entryId: TEST_STARTER_ENTRY_ID,
        },
      });

      const result = await starterController.getStarterEntry(request, TEST_ORG_ACCOUNT_ID, TEST_STARTER_ENTRY_ID);

      expect(authzService.checkUserIsAdminOnStarterOrg).toHaveBeenCalledWith(request, TEST_ORG_ACCOUNT_ID);
      expect(entryService.getStarterEntry).toHaveBeenCalledWith(TEST_ORG_ACCOUNT_ID, TEST_STARTER_ENTRY_ID);
      expect(result).toEqual({});
    });
  });

  describe('getStarterEntryImpact', () => {
    it('should call the impact service with the data sources from the entry', async () => {
      const starterController = starter.get<StarterController>(StarterController);
      const entryService = starter.get(EntryService) as MockEntryService;
      const calculatedImpactService = starter.get(CalculatedImpactService) as MockCalculatedImpactService;
      const request = httpMocks.createRequest({
        method: 'GET',
        url: `/starter/${TEST_ORG_ACCOUNT_ID}/entries/${TEST_STARTER_ENTRY_ID}/impact`,
        params: {
          orgId: TEST_ORG_ACCOUNT_ID,
          entryId: TEST_STARTER_ENTRY_ID,
        },
      });

      const exampleSourceIds = [new Types.ObjectId(), new Types.ObjectId()];
      entryService.getStarterEntry.mockReturnValueOnce({
        dataSources: exampleSourceIds,
      });
      await starterController.getStarterEntryImpact(
        TEST_AUTH_TOKEN,
        request,
        TEST_ORG_ACCOUNT_ID,
        TEST_STARTER_ENTRY_ID,
      );

      expect(calculatedImpactService.isCalculationCompleteForDataSources).toHaveBeenCalledWith(
        TEST_AUTH_TOKEN,
        exampleSourceIds,
      );
      expect(calculatedImpactService.getImpactForDataSources).toHaveBeenCalledWith(
        TEST_ORG_ACCOUNT_ID,
        exampleSourceIds,
      );
    });
  });

  describe('deleteStarterEntries', () => {
    it('should call the entry service to delete the entries', async () => {
      const starterController = starter.get<StarterController>(StarterController);
      const entryService = starter.get(EntryService) as MockEntryService;
      const request = httpMocks.createRequest({
        method: 'DELETE',
        url: `/starter/${TEST_ORG_ACCOUNT_ID}/entries`,
        params: {
          orgId: TEST_ORG_ACCOUNT_ID,
        },
      });

      await starterController.deleteStarterEntries(request, TEST_AUTH_TOKEN, TEST_ORG_ACCOUNT_ID);

      expect(entryService.deleteStarterEntries).toHaveBeenCalledTimes(1);
      expect(entryService.deleteStarterEntries).toHaveBeenCalledWith(TEST_ORG_ACCOUNT_ID);
    });
  });
});
