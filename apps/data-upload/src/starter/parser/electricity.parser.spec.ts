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

import { EntrySubmissionData, YesNoUnknown } from '../starter.model';

import { ElectricityParser, ELECTRICITY_DEFAULTS } from './electricity.parser';
import { FacilitiesParser } from './facilities.parser';

const TEST_ORG_COUNTRY = 'SE';

const TEST_REQUEST_BODY_MINIMAL: EntrySubmissionData = {
  timePeriod: {
    startDate: '2020-01-01',
    endDate: '2020-12-31',
  },
};

const ELECTRICITY_DATA_MINIMAL = {
  country: 'SE',
  startDate: '2020-01-01',
  endDate: '2020-12-31',
  address: ELECTRICITY_DEFAULTS.address,
  supplier: ELECTRICITY_DEFAULTS.electricitySupplier,
};

describe('Parsing of electricity data', () => {
  let electricityParser: ElectricityParser;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      providers: [ElectricityParser, FacilitiesParser],
    }).compile();

    electricityParser = testingModule.get<ElectricityParser>(ElectricityParser);
  });

  // TODO can be removed once https://normative.atlassian.net/browse/SUP-239 is resolved.
  it('should ignore facilities size in electricity data if cost was given', () => {
    // GIVEN starter data with electricity spend and area of facilities given.
    const entryWithElectricitySpendAndArea: EntrySubmissionData = {
      ...TEST_REQUEST_BODY_MINIMAL,
      electricity: {
        hasRenewable: YesNoUnknown.UNKNOWN,
        spend: {
          value: 1200,
          unit: 'SEK',
        },
      },
      facilities: {
        size: {
          value: 1000,
          unit: 'm^2',
        },
      },
    };

    // WHEN we parse electricity data
    const parsedElectricityData = electricityParser.parseElectricityData(
      TEST_ORG_COUNTRY,
      entryWithElectricitySpendAndArea,
    );

    // THEN we expect the parsed data to not have facility area information.
    expect(parsedElectricityData).toEqual([
      {
        ...ELECTRICITY_DATA_MINIMAL,
        cost: 1200,
        costUnit: 'SEK',
      },
    ]);
  });

  // TODO can be removed once https://normative.atlassian.net/browse/SUP-239 is resolved.
  it('should ignore facilities size in electricity data if energy was given', () => {
    // GIVEN starter data with electricity energy data and area of facilities given.
    const entryWithElectricityEnergyAndArea: EntrySubmissionData = {
      ...TEST_REQUEST_BODY_MINIMAL,
      electricity: {
        hasRenewable: YesNoUnknown.UNKNOWN,
        energy: {
          value: 1200,
          unit: 'kWh',
        },
      },
      facilities: {
        size: {
          value: 1000,
          unit: 'm^2',
        },
      },
    };

    // WHEN we parse electricity data
    const parsedElectricityData = electricityParser.parseElectricityData(
      TEST_ORG_COUNTRY,
      entryWithElectricityEnergyAndArea,
    );

    // THEN we expect the parsed data to not have facility area information.
    expect(parsedElectricityData).toEqual([
      {
        ...ELECTRICITY_DATA_MINIMAL,
        energy: 1200,
        energyUnit: 'kWh',
      },
    ]);
  });

  // TODO can be removed once https://normative.atlassian.net/browse/SUP-239 is resolved.
  it('should use facilities size in electricity data if neither cost nor energy use was given', () => {
    // GIVEN starter data with electricity spend and area of facilities given.
    const entryWithNoElectricitySpend: EntrySubmissionData = {
      ...TEST_REQUEST_BODY_MINIMAL,
      facilities: {
        size: {
          value: 1000,
          unit: 'm^2',
        },
      },
    };

    // WHEN we parse electricity data
    const parsedElectricityData = electricityParser.parseElectricityData(TEST_ORG_COUNTRY, entryWithNoElectricitySpend);

    // THEN we expect the parsed data to have area based data
    expect(parsedElectricityData).toEqual([
      {
        ...ELECTRICITY_DATA_MINIMAL,
        area: 1000,
        areaUnit: 'm^2',
      },
    ]);
  });

  it('should return null if none of cost, energy or area data are given', () => {
    // GIVEN starter data with electricity spend and area of facilities given.
    const entryWithNoElectricityData: EntrySubmissionData = {
      timePeriod: {
        startDate: '2020-01-01',
        endDate: '2020-12-31',
      },
    };
    // WHEN we parse electricity data
    const parsedElectricityData = electricityParser.parseElectricityData(TEST_ORG_COUNTRY, entryWithNoElectricityData);

    // THEN we expect the parsed data to be null
    expect(parsedElectricityData).toBeNull();
  });

  describe('parse electricity usage', () => {
    it('should return with renewable set to zero when hasRenewable is set to No', () => {
      const testRequestbody: EntrySubmissionData = {
        ...TEST_REQUEST_BODY_MINIMAL,
        electricity: {
          hasRenewable: YesNoUnknown.NO,
          spend: {
            value: 1200,
            unit: 'SEK',
          },
        },
      };

      const parsedElectricityData = electricityParser.parseElectricityData(TEST_ORG_COUNTRY, testRequestbody);

      expect(parsedElectricityData).toEqual([
        {
          ...ELECTRICITY_DATA_MINIMAL,
          renewable: 0,
          cost: 1200,
          costUnit: 'SEK',
        },
      ]);
    });

    it('should return with renewable set to 100 when hasRenewable is set to Yes', () => {
      const testRequestbody: EntrySubmissionData = {
        ...TEST_REQUEST_BODY_MINIMAL,
        electricity: {
          hasRenewable: YesNoUnknown.YES,
          spend: {
            value: 1200,
            unit: 'SEK',
          },
        },
      };

      const parsedElectricityData = electricityParser.parseElectricityData(TEST_ORG_COUNTRY, testRequestbody);

      expect(parsedElectricityData).toEqual([
        {
          ...ELECTRICITY_DATA_MINIMAL,
          renewable: 100,
          ghg: 0,
          ghgUnit: 'kg',
          cost: 1200,
          costUnit: 'SEK',
        },
      ]);
    });

    it('should return electricity data without cost when electricity spend data is not provided.', () => {
      const testRequestbody: EntrySubmissionData = {
        ...TEST_REQUEST_BODY_MINIMAL,
        facilities: {
          size: {
            value: 1000,
            unit: 'm^2',
          },
        },
      };

      const parsedElectricityData = electricityParser.parseElectricityData(TEST_ORG_COUNTRY, testRequestbody);

      expect(parsedElectricityData).toEqual([
        {
          ...ELECTRICITY_DATA_MINIMAL,
          area: 1000,
          areaUnit: 'm^2',
        },
      ]);
    });

    it('should return electricity data without area when facilities size data is not provided.', () => {
      const testRequestbody: EntrySubmissionData = {
        ...TEST_REQUEST_BODY_MINIMAL,
        electricity: {
          hasRenewable: YesNoUnknown.UNKNOWN,
          spend: {
            value: 1200,
            unit: 'SEK',
          },
        },
      };

      const parsedElectricityData = electricityParser.parseElectricityData(TEST_ORG_COUNTRY, testRequestbody);

      expect(parsedElectricityData).toEqual([
        {
          ...ELECTRICITY_DATA_MINIMAL,
          cost: 1200,
          costUnit: 'SEK',
        },
      ]);
    });
  });
});
