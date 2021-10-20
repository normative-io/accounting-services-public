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

export type CalculatedImpactDocument = HydratedDocument<CalculatedImpact>;

class Activity {
  // category unspsc or normId are expected
  @Prop({ type: Number, min: 0, max: 99999999 })
  unspsc?: number;

  @Prop({ type: String, required: true })
  normId: string;

  @Prop() // the normId description
  description?: string;

  @Prop({ type: Number, required: true })
  cost: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, required: true })
  country: string;

  @Prop() // other amount such as 10 kg
  amount?: number;

  @Prop() // the unit 'amount' is specified in, such as 'kg',
  unit?: string;

  @Prop() // the category of the activity
  category?: string;

  @Prop() // the scope of the activity
  scope?: string;

  @Prop() // the specfic scope3 category
  scope3category?: string;

  @Prop({
    type: String,
    enum: ['Scope 1', 'Scope 2', 'Scope 3'],
    required: true,
  })
  ghgScope: string;

  @Prop({ type: Date, required: true })
  date: Date;
}

@Schema()
class Impact {
  // The scientific source used to compute the impact
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ImpactFactorSource', required: false })
  source?: string;

  // The indicator, such as "Global warming"
  @Prop({ type: String, required: true })
  indicator: string;

  // The value of the impact, such as 10 kg
  @Prop({ type: Number, required: true })
  value: number;

  // An optional equivalence unit
  @Prop()
  equivalenceUnit?: string;

  // Where did the impact take place
  @Prop()
  country?: string;

  @Prop({ type: Number, required: true })
  ghgDieselCars: number;

  @Prop({ type: Number, required: true })
  emissionsSpendIntesity: number;
}

// The transaction object
class Transaction {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
  })
  _id: string;

  // Who made the purchase
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrganizationAccount',
    required: true,
  })
  organization: string;

  // The date of the transaction in ISO 8601 format
  @Prop({ type: Date, required: true })
  date: Date;

  // The cost of the transaction
  @Prop({ type: Number, required: true })
  cost: number;

  // The currency of the transaction in ISO 4217 format
  @Prop({ type: String, required: true })
  currency: string;

  // The normalized cost of the transaction
  @Prop({ type: Number, required: true })
  normalCost: number;

  // The normalized currency of the transaction in ISO 4217 format
  @Prop({ type: String, required: true })
  normalCurrency: string;

  // The ISO 3166-1 alpha-2 country code of the country where the transaction took place
  @Prop()
  country?: string;

  // A description (is sometimes associated with a transaction
  @Prop()
  description?: string;

  // The VAT-Number of the company the purchase was made from
  @Prop()
  vat?: string;

  // the source file
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransactionSource',
  })
  source?: string;

  // Additional data for HR-data tier 1
  @Prop()
  invoiceNr?: string;

  @Prop()
  costCenterCode?: string;

  @Prop()
  costCenter?: string;

  @Prop()
  project?: string;

  @Prop()
  accountCode?: string;

  @Prop()
  productDescription?: string;

  @Prop()
  taxonomyCode?: string;
}

@Schema({
  collection: 'transactionimpacts_unwind',
})
export class CalculatedImpact {
  @Prop()
  activity?: Activity;

  @Prop()
  impacts?: Impact;

  @Prop()
  transaction?: Transaction;

  // Using "new Date()" or "Date.now()" for setting default values, invokes the function at schema
  // creation time and thereby fixes the value at that time. So, all subsequent collection
  // creations use that value.
  // But if we use "Date.now" (note the lack of parantheses after now), it will be passed as
  // function to be invoked at collection creation time and hence get the current value.
  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({ required: true, default: Date.now })
  updatedAt: Date;
}
export const CalculatedImpactSchema = SchemaFactory.createForClass(CalculatedImpact);
