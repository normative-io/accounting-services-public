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

import { EntrySubmissionData, HeatingType } from '../starter.model';
import { DataSourceRows } from '../utils';

import { DataValidator } from './data.validator';

export const PETROL_FUEL_DEFAULTS = {
  fuelType: 'PETROL',
  normId: '01020204010200',
};

export const NATURAL_GAS_FUEL_DEFAULTS = {
  fuelType: 'NATURAL GAS',
  normId: '01020201050000',
};

const FUEL_SCHEMA_NAME = 'FUEL';

@Injectable()
export class FuelParser {
  validator: DataValidator;
  private readonly logger = new Logger(FuelParser.name);

  constructor() {
    this.validator = new DataValidator(FUEL_SCHEMA_NAME);
  }

  /**
   * Parses the fuel data from the starter questionnaire data.
   *
   * @param starterData The starter request data
   * @returns An object representing the Fuel dataSource parsed from the starter data.
   * @throws DataTransformError if the result does not pass validation. (Typically insufficient data provided).
   */
  parseFuelData(starterData: EntrySubmissionData): DataSourceRows | null {
    const fuelData: Record<string, unknown>[] = [];
    if (starterData.fuel?.spend || starterData.fuel?.volume) {
      fuelData.push(this.parseVehiclesUsage(starterData));
    }
    if (starterData.machinery?.spend || starterData.machinery?.volume) {
      fuelData.push(this.parseMachineryUsage(starterData));
    }
    const naturalGasUsage = this.parseNaturalGasHeatingUsage(starterData);
    if (naturalGasUsage) {
      fuelData.push(naturalGasUsage);
    }

    if (fuelData.length) {
      return fuelData;
    } else {
      this.logger.warn('Unable to parse any fuel usage from provided starterData.');
      return null;
    }
  }

  /**
   * Parses natural gas fuel useage from Heating data. This is only possible if energy or monetary values are
   * provided.
   * If only facilities area is given, this data will be parsed in the HeatingParser.
   * If any other heating type is given, this data will be parsed in the HeatingParser.
   *
   * @param starterData The submitted starter entry data.
   * @returns A record corresponding to a dataSource row, where the dataSource if of type 'Fuel'.
   */
  private parseNaturalGasHeatingUsage(starterData: EntrySubmissionData): Record<string, unknown> | null {
    const heating = starterData.heating;
    if (heating?.type !== HeatingType.NATURAL_GAS) {
      // Case handled by the heating parser
      return null;
    }
    if (!heating.spend && !heating.energy) {
      // Case handled by the heating parser
      this.logger.log(`Heating type was set to ${heating.type} but no spend or energy values were given for usage.`);
      return null;
    }

    const naturalGasRecord: Record<string, unknown> = {
      startDate: starterData.timePeriod.startDate,
      endDate: starterData.timePeriod.endDate,
      costCenter: 'Heating by NATURAL_GAS',
      ...NATURAL_GAS_FUEL_DEFAULTS,
    };

    if (heating.spend) {
      naturalGasRecord.cost = heating.spend.value;
      naturalGasRecord.costUnit = heating.spend.unit;
    }

    if (heating.energy) {
      naturalGasRecord.energy = heating.energy.value;
      naturalGasRecord.energyUnit = heating.energy.unit;
    }

    this.validator.validate(starterData, naturalGasRecord);
    return naturalGasRecord;
  }

  /**
   * Parses the vehicles usage from the starter questionnaire data.
   *
   * @param starterData The starter request data
   * @returns An object representing the Fuel dataSource parsed from the starter data.
   * @throws DataTransformError if the result does not pass validation. (Typically insufficient data provided).
   */
  private parseVehiclesUsage(starterData: EntrySubmissionData): Record<string, unknown> {
    const vehicleData: Record<string, unknown> = {
      startDate: starterData.timePeriod.startDate,
      endDate: starterData.timePeriod.endDate,
      costCenter: 'vehicles',
      ...PETROL_FUEL_DEFAULTS,
    };

    if (starterData.fuel?.spend) {
      vehicleData.cost = starterData.fuel.spend.value;
      vehicleData.costUnit = starterData.fuel.spend.unit;
    }

    if (starterData.fuel?.volume) {
      vehicleData.volume = starterData.fuel.volume.value;
      vehicleData.volumeUnit = starterData.fuel.volume.unit;
    }

    this.validator.validate(starterData, vehicleData);
    return vehicleData;
  }

  /**
   * Parses the machinery usage from the starter questionnaire data.
   *
   * @param starterData The starter request data
   * @returns An object representing the Fuel dataSource parsed from the starter data.
   * @throws DataTransformError if the result does not pass validation. (Typically insufficient data provided).
   */
  private parseMachineryUsage(starterData: EntrySubmissionData): Record<string, unknown> {
    const machineryData: Record<string, unknown> = {
      startDate: starterData.timePeriod.startDate,
      endDate: starterData.timePeriod.endDate,
      costCenter: 'machinery',
      ...PETROL_FUEL_DEFAULTS,
    };

    if (starterData.machinery?.spend) {
      machineryData.cost = starterData.machinery.spend.value;
      machineryData.costUnit = starterData.machinery.spend.unit;
    }

    if (starterData.machinery?.volume) {
      machineryData.volume = starterData.machinery.volume.value;
      machineryData.volumeUnit = starterData.machinery.volume.unit;
    }

    this.validator.validate(starterData, machineryData);
    return machineryData;
  }
}
