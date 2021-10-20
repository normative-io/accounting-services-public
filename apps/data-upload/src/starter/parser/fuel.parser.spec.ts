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

import { Test } from '@nestjs/testing';

import { EntrySubmissionData, HeatingType } from '../starter.model';

import { FuelParser, PETROL_FUEL_DEFAULTS, NATURAL_GAS_FUEL_DEFAULTS } from './fuel.parser';

const MINIMAL_STARTER_ENTRY: EntrySubmissionData = {
  timePeriod: {
    startDate: '2020-01-01',
    endDate: '2020-12-31',
  },
};

const PARSED_TIME_PERIOD = {
  startDate: '2020-01-01',
  endDate: '2020-12-31',
};

describe('Parsing of fuel data', () => {
  let fuelParser: FuelParser;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      providers: [FuelParser],
    }).compile();

    fuelParser = testingModule.get<FuelParser>(FuelParser);
  });

  it('should parse data from all fuel sources', () => {
    const testRequestbody: EntrySubmissionData = {
      ...MINIMAL_STARTER_ENTRY,
      fuel: {
        spend: {
          value: 300,
          unit: 'SEK',
        },
      },
      machinery: {
        volume: {
          value: 500,
          unit: 'l',
        },
      },
      heating: {
        type: HeatingType.NATURAL_GAS,
        energy: {
          value: 765,
          unit: 'kWh',
        },
      },
    };

    const parsedFuelData = fuelParser.parseFuelData(testRequestbody);

    expect(parsedFuelData).toEqual([
      {
        ...PARSED_TIME_PERIOD,
        costCenter: 'vehicles',
        cost: 300,
        costUnit: 'SEK',
        ...PETROL_FUEL_DEFAULTS,
      },
      {
        ...PARSED_TIME_PERIOD,
        costCenter: 'machinery',
        volume: 500,
        volumeUnit: 'l',
        ...PETROL_FUEL_DEFAULTS,
      },
      {
        ...PARSED_TIME_PERIOD,
        costCenter: 'Heating by NATURAL_GAS',
        energy: 765,
        energyUnit: 'kWh',
        ...NATURAL_GAS_FUEL_DEFAULTS,
      },
    ]);
  });
  describe('parse vehicles usage', () => {
    it('should parse vehicles data from spend', () => {
      // GIVEN starter entry submission data with fuel spend values
      const entry: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        fuel: {
          spend: {
            value: 300,
            unit: 'SEK',
          },
        },
      };

      // WHEN we parse the entry data
      const parsedFuelData = fuelParser.parseFuelData(entry);

      // THEN the parsed fuel data includes the costs given along with the correct defaults for normId and fuelType
      expect(parsedFuelData).toEqual([
        {
          ...PARSED_TIME_PERIOD,
          costCenter: 'vehicles',
          cost: 300,
          costUnit: 'SEK',
          ...PETROL_FUEL_DEFAULTS,
        },
      ]);
    });

    it('should parse vehicles data from volume', () => {
      // GIVEN starter entry submission data with fuel volume values
      const entry: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        fuel: {
          volume: {
            value: 450,
            unit: 'l',
          },
        },
      };

      // WHEN we parse the entry data
      const parsedFuelData = fuelParser.parseFuelData(entry);

      // THEN the parsed fuel data includes the volume given along with the correct defaults for normId and fuelType
      expect(parsedFuelData).toEqual([
        {
          ...PARSED_TIME_PERIOD,
          costCenter: 'vehicles',
          volume: 450,
          volumeUnit: 'l',
          ...PETROL_FUEL_DEFAULTS,
        },
      ]);
    });

    it('should parse vehicles data when both cost and volume are given', () => {
      // GIVEN starter entry submission data with fuel volume and spend values
      const entry: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        fuel: {
          volume: {
            value: 450,
            unit: 'l',
          },
          spend: {
            value: 500,
            unit: 'EUR',
          },
        },
      };

      // WHEN we parse the entry data
      const parsedFuelData = fuelParser.parseFuelData(entry);

      // THEN the parsed fuel data includes the volume and cost values
      expect(parsedFuelData).toEqual([
        {
          ...PARSED_TIME_PERIOD,
          costCenter: 'vehicles',
          volume: 450,
          volumeUnit: 'l',
          cost: 500,
          costUnit: 'EUR',
          ...PETROL_FUEL_DEFAULTS,
        },
      ]);
    });
  });

  describe('parse machinery usage', () => {
    it('should parse machinery data from spend', () => {
      const testRequestbody: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        machinery: {
          spend: {
            value: 300,
            unit: 'SEK',
          },
        },
      };

      const parsedFuelData = fuelParser.parseFuelData(testRequestbody);

      expect(parsedFuelData).toEqual([
        {
          ...PARSED_TIME_PERIOD,
          costCenter: 'machinery',
          cost: 300,
          costUnit: 'SEK',
          ...PETROL_FUEL_DEFAULTS,
        },
      ]);
    });

    it('should parse machinery data from volume', () => {
      const entry: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        machinery: {
          volume: {
            value: 250,
            unit: 'l',
          },
        },
      };

      const parsedFuelData = fuelParser.parseFuelData(entry);

      expect(parsedFuelData).toEqual([
        {
          ...PARSED_TIME_PERIOD,
          costCenter: 'machinery',
          volume: 250,
          volumeUnit: 'l',
          ...PETROL_FUEL_DEFAULTS,
        },
      ]);
    });

    it('should parse machinery data when both cost and volume are given', () => {
      const entry: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        machinery: {
          volume: {
            value: 250,
            unit: 'l',
          },
          spend: {
            value: 300,
            unit: 'EUR',
          },
        },
      };

      const parsedFuelData = fuelParser.parseFuelData(entry);

      expect(parsedFuelData).toEqual([
        {
          ...PARSED_TIME_PERIOD,
          costCenter: 'machinery',
          volume: 250,
          volumeUnit: 'l',
          cost: 300,
          costUnit: 'EUR',
          ...PETROL_FUEL_DEFAULTS,
        },
      ]);
    });
  });

  describe('parse mising machinery & vehicles usage', () => {
    it('should return null for missing machinery & vehicles usage.', () => {
      const parsedFuelData = fuelParser.parseFuelData(MINIMAL_STARTER_ENTRY);

      expect(parsedFuelData).toBeNull();
    });

    it('should return null when both machinery & vehicles usages are empty', () => {
      const testRequestbody: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        fuel: {},
        machinery: {},
      };

      const parsedFuelData = fuelParser.parseFuelData(testRequestbody);

      expect(parsedFuelData).toBeNull();
    });
  });

  describe('parse fuel usage for heating by NATURAL_GAS', () => {
    const GAS_HEATING_MINIMAL = {
      startDate: '2020-01-01',
      endDate: '2020-12-31',
      ...NATURAL_GAS_FUEL_DEFAULTS,
      costCenter: 'Heating by NATURAL_GAS',
    };

    it('should not parse any data for gas heating when only area of facilities is proved.', () => {
      const testRequestbody: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        heating: {
          type: HeatingType.NATURAL_GAS,
        },
        facilities: {
          size: {
            value: 1004,
            unit: 'm^2',
          },
        },
      };

      const parsedFuelData = fuelParser.parseFuelData(testRequestbody);

      expect(parsedFuelData).toBeNull();
    });

    it('should return fuel data with cost when only NATURAL_GAS spend is provided.', () => {
      const testRequestbody: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        heating: {
          type: HeatingType.NATURAL_GAS,
          spend: {
            value: 1200,
            unit: 'SEK',
          },
        },
      };

      const parsedFuelData = fuelParser.parseFuelData(testRequestbody);

      expect(parsedFuelData).toEqual([
        {
          ...GAS_HEATING_MINIMAL,
          cost: 1200,
          costUnit: 'SEK',
        },
      ]);
    });

    it('should return fuel data with energy when NATURAL_GAS energy data are provided.', () => {
      const testRequestbody: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        heating: {
          type: HeatingType.NATURAL_GAS,
          energy: {
            value: 777,
            unit: 'kWh',
          },
        },
      };

      const parsedFuelData = fuelParser.parseFuelData(testRequestbody);

      expect(parsedFuelData).toEqual([
        {
          ...GAS_HEATING_MINIMAL,
          energy: 777,
          energyUnit: 'kWh',
        },
      ]);
    });

    it('should return fuel data with energy and cost data when both NATURAL_GAS energy and spend data are provided.', () => {
      const testRequestbody: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        heating: {
          type: HeatingType.NATURAL_GAS,
          spend: {
            value: 1200,
            unit: 'SEK',
          },
          energy: {
            value: 777,
            unit: 'kWh',
          },
        },
      };

      const parsedFuelData = fuelParser.parseFuelData(testRequestbody);

      expect(parsedFuelData).toEqual([
        {
          ...GAS_HEATING_MINIMAL,
          cost: 1200,
          costUnit: 'SEK',
          energy: 777,
          energyUnit: 'kWh',
        },
      ]);
    });

    it('should not parse any fuel data when heating type is specified as natural gas, but no spend or energy values are given.', () => {
      const testRequestbody: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        heating: {
          type: HeatingType.NATURAL_GAS,
        },
      };

      const parsedFuelData = fuelParser.parseFuelData(testRequestbody);

      expect(parsedFuelData).toBeNull();
    });
  });
});
