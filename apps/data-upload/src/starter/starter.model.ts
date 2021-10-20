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

import { Types } from 'mongoose';

export enum YesNoUnknown {
  YES = 'YES',
  NO = 'NO',
  UNKNOWN = 'UNKNOWN',
}

export enum HeatingType {
  DISTRICT = 'DISTRICT',
  NATURAL_GAS = 'NATURAL GAS',
  ELECTRICITY = 'ELECTRICITY',
  NONE = 'NONE',
  UNKNOWN = 'UNKNOWN',
}

export interface ValueWithUnit {
  value: number;
  unit: string;
}

export interface ElectricityUsage {
  hasRenewable?: YesNoUnknown;
  hasSpend?: YesNoUnknown;
  spend?: ValueWithUnit;
  energy?: ValueWithUnit;
}

export interface FacilitiesUsage {
  hasFacilities?: YesNoUnknown;
  size?: ValueWithUnit;
}

export interface FuelUsage {
  // Specifies if a company owns or maintains long-term leases on vehicles.
  hasVehicles?: YesNoUnknown;

  // Specifies how much distance was covered by vehicles
  hasDistance?: YesNoUnknown;
  distance?: ValueWithUnit;

  // Specifies how much money was spent on vehicles commuting
  hasSpend?: YesNoUnknown;
  spend?: ValueWithUnit;
  volume?: ValueWithUnit;
}

export interface MachineryUsage {
  // Specifies if a company owns or maintains long-term leases on machinery.
  hasMachinery?: YesNoUnknown;

  // Specifies how much money was spent on petrol and diesel fuel for machinery
  hasSpend?: YesNoUnknown;
  spend?: ValueWithUnit;

  // Specifies how many litres of fuel was used by machines. Assumes Petrol as fuel by default.
  hasVolume?: YesNoUnknown;
  volume?: ValueWithUnit;
}

export interface HeatingUsage {
  hasSpend?: YesNoUnknown;
  spend?: ValueWithUnit;
  energy?: ValueWithUnit;
  type?: HeatingType;
}

export interface ExpenseUsage {
  // 'description' is the question/label that was presented to the user,
  // present to help trace where data came from (primarily for debugging).
  description?: string;
  normId?: string;
  spend: ValueWithUnit;
}

// startDate and endDate should each be a Date.toJSON() string representing midnight UTC on the indicated date.
export interface TimePeriod {
  startDate: string;
  endDate: string;
}

// This is the data for a Starter entry, as submitted by the client.
export interface EntrySubmissionData {
  // TODO:  numberOfEmployees is not used anywhere in parser.
  // The minimum required data is timePeriod.
  timePeriod: TimePeriod;

  numberOfEmployees?: number;
  spend?: ValueWithUnit;
  revenue?: ValueWithUnit;

  electricity?: ElectricityUsage;
  facilities?: FacilitiesUsage;
  fuel?: FuelUsage;
  heating?: HeatingUsage;
  machinery?: MachineryUsage;
  expenses?: ExpenseUsage[];
}

export interface NormativeDataRefs {
  dataSources: Types.ObjectId[];
  reportId?: Types.ObjectId;
}
