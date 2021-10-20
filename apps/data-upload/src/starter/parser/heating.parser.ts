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

import { EntrySubmissionData, HeatingType, HeatingUsage } from '../starter.model';
import { DataSourceRows } from '../utils';

import { DataValidator } from './data.validator';
import { FacilitiesParser } from './facilities.parser';

// Normative-server requires us to pass address and supplier fields, but it's
// okay to pass 'unknown' values as we don't collect them from the user.
export const HEATING_DEFAULTS = {
  supplier: 'Unknown Heating Supplier',
  address: 'Unknown Address',
};

const HEATING_SCHEMA_NAME = 'HEATING';

const ACTIVITY_NAME_FROM_HEATING_TYPE = new Map<HeatingType, string>([
  [HeatingType.DISTRICT, 'district'],
  [HeatingType.NATURAL_GAS, 'onsite'],
]);

@Injectable()
export class HeatingParser {
  validator: DataValidator;
  private readonly logger = new Logger(HeatingParser.name);

  constructor(private facilitesParser: FacilitiesParser) {
    this.validator = new DataValidator(HEATING_SCHEMA_NAME);
  }

  /**
   * Parses the heating data from the starter questionnaire data.
   * Will use use cost-based or area-based data (or both) depending on the data provided.
   *
   * @param starterData The starter request data
   * @returns An array representing the Heating dataSource rows parsed from the starter data.
   * @throws DataTransformError if the result does not parse validation. (Typically insufficient data provided).
   */
  parseHeatingData(orgCountry: string, starterData: EntrySubmissionData): DataSourceRows | null {
    const facilities = starterData.facilities;
    const heating = starterData.heating;

    // At least one of spend or facilities must be provided.
    if (!heating?.spend && !heating?.energy && !facilities?.size) {
      return null;
    }

    if (heating?.type === HeatingType.ELECTRICITY) {
      this.logger.log(`Heating type was given as ${heating.type}. Leaving for the ElectricityParser.`);
      return null;
    }

    if (heating?.type === HeatingType.NATURAL_GAS && (heating?.energy || heating.spend)) {
      this.logger.log(
        `Heating type was given as ${heating.type} and energy or spend data was provided. `,
        'Leaving for the FuelParser.',
      );
      return null;
    }

    // If heating source is NONE, then we return null, but log an error if other values were provided.
    if (heating?.type === HeatingType.NONE) {
      if (heating.energy || heating.spend) {
        this.logger.error('Received non-zero heating spend with HeatingType.NONE.');
        this.logger.debug(`Invalid starter data - ${JSON.stringify(starterData.heating)}`);
      }
      return null;
    }

    const heatingDataSourceRow: Record<string, unknown> = {
      startDate: starterData.timePeriod.startDate,
      endDate: starterData.timePeriod.endDate,
      country: orgCountry,
      ...HEATING_DEFAULTS,
      ...(heating && this.parseHeatingUsage(heating)),
      ...(facilities && this.facilitesParser.parseFacilitiesUsage(facilities)),
    };

    this.validator.validate(starterData, heatingDataSourceRow);
    return [heatingDataSourceRow];
  }

  private parseHeatingUsage(heatingUsage: HeatingUsage): Record<string, unknown> {
    const heatingData: Record<string, unknown> = {};

    if (heatingUsage.type) {
      heatingData.activityName = ACTIVITY_NAME_FROM_HEATING_TYPE.get(heatingUsage.type);
    }

    if (heatingUsage.spend) {
      heatingData.cost = heatingUsage.spend.value;
      heatingData.costUnit = heatingUsage.spend.unit;
    }

    if (heatingUsage.energy) {
      heatingData.energy = heatingUsage.energy.value;
      heatingData.energyUnit = heatingUsage.energy.unit;
    }

    return heatingData;
  }
}
