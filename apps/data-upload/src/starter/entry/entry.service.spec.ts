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

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { IDataSource, NormativeServerSDKService, rootMongooseTestModule, stopInMemoryMongoDb } from '@normative/utils';
import _ from 'lodash';
import { Model, Types } from 'mongoose';

import { EntrySubmissionData, NormativeDataRefs } from '../starter.model';

import { StarterEntry, StarterEntrySchema } from './entry.schema';
import { EntryService } from './entry.service';
import { createStarterEntry } from './entry.test.utils';

const ObjectId = Types.ObjectId;

const defaultTimePeriod = {
  startDate: new Date('01 Janurary 2022 00:00 UTC').toISOString(),
  endDate: new Date('01 Janurary 2023 00:00 UTC').toISOString(),
};

const TEST_AUTH_TOKEN = 'auth_token';

describe('EntryService', () => {
  let entryService: EntryService;
  let starterEntryModel: Model<StarterEntry>;
  let existingDataSources: Partial<IDataSource>[];
  let normativeServerService: NormativeServerSDKService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([{ name: StarterEntry.name, schema: StarterEntrySchema }]),
      ],
      providers: [EntryService],
    })
      .useMocker((token) => {
        if (token === NormativeServerSDKService) {
          return {
            getDataSources: jest.fn(() => existingDataSources),
            getDataSource: jest.fn(),
            deleteDataSource: jest.fn(),
            deleteReport: jest.fn(),
          };
        }
        return undefined;
      })
      .compile();
    entryService = module.get<EntryService>(EntryService);
    normativeServerService = module.get<NormativeServerSDKService>(NormativeServerSDKService);
    starterEntryModel = module.get(getModelToken(StarterEntry.name));
  });

  beforeEach(async () => {
    await starterEntryModel.deleteMany({});
    jest.clearAllMocks();
    existingDataSources = [];
  });

  afterAll(async () => {
    await stopInMemoryMongoDb();
  });

  describe('getStarterEntries', () => {
    it('should return no entries for an organization without starter entries', async () => {
      // WHEN we request all starter entries for an organization without starter entries
      const result = await entryService.getStarterEntries(new ObjectId());
      // THEN we expect no results (an empty list)
      expect(result).toHaveLength(0);
    });

    it('should return all entries for an organization with starter entries', async () => {
      // GIVEN 3 stored starter entries for the organization, each entered by a different user
      // (these user IDs gives us a consistent way to sort the expected and results lists)
      const orgObjectId = new ObjectId();
      const creatingUserIds = [1, 2, 3].map((x) => new ObjectId(`00000000000000000000000${x}`)).sort();
      const starterEntries = creatingUserIds.map((userId) =>
        createStarterEntry({ organizationId: orgObjectId, creatingUserId: userId }),
      );
      await Promise.all(starterEntries.map((se) => new starterEntryModel(se).save()));
      // WHEN we request all starter entries for the organization
      const result = await entryService.getStarterEntries(orgObjectId);
      // THEN we expect exactly three results matching the generated starterEntries.
      expect(result).toHaveLength(3);
      const sortedResults = _.sortBy(result, (r) => r.createdBy);
      sortedResults.forEach((res, idx) => {
        expect(new StarterEntry(res)).toEqual(starterEntries[idx]);
      });
    });

    it('should return only results for the requested organization', async () => {
      // GIVEN 2 stored starter entries, one for each organization
      const org1ObjectId = new ObjectId('111111111111111111111111');
      const org2ObjectId = new ObjectId('222222222222222222222222');
      const org1starterEntry = createStarterEntry({ organizationId: org1ObjectId });
      const org2starterEntry = createStarterEntry({ organizationId: org2ObjectId });
      await Promise.all([
        new starterEntryModel(org1starterEntry).save(),
        new starterEntryModel(org2starterEntry).save(),
      ]);
      // WHEN we request all starter entries for org1
      const results = await entryService.getStarterEntries(org1ObjectId);
      // THEN we expect exactly one result matching the generated starterEntry for org1.
      expect(results).toHaveLength(1);
      expect(new StarterEntry(results[0])).toEqual(org1starterEntry);
    });
  });

  describe('getStarterEntry', () => {
    it('should get a specific starter entry', async () => {
      // GIVEN a stored starter entry for an organization
      const orgObjectId = new ObjectId();
      const starterEntry = createStarterEntry({ organizationId: orgObjectId });
      const starterEntryDoc = await new starterEntryModel(starterEntry).save();
      // WHEN calling the entryService for starter entries for the organization
      const result = await entryService.getStarterEntry(orgObjectId, starterEntryDoc._id);
      // THEN we expect returned value to match the generated starter entry.
      expect(new StarterEntry(result)).toEqual(starterEntry);
    });

    it('should throw an exception if the entry is not found', async () => {
      // GIVEN some IDs that don't relate to anything in the database.
      const orgObjectId = new ObjectId();
      const entryId = new ObjectId();
      // WHEN calling the entryService for starter entries for the organization
      const entryPromise = entryService.getStarterEntry(orgObjectId, entryId);
      // THEN we expect getStarterEntry to raise an exception.
      return expect(entryPromise).rejects.toThrowError(NotFoundException);
    });
  });

  describe('Create starter entries', () => {
    it('should create a minimal starter entry', async () => {
      // GIVEN an organization, a user and a minimal starter entry
      const orgObjectId = new ObjectId();
      const userObjectId = new ObjectId();
      const entrySubmissionData: EntrySubmissionData = {
        timePeriod: defaultTimePeriod,
      };
      const dataRefs: NormativeDataRefs = {
        reportId: undefined,
        dataSources: [],
      };
      // WHEN calling the entryService to create a starter entry for the organization.
      const result = await entryService.createStarterEntry(userObjectId, orgObjectId, entrySubmissionData, dataRefs);
      // THEN we expect a successful result which is a StarterEntry containing the correct information.
      expect(result.organizationId).toEqual(orgObjectId);
      expect(result.createdBy).toEqual(userObjectId);
      // Expect the starter entry to have been created in the last 5 seconds.
      expect(new Date().getTime() - result.createdAt.getTime()).toBeLessThan(5000);
      expect(result.lastUpdatedBy).toEqual(userObjectId);
      // Expect the starter entry to have been updated in the last 5 seconds.
      expect(new Date().getTime() - result.lastUpdatedAt!.getTime()).toBeLessThan(5000);
      expect(result.rawClientState).toEqual(entrySubmissionData);
    });

    it('should store provided datasource and report references', async () => {
      // GIVEN an organization, a user and a starter entry with data references
      const orgObjectId = new ObjectId();
      const userObjectId = new ObjectId();
      const entrySubmissionData: EntrySubmissionData = {
        timePeriod: defaultTimePeriod,
      };
      const dataRefs: NormativeDataRefs = {
        reportId: new ObjectId(),
        dataSources: [new ObjectId()],
      };
      // WHEN calling the entryService to create a starter entry for the organization.
      const result = await entryService.createStarterEntry(userObjectId, orgObjectId, entrySubmissionData, dataRefs);
      // THEN we expect a successful result which is a StarterEntry including the provided data references.
      expect(result.organizationId).toEqual(orgObjectId);
      expect(result.dataSources).toMatchObject(dataRefs.dataSources);
      expect(result.reportId).toEqual(dataRefs.reportId);
    });
  });

  describe('Update starter entries', () => {
    it('should update an existing starter entry', async () => {
      // GIVEN an organization, a user and an existing starter entry
      const orgObjectId = new ObjectId();
      const userObjectId = new ObjectId();
      const initialEntry = createStarterEntry({ organizationId: orgObjectId });
      const initialEntryDoc = await new starterEntryModel(initialEntry).save();
      // AND updated submission data
      const updatedSubmissionData: EntrySubmissionData = {
        timePeriod: {
          startDate: new Date('01 Janurary 2020 00:00 UTC').toISOString(),
          endDate: new Date('01 Janurary 2021 00:00 UTC').toISOString(),
        },
      };
      // AND updated dataRefs
      const updatedDataRefs: NormativeDataRefs = {
        reportId: new ObjectId(),
        dataSources: [new ObjectId()],
      };

      // WHEN calling the entryService to update the starter entry
      const result = await entryService.updateStarterEntry(
        TEST_AUTH_TOKEN,
        userObjectId,
        orgObjectId,
        initialEntryDoc.id,
        updatedSubmissionData,
        updatedDataRefs,
      );

      // THEN we expect a successful result and the starter entry to have updated information.
      expect(result.lastUpdatedBy).toEqual(userObjectId);
      // Expect the starter entry to have been updated in the last 5 seconds.
      expect(new Date().getTime() - result.lastUpdatedAt!.getTime()).toBeLessThan(5000);
      // Expect the lastUpdated date to be after the created date (i.e. an update has happened)
      expect(result.lastUpdatedAt!.getTime() - initialEntryDoc.createdAt.getTime()).toBeGreaterThan(0);
      // Expect the updated raw data
      expect(result.rawClientState).toEqual(updatedSubmissionData);
      // Expect the updated dataRefs
      expect(result.dataSources).toEqual(updatedDataRefs.dataSources);
      expect(result.reportId).toEqual(updatedDataRefs.reportId);
    });

    it('should reject an update that changes the organization account', async () => {
      // GIVEN an organization, a user and an existing starter entry
      const orgObjectId = new ObjectId();
      const userObjectId = new ObjectId();
      const initialEntry = createStarterEntry({ organizationId: orgObjectId });
      const initialEntryDoc = await new starterEntryModel(initialEntry).save();
      // AND updated submission data
      const updatedSubmissionData: EntrySubmissionData = {
        timePeriod: defaultTimePeriod,
      };

      // WHEN calling the entryService to update the starter entry with a different orgId.
      const newOrgObjectId = new ObjectId();

      const result = entryService.updateStarterEntry(
        TEST_AUTH_TOKEN,
        userObjectId,
        newOrgObjectId,
        initialEntryDoc.id,
        updatedSubmissionData,
        { dataSources: [] },
      );

      // THEN we expect the call to be rejected
      return expect(result).rejects.toThrow(BadRequestException);
    });

    it('should reject an update that removes the minimum fields', async () => {
      // GIVEN an organization, a user and an existing starter entry
      const orgObjectId = new ObjectId();
      const userObjectId = new ObjectId();
      const initialEntry = createStarterEntry({ organizationId: orgObjectId });
      const initialEntryDoc = await new starterEntryModel(initialEntry).save();
      // AND updated submission data that has blank dates in the timePeriod
      const updatedSubmissionData: EntrySubmissionData = {
        timePeriod: {
          startDate: '',
          endDate: '',
        },
      };

      // WHEN calling the entryService to update the starter entry
      const result = entryService.updateStarterEntry(
        TEST_AUTH_TOKEN,
        userObjectId,
        orgObjectId,
        initialEntryDoc.id,
        updatedSubmissionData,
        { dataSources: [] },
      );

      // THEN we expect a the request to be rejected
      return expect(result).rejects.toThrow(BadRequestException);
    });

    it('should update fields that are specified null or empty', async () => {
      // GIVEN an organization, a user and an existing starter entry
      const orgObjectId = new ObjectId();
      const userObjectId = new ObjectId();
      const initialEntry = createStarterEntry({ organizationId: orgObjectId });
      const initialEntryDoc = await new starterEntryModel(initialEntry).save();
      // AND updated submission data
      const updatedSubmissionData: EntrySubmissionData = {
        timePeriod: defaultTimePeriod,
      };

      // WHEN calling the entryService to update the starter entry with no reportId and no dataSources.
      const result = await entryService.updateStarterEntry(
        TEST_AUTH_TOKEN,
        userObjectId,
        orgObjectId,
        initialEntryDoc.id,
        updatedSubmissionData,
        { dataSources: [] },
      );

      // THEN we expect a the request to be successful and the result to have no reportId and no dataSources.
      expect(initialEntryDoc.reportId).toBeTruthy();
      expect(result.reportId).toBeNull;

      expect(initialEntryDoc.dataSources.length).toBeGreaterThan(0);
      expect(result.dataSources.length).toEqual(0);
    });

    it('should fail to update an entry that does not exist', async () => {
      // GIVEN an organization, a user and an starter entry id that does not exist.
      const orgObjectId = new ObjectId();
      const userObjectId = new ObjectId();
      const entryId = new ObjectId();
      // AND updated submission data that removes orgId
      const updatedSubmissionData: EntrySubmissionData = {
        timePeriod: defaultTimePeriod,
      };

      // WHEN calling the entryService to update the starter entry that does not exist.
      const result = entryService.updateStarterEntry(
        TEST_AUTH_TOKEN,
        userObjectId,
        orgObjectId,
        entryId,
        updatedSubmissionData,
        { dataSources: [] },
      );

      // THEN we expect a the request to be rejected
      return expect(result).rejects.toThrow(NotFoundException);
    });

    it('should delete the old report and dataSources', async () => {
      // GIVEN an organization, a user and an existing starter entry
      const reportId = new ObjectId();
      const dataSourceIds = [new ObjectId(), new ObjectId(), new ObjectId()];
      const orgObjectId = new ObjectId();
      const userObjectId = new ObjectId();
      const initialEntry = createStarterEntry({
        organizationId: orgObjectId,
        reportId,
        dataSources: dataSourceIds,
      });
      const initialEntryDoc = await new starterEntryModel(initialEntry).save();

      // AND updated submission data
      const updatedSubmissionData: EntrySubmissionData = {
        timePeriod: {
          startDate: new Date('01 Janurary 2020 00:00 UTC').toISOString(),
          endDate: new Date('01 Janurary 2021 00:00 UTC').toISOString(),
        },
      };
      // AND updated dataRefs
      const updatedDataRefs: NormativeDataRefs = {
        reportId: new ObjectId(),
        dataSources: [new ObjectId()],
      };
      existingDataSources = dataSourceIds.map((id) => ({
        _id: id.toHexString(),
        dataSourceType: 'fuel',
      }));

      // WHEN calling the entryService to update the starter entry
      await entryService.updateStarterEntry(
        TEST_AUTH_TOKEN,
        userObjectId,
        orgObjectId,
        initialEntryDoc.id,
        updatedSubmissionData,
        updatedDataRefs,
      );

      // THEN we expect a successful result and
      // for the delete methods to have been called for the old reportId and dataSourceIds
      expect(normativeServerService.deleteReport).toHaveBeenCalledWith(TEST_AUTH_TOKEN, reportId.toString());
      expect(normativeServerService.deleteDataSource).toHaveBeenNthCalledWith(
        1,
        TEST_AUTH_TOKEN,
        existingDataSources[0],
      );
      expect(normativeServerService.deleteDataSource).toHaveBeenNthCalledWith(
        2,
        TEST_AUTH_TOKEN,
        existingDataSources[1],
      );
      expect(normativeServerService.deleteDataSource).toHaveBeenNthCalledWith(
        3,
        TEST_AUTH_TOKEN,
        existingDataSources[2],
      );
    });

    it('should not call the delete methods if there is nothing to be deleted', async () => {
      // GIVEN an organization, a user and an existing starter entry without dataSources or a report.
      const orgObjectId = new ObjectId();
      const userObjectId = new ObjectId();
      const initialEntry = createStarterEntry({
        organizationId: orgObjectId,
        dataSources: [],
      });
      initialEntry.reportId = undefined;
      const initialEntryDoc = await new starterEntryModel(initialEntry).save();

      // AND updated submission data
      const updatedSubmissionData: EntrySubmissionData = {
        timePeriod: {
          startDate: new Date('01 Janurary 2020 00:00 UTC').toISOString(),
          endDate: new Date('01 Janurary 2021 00:00 UTC').toISOString(),
        },
      };
      // AND updated dataRefs
      const updatedDataRefs: NormativeDataRefs = {
        reportId: new ObjectId(),
        dataSources: [new ObjectId()],
      };
      existingDataSources = [
        // Set the new dataSource as the only existing one to check that it does not get deleted
        {
          _id: updatedDataRefs.dataSources[0].toHexString(),
          dataSourceType: 'fuel',
        },
      ];

      // WHEN calling the entryService to update the starter entry
      await entryService.updateStarterEntry(
        TEST_AUTH_TOKEN,
        userObjectId,
        orgObjectId,
        initialEntryDoc.id,
        updatedSubmissionData,
        updatedDataRefs,
      );

      // THEN we expect a successful result and
      // for the delete methods NOT to have been called.
      expect(normativeServerService.deleteReport).not.toHaveBeenCalled();
      expect(normativeServerService.deleteDataSource).not.toHaveBeenCalled();
    });
  });

  describe('Delete starter entries', () => {
    it('should update an existing starter entry', async () => {
      const orgId = new Types.ObjectId();
      const starterEntry = createStarterEntry({ organizationId: orgId });
      await new starterEntryModel(starterEntry).save();

      await entryService.deleteStarterEntries(orgId);

      // Confirm that starter entries have been deleted.
      expect(await starterEntryModel.find({ organizationId: orgId })).toHaveLength(0);
    });
  });
});
