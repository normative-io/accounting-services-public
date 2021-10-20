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
import { HydratedDocument, Types } from 'mongoose';
import * as mongoose from 'mongoose';

import { ImpactCalculationModels } from '../../components/calculation';
import { UserDocument } from '../user/user.schema';

import { OrganizationModules } from './organization-modules.enum';
import { OrganizationRole } from './organization-role';
import { OrganizationAccountType } from './organizationAccount.interface';

export type OrganizationAccountDocument = HydratedDocument<OrganizationAccount>;

export enum AnalyticsModules {
  POWER_BI = 'POWER BI',
  CUMULIO = 'CUMUL.IO',
}

export class OrganizationAccountModule {
  name: OrganizationModules;
  submodules: (string | ImpactCalculationModels | AnalyticsModules)[];
}

export class Member {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: Types.ObjectId | UserDocument;

  role: OrganizationRole; // default is 'guest',
}

class PowerBi {
  name: string;
  group: string; // id of the user's group
  report: string; // id of user's report
  dataset: string; // id of the user's dataset
  navContentPaneDisabled: boolean;
  filterPaneDisabled: boolean;
}

class DeprecatedPowerBi {
  customReport?: string;
  customDataset?: string;
}

@Schema({
  collection: 'organizationaccounts',
})
export class OrganizationAccount {
  // The organization number. This should in reality be unique, but it isn't. This is because all personal companies
  // organization number is the owner's personal identity number. The last for digits of this personal number is omitted
  // in the data we scraped, and so it is probable that there will be duplicates.

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  vat: string;

  @Prop({ type: String, enum: Object.values(OrganizationAccountType) })
  accountType?: OrganizationAccountType;

  @Prop()
  nace?: string;

  @Prop()
  currency?: string;

  @Prop()
  country?: string;

  // ID of TradeShift company account (corresponds to 'CompanyAccountId' in Tradeshift)
  @Prop()
  tradeshiftCompanyAccountId?: string;

  @Prop([Member])
  members: Member[];

  @Prop([OrganizationAccountModule])
  modules: OrganizationAccountModule[];

  @Prop([DeprecatedPowerBi])
  powerBi?: DeprecatedPowerBi;

  @Prop([PowerBi])
  powerBiList?: PowerBi[];

  @Prop()
  hasParent?: boolean;

  // The child organizations
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationAccount' }] })
  children: Types.ObjectId[] | OrganizationAccountDocument[];

  // Using "new Date()" or "Date.now()" for setting default values, invokes the function at schema
  // creation time and thereby fixes the value at that time. So, all subsequent collection
  // creations use that value.
  // But if we use "Date.now" (note the lack of parantheses after now), it will be passed as
  // function to be invoked at collection creation time and hence get the current value.
  @Prop({ required: true, default: Date.now })
  created: Date;

  @Prop({ required: true, default: Date.now })
  lastUpdated: Date;
}

export const OrganizationAccountSchema = SchemaFactory.createForClass(OrganizationAccount);

OrganizationAccountSchema.index({ tradeshiftCompanyAccountId: 1 });
OrganizationAccountSchema.index({ vat: 1 });
OrganizationAccountSchema.index({ 'members.user': 1 });
OrganizationAccountSchema.index({ children: 1 });
