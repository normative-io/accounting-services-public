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

import { FacilitiesParser } from './facilities.parser';

import { FuelParser, NATURAL_GAS_FUEL_DEFAULTS } from './fuel.parser';
import { HeatingParser, HEATING_DEFAULTS } from './heating.parser';

const TEST_ORG_COUNTRY = 'SE';

const MINIMAL_STARTER_ENTRY: EntrySubmissionData = {
  timePeriod: {
    startDate: '2020-01-01',
    endDate: '2020-12-31',
  },
};

const WITH_OR_WITHOUT_FACILITIES = [
  { withOrWithout: 'without', data: {} },
  {
    withOrWithout: 'with',
    data: {
      facilities: {
        size: {
          value: 1002,
          unit: 'm^2',
        },
      },
    },
  },
];

describe('Parsing of gas heating data', () => {
  let fuelParser: FuelParser;
  let heatingParser: HeatingParser;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      providers: [FuelParser, HeatingParser, FacilitiesParser],
    }).compile();

    fuelParser = testingModule.get<FuelParser>(FuelParser);
    heatingParser = testingModule.get<HeatingParser>(HeatingParser);
  });

  describe('parse fuel usage for heating by NATURAL_GAS', () => {
    const GAS_HEATING_COMMON = {
      country: 'SE',
      startDate: '2020-01-01',
      endDate: '2020-12-31',
      ...HEATING_DEFAULTS,
      activityName: 'onsite',
    };

    const GAS_FUEL_COMMON = {
      startDate: '2020-01-01',
      endDate: '2020-12-31',
      ...NATURAL_GAS_FUEL_DEFAULTS,
      costCenter: 'Heating by NATURAL_GAS',
    };

    it('should parse gas heating data with the heating parser if only facilities data are provided', () => {
      // GIVEN some gas heating starter input with only area of facilities given
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

      // WHEN we parse the starter data with the fuel and heating parsers
      const parsedFuelData = fuelParser.parseFuelData(testRequestbody);
      const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

      // THEN only the heating parser returns a result and the result is as expected.
      expect(parsedFuelData).toBeNull();
      expect(parsedHeatingData).toEqual([
        {
          ...GAS_HEATING_COMMON,
          area: 1004,
          areaUnit: 'm^2',
        },
      ]);
    });

    it.each(WITH_OR_WITHOUT_FACILITIES)(
      'should parse gas heating data with the fuel parser if spend data are provided $withOrWithout facilities data',
      (facilitiesEntryData) => {
        // GIVEN some gas heating starter data with associated spend data provided
        const testRequestbody: EntrySubmissionData = {
          ...MINIMAL_STARTER_ENTRY,
          heating: {
            type: HeatingType.NATURAL_GAS,
            spend: {
              value: 1200,
              unit: 'SEK',
            },
            ...facilitiesEntryData.data,
          },
        };

        // WHEN we parse the starter data with the fuel and heating parsers
        const parsedFuelData = fuelParser.parseFuelData(testRequestbody);
        const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

        // THEN only the fuel parser returns a result and the result is as expected.
        expect(parsedFuelData).toEqual([
          {
            ...GAS_FUEL_COMMON,
            cost: 1200,
            costUnit: 'SEK',
          },
        ]);
        expect(parsedHeatingData).toBeNull();
      },
    );

    it.each(WITH_OR_WITHOUT_FACILITIES)(
      'should parse gas heating data with the fuel parser if energy data are provided $withOrWithout facilities data',
      (facilitiesEntryData) => {
        // GIVEN some gas heating starter data with associated energy data provided
        const testRequestbody: EntrySubmissionData = {
          ...MINIMAL_STARTER_ENTRY,
          heating: {
            type: HeatingType.NATURAL_GAS,
            energy: {
              value: 777,
              unit: 'kWh',
            },
            ...facilitiesEntryData.data,
          },
        };

        // WHEN we parse the starter data with the fuel and heating parsers
        const parsedFuelData = fuelParser.parseFuelData(testRequestbody);
        const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

        // THEN only the fuel parser returns a result and the result is as expected.
        expect(parsedFuelData).toEqual([
          {
            ...GAS_FUEL_COMMON,
            energy: 777,
            energyUnit: 'kWh',
          },
        ]);
        expect(parsedHeatingData).toBeNull();
      },
    );

    it.each(WITH_OR_WITHOUT_FACILITIES)(
      'should parse gas heating data with the fuel parser if energy and spend data are provided $withOrWithout facilities data.',
      (facilitiesEntryData) => {
        // GIVEN some gas heating starter data with associated spend and energy data provided
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
          ...facilitiesEntryData.data,
        };

        // WHEN we parse the starter data with the fuel and heating parsers
        const parsedFuelData = fuelParser.parseFuelData(testRequestbody);
        const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

        // THEN only the fuel parser returns a result and the result is as expected.
        expect(parsedFuelData).toEqual([
          {
            ...GAS_FUEL_COMMON,
            cost: 1200,
            costUnit: 'SEK',
            energy: 777,
            energyUnit: 'kWh',
          },
        ]);
        expect(parsedHeatingData).toBeNull();
      },
    );

    it('should not parse any data when heating type is specified as natural gas, but no quantative data is provided.', () => {
      // GIVEN some gas heating starter data with no associated quantative data.
      const testRequestbody: EntrySubmissionData = {
        ...MINIMAL_STARTER_ENTRY,
        heating: {
          type: HeatingType.NATURAL_GAS,
        },
      };

      // WHEN we parse the starter data with the fuel and heating parsers
      const parsedFuelData = fuelParser.parseFuelData(testRequestbody);
      const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

      // THEN neither parser gives a result.
      expect(parsedFuelData).toBeNull();
      expect(parsedHeatingData).toBeNull();
    });
  });
});
