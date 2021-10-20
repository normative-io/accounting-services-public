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

import { Injectable, Logger } from '@nestjs/common';

import { ElectricityUsage, EntrySubmissionData, YesNoUnknown } from '../starter.model';
import { DataSourceRows } from '../utils';

import { DataValidator } from './data.validator';
import { FacilitiesParser } from './facilities.parser';

export const ELECTRICITY_DEFAULTS = {
  name: 'ELECTRICITY',
  electricitySupplier: 'Unknown Electricity Supplier',
  address: 'Unknown Address',
};

@Injectable()
export class ElectricityParser {
  validator: DataValidator;
  private readonly logger = new Logger(ElectricityParser.name);

  constructor(private readonly facilitesParser: FacilitiesParser) {
    this.validator = new DataValidator(ELECTRICITY_DEFAULTS.name);
  }

  /**
   * Parses the electricity data from the starter questionnaire data.
   * Will use use cost-based or area-based data (or both) depending on the data provided.
   *
   * @param starterData The starter request data
   * @returns An object representing the Electricity dataSource parsed from the starter data.
   * @throws DataTransformError if the result does not parse validation. (Typically insufficient data provided).
   */
  parseElectricityData(orgCountry: string, starterData: EntrySubmissionData): DataSourceRows | null {
    // At least one of spend, energy or facilities must be provided.
    if (!starterData.electricity?.spend && !starterData.electricity?.energy && !starterData.facilities?.size) {
      return null;
    }

    // Required fields.
    // Normative-server requires us to pass address and supplier fields, but it's
    // okay to pass 'unknown' values as we don't collect them from user.
    let electricityData: Record<string, unknown> = {
      startDate: starterData.timePeriod.startDate,
      endDate: starterData.timePeriod.endDate,
      country: orgCountry,
      address: ELECTRICITY_DEFAULTS.address,
      supplier: ELECTRICITY_DEFAULTS.electricitySupplier,
      ...(starterData.electricity && this.parseElectricityUsage(starterData.electricity)),
    };

    // Only add facilities (area) data if electricity cost or energy use is not given.
    // TODO no need to check this once https://normative.atlassian.net/browse/SUP-239 is resolved.
    if (!electricityData.cost && !electricityData.energy) {
      electricityData = {
        ...electricityData,
        ...(starterData.facilities && this.facilitesParser.parseFacilitiesUsage(starterData.facilities)),
      };
    }

    // Validate and return the parsed data
    this.validator.validate(starterData, electricityData);
    return [electricityData];
  }

  /**
   * The core parsing method. Converts the provided electricity usage data to a format
   * compatable with normative server / calc api.
   *
   * @param electricityUsage The client provided data on electricity useage.
   * @returns The parsed data.
   */
  parseElectricityUsage(electricityUsage: ElectricityUsage): Record<string, unknown> {
    const electricityData: Record<string, unknown> = {};

    if (electricityUsage.spend) {
      electricityData.cost = electricityUsage.spend.value;
      electricityData.costUnit = electricityUsage.spend.unit;
    }

    if (electricityUsage.energy) {
      electricityData.energy = electricityUsage.energy.value;
      electricityData.energyUnit = electricityUsage.energy.unit;
    }

    if (electricityUsage.hasRenewable === YesNoUnknown.YES) {
      electricityData.renewable = 100;
      electricityData.ghg = 0;
      electricityData.ghgUnit = 'kg';
    } else if (electricityUsage.hasRenewable === YesNoUnknown.NO) {
      electricityData.renewable = 0;
    }

    return electricityData;
  }
}
