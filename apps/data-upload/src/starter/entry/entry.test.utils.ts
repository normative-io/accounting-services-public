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

import moment from 'moment';
import { Types } from 'mongoose';

import { EntrySubmissionData } from '../starter.model';

import { StarterEntry } from './entry.schema';

const ObjectId = Types.ObjectId;
type ObjectId = Types.ObjectId;

const now = new Date();
const defaultStartDate = moment(now).subtract(6, 'months').toDate();
const defaultEndDate = moment(now).add(6, 'months').toDate();
const defaultRawClientState: EntrySubmissionData = {
  timePeriod: {
    startDate: defaultStartDate.toString(),
    endDate: defaultEndDate.toString(),
  },
};

/**
 * Extend parameters as needed to create starter entries for testing.
 * Use defaults to keep the method as flexible as possible.
 *
 * @param starterEntrySeed A subset of StarterEntryData from which to generate a StarterEntry instance.
 * @returns a StarterEntry instance with default values for those not specified.
 */
export function createStarterEntry({
  organizationId = new ObjectId(),
  creatingUserId = new ObjectId(),
  reportId = new ObjectId(),
  dataSources = [new ObjectId(), new ObjectId()],
  rawClientState = defaultRawClientState,
}: {
  organizationId?: ObjectId;
  creatingUserId?: ObjectId;
  reportId?: ObjectId;
  dataSources?: ObjectId[];
  rawClientState?: EntrySubmissionData;
}): StarterEntry {
  return new StarterEntry({
    organizationId,
    createdBy: creatingUserId,
    createdAt: now,
    lastUpdatedBy: creatingUserId,
    lastUpdatedAt: now,
    coveredPeriod: {
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    },
    reportId,
    dataSources,
    rawClientState,
  });
}
