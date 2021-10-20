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

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NormativeServerSDKService } from '@normative/utils';
import { Model, Types } from 'mongoose';

import { EntrySubmissionData, NormativeDataRefs } from '../starter.model';

import { StarterEntry, StarterEntryDocument } from './entry.schema';

const ObjectId = Types.ObjectId;
type ObjectId = Types.ObjectId;

@Injectable()
export class EntryService {
  private readonly logger = new Logger(EntryService.name);
  constructor(
    @InjectModel(StarterEntry.name)
    private starterEntryModel: Model<StarterEntry>,
    private normativeServerService: NormativeServerSDKService,
  ) {}

  getStarterEntries(organizationAccountId: Types.ObjectId) {
    return this.starterEntryModel.find({ organizationId: organizationAccountId }).lean();
  }

  async getStarterEntry(organizationAccountId: Types.ObjectId, entryId: Types.ObjectId) {
    this.logger.debug(`Fetching the starter entry ${entryId} for organizationAccountId ${organizationAccountId}`);
    const starterEntry = await this.starterEntryModel.findById(entryId);
    if (!starterEntry) {
      throw new NotFoundException(`No entry found with id ${entryId}`);
    }
    this.logger.debug(`Found the starter entry ${starterEntry} for organization ${organizationAccountId}`);
    if (!starterEntry.organizationId.equals(organizationAccountId)) {
      throw new BadRequestException('The requested starter entry does not belong to the organization in the request!');
    }
    return starterEntry;
  }

  async createStarterEntry(
    userId: Types.ObjectId,
    organizationAccountId: Types.ObjectId,
    entryData: EntrySubmissionData,
    dataRefs: NormativeDataRefs,
  ): Promise<StarterEntry> {
    const now = new Date();
    const timePeriod = entryData.timePeriod;

    const starterEntry = new StarterEntry({
      organizationId: organizationAccountId,
      createdBy: userId,
      createdAt: now,
      lastUpdatedBy: userId,
      lastUpdatedAt: now,
      coveredPeriod: {
        startDate: new Date(timePeriod.startDate),
        endDate: new Date(timePeriod.endDate),
      },
      reportId: dataRefs.reportId,
      dataSources: dataRefs.dataSources,
      rawClientState: entryData,
    });
    return await new this.starterEntryModel(starterEntry).save();
  }

  async updateStarterEntry(
    authToken: string,
    userId: Types.ObjectId,
    organizationAccountId: Types.ObjectId,
    entryId: Types.ObjectId,
    entryData: EntrySubmissionData,
    dataRefs: NormativeDataRefs,
  ): Promise<StarterEntry> {
    this.logger.log(
      `User ${userId} requests update of starter entry ${entryId} for organization ${organizationAccountId}`,
    );

    const starterEntry = await this.starterEntryModel.findById(entryId);
    if (!starterEntry) {
      throw new NotFoundException("Attempted to update an entry that doesn't exist.");
    }
    if (!starterEntry.organizationId.equals(organizationAccountId)) {
      throw new BadRequestException('Cannot change the organization associated with a starter entry.');
    }

    // Cache the old starter for cleanup
    const oldStarterEntry = { ...starterEntry.toObject() };

    // Try to update
    const updatedStarterEntry = await this.updateAndSaveStarterEntry(starterEntry, userId, entryData, dataRefs);
    this.logger.debug(`Successfully updated the starter entry ${starterEntry.id}.`);

    // Clean-up
    await this.cleanupOldStarterEntry(authToken, oldStarterEntry);

    return updatedStarterEntry;
  }
  deleteStarterEntries(organizationAccountId: Types.ObjectId) {
    return this.starterEntryModel.deleteMany({ organizationId: organizationAccountId });
  }

  private async updateAndSaveStarterEntry(
    starterEntry: StarterEntryDocument,
    userId: Types.ObjectId,
    entryData: EntrySubmissionData,
    dataRefs: NormativeDataRefs,
  ): Promise<StarterEntryDocument> {
    const now = new Date();
    const timePeriod = entryData.timePeriod;
    if (!timePeriod || !timePeriod.endDate || !timePeriod.startDate) {
      throw new BadRequestException('Updates to an entry must always specify a time period.');
    }
    // Make updates
    starterEntry.lastUpdatedBy = userId;
    starterEntry.lastUpdatedAt = now;
    starterEntry.coveredPeriod = {
      startDate: new Date(timePeriod.startDate),
      endDate: new Date(timePeriod.endDate),
    };
    starterEntry.reportId = dataRefs.reportId;
    starterEntry.dataSources = dataRefs.dataSources?.map((x) => new ObjectId(x)) ?? [];
    starterEntry.rawClientState = entryData;
    // Save
    const updatedStarterEntry = await starterEntry.save();
    this.logger.log(`Successfully updated the starter entry ${starterEntry.id}.`);
    return updatedStarterEntry;
  }

  private async cleanupOldStarterEntry(authToken: string, oldStarterEntry: StarterEntry) {
    const { dataSources, reportId } = oldStarterEntry;
    const allDataSources = await this.normativeServerService.getDataSources(authToken, oldStarterEntry.organizationId);

    const deleteDataSources = dataSources.map(async (dataSourceId) => {
      const dataSource = allDataSources.find((ds) => new ObjectId(ds._id).equals(dataSourceId));
      if (!dataSource) {
        return; // Avoid deleting dataSources that don't exist anymore
      }
      return this.normativeServerService.deleteDataSource(authToken, dataSource);
    });
    const deleteReport = reportId
      ? this.normativeServerService.deleteReport(authToken, reportId.toString())
      : Promise.resolve();

    try {
      await Promise.all([...deleteDataSources, deleteReport]);
    } catch (error) {
      // Don't block the user's submission on failures to delete.
      this.logger.error(
        `Failed to delete at least one of the old dataSources (${dataSources} or the old report ${reportId})`,
        error,
      );
    }
  }
}
