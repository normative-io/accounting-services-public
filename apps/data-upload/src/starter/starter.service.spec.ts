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

import { HttpService } from '@nestjs/axios';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AppConfigModule,
  IReportTemplate,
  NormativeServerSDKService,
  OrganizationAccount,
  OrganizationAccountSchema,
  rootMongooseTestModule,
  stopInMemoryMongoDb,
} from '@normative/utils';
import { Model, Types } from 'mongoose';
import { of } from 'rxjs';

import { ParserModule } from './parser/parser.module';

import { EntrySubmissionData, HeatingType } from './starter.model';
import { StarterService } from './starter.service';

const TEST_TOKEN = 'mock_token';

const TEST_REQUEST_BODY_NO_DATA: EntrySubmissionData = {
  numberOfEmployees: 15,
  revenue: {
    value: 1000000,
    unit: 'SEK',
  },
  timePeriod: {
    startDate: '2020-01-01',
    endDate: '2020-12-31',
  },
};

const TEST_REQUEST_BODY: EntrySubmissionData = {
  ...TEST_REQUEST_BODY_NO_DATA,
  electricity: {
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
    spend: {
      value: 300,
      unit: 'SEK',
    },
  },
  heating: {
    type: HeatingType.DISTRICT,
    spend: {
      value: 600,
      unit: 'SEK',
    },
  },
  expenses: [
    {
      description: 'Lion',
      normId: 'big-lion',
      spend: { value: 3782, unit: 'GBP' },
    },
    {
      description: 'Tabby',
      normId: 'little-tabby',
      spend: { value: 42, unit: 'SEK' },
    },
  ],
};

const TEST_DOCUMENT_ID = 'abcdef000000abcdef000000';
const TEST_STARTER_REPORT_TEMPLATE_ID = 'abcdef000000abcdef000011';
const TEST_REPORT_ID = 'abcdef000000abcdef000022';
const TEST_REPORT_TEMPLATES_LIST: IReportTemplate[] = [
  {
    _id: TEST_STARTER_REPORT_TEMPLATE_ID,
    rootHeader: 'Starter',
    header: 'Starter',
  },
];
const TEST_NORMATIVE_SERVER_URL = 'https://normative-server.unreal.test:1234';

class HttpServiceMock {
  post = jest.fn((url, data, config) =>
    of({
      data: { _id: TEST_DOCUMENT_ID },
    }),
  );
  put = jest.fn((url, data, config) => of({ url, data, config }));
}

class NormativeServerSDKServiceMock {
  postReport = jest.fn((authToken, orgId, reportData) => ({
    ...reportData,
    _id: TEST_REPORT_ID,
  }));
  getReportTemplates = jest.fn((authToken) => TEST_REPORT_TEMPLATES_LIST);
}

describe('StarterService', () => {
  let starter: TestingModule;
  let organizationAccountModel: Model<OrganizationAccount>;
  let testOrgAccountId: Types.ObjectId;

  beforeEach(async () => {
    starter = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        AppConfigModule.withStaticEnvironment({
          PORT: '3333',
          NORMATIVE_SERVER_URL: TEST_NORMATIVE_SERVER_URL,
        }),
        MongooseModule.forFeature([{ name: OrganizationAccount.name, schema: OrganizationAccountSchema }]),
        ParserModule,
      ],
      providers: [
        { provide: HttpService, useClass: HttpServiceMock },
        { provide: NormativeServerSDKService, useClass: NormativeServerSDKServiceMock },
        StarterService,
      ],
    }).compile();
    organizationAccountModel = starter.get(getModelToken(OrganizationAccount.name));

    const newOrg = new organizationAccountModel({
      vat: '123123123',
      name: 'Gotham Gazette',
      country: 'SE',
    });
    testOrgAccountId = (await newOrg.save())._id;
  });

  afterEach(async () => {
    await stopInMemoryMongoDb();
  });

  describe('submitStarterData', () => {
    it('should create a document for FUEL, ELECTRICITY and HEATING', async () => {
      const starterService = starter.get<StarterService>(StarterService);
      const httpService = starter.get<unknown>(HttpService) as HttpServiceMock;
      await starterService.submitStarterData(TEST_TOKEN, testOrgAccountId, TEST_REQUEST_BODY);

      // expect that we create 4 new dataSources
      const expectedDataSourceUrl = `${TEST_NORMATIVE_SERVER_URL}/api/organizationAccounts/${testOrgAccountId}/datasources`;
      expect(httpService.post).toHaveBeenCalledTimes(4);
      httpService.post.mock.calls.forEach((call) => {
        expect(call).toContain(expectedDataSourceUrl);
      });

      // expect that we add one set of rows per created dataSource
      expect(httpService.put).toHaveBeenCalledTimes(4);
      const expectedPutUrl = `${TEST_NORMATIVE_SERVER_URL}/api/dataSources/${TEST_DOCUMENT_ID}/rows`;
      httpService.put.mock.calls.forEach((call) => {
        expect(call).toContain(expectedPutUrl);
      });
    });

    it('should skip creating sources if there is no data', async () => {
      const starterService = starter.get<StarterService>(StarterService);
      const httpService = starter.get(HttpService) as HttpServiceMock;

      const result = await starterService.submitStarterData(TEST_TOKEN, testOrgAccountId, TEST_REQUEST_BODY_NO_DATA);

      expect(result.dataSources).toHaveLength(0);
      expect(result.reportId).toBeFalsy();

      expect(httpService.post).not.toHaveBeenCalled();
      expect(httpService.put).not.toHaveBeenCalled();
    });

    it('should submit partial data if some data is missing', async () => {
      const starterService = starter.get<StarterService>(StarterService);
      const httpService = starter.get(HttpService) as HttpServiceMock;

      const result = await starterService.submitStarterData(TEST_TOKEN, testOrgAccountId, {
        ...TEST_REQUEST_BODY_NO_DATA,
        fuel: TEST_REQUEST_BODY.fuel,
      });

      expect(result.dataSources).toHaveLength(1);

      // expect that we create 2 new dataSources
      const expectedDataSourceUrl = `${TEST_NORMATIVE_SERVER_URL}/api/organizationAccounts/${testOrgAccountId}/datasources`;
      expect(httpService.post).toHaveBeenCalledTimes(1);
      httpService.post.mock.calls.forEach((call) => {
        expect(call).toContain(expectedDataSourceUrl);
      });

      // expect that we add one set of rows per created dataSource
      expect(httpService.put).toHaveBeenCalledTimes(1);
      const expectedPutUrl = `${TEST_NORMATIVE_SERVER_URL}/api/dataSources/${TEST_DOCUMENT_ID}/rows`;
      httpService.put.mock.calls.forEach((call) => {
        expect(call).toContain(expectedPutUrl);
      });
    });
  });
});
