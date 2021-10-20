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

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';

import { EntrySubmissionData } from '../starter.model';

type ObjectId = mongoose.Types.ObjectId;

export type StarterEntryDocument = HydratedDocument<StarterEntry>;

@Schema({ collection: 'starterentries', autoIndex: true })
export class StarterEntry {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationAccount', required: true, index: true })
  organizationId: ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdBy: ObjectId;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  lastUpdatedBy?: ObjectId;

  @Prop()
  lastUpdatedAt?: Date;

  // Fields needed for the "display name" of the submission
  // (date range, user provided name, sequential report number, whatever)
  @Prop({ type: { startDate: Date, endDate: Date }, required: true })
  coveredPeriod: {
    startDate: Date;
    endDate: Date;
  };

  // Fields to link to records in the rest of Normative's stack
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Report' })
  reportId?: ObjectId;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'dataSources' }] })
  dataSources: ObjectId[];

  // Internal Wizard state to support reloading & editing.
  @Prop({ type: Object })
  rawClientState: EntrySubmissionData;

  constructor({
    organizationId,
    createdBy,
    createdAt,
    coveredPeriod,
    reportId,
    dataSources,
    rawClientState,
    lastUpdatedBy,
    lastUpdatedAt,
  }: {
    organizationId: ObjectId;
    createdBy: ObjectId;
    createdAt: Date;
    lastUpdatedBy?: ObjectId;
    lastUpdatedAt?: Date;
    coveredPeriod: {
      startDate: Date;
      endDate: Date;
    };
    reportId?: ObjectId;
    dataSources: ObjectId[];
    rawClientState: EntrySubmissionData;
  }) {
    this.organizationId = organizationId;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.lastUpdatedBy = lastUpdatedBy;
    this.lastUpdatedAt = lastUpdatedAt;
    this.coveredPeriod = {
      startDate: coveredPeriod.startDate,
      endDate: coveredPeriod.endDate,
    };
    this.reportId = reportId;
    this.dataSources = dataSources;
    this.rawClientState = rawClientState;
  }
}

export const StarterEntrySchema = SchemaFactory.createForClass(StarterEntry);
