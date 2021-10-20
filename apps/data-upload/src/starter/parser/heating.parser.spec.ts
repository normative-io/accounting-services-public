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

import { EntrySubmissionData, HeatingType } from '../starter.model';

import { FacilitiesParser } from './facilities.parser';
import { HeatingParser, HEATING_DEFAULTS } from './heating.parser';

const TEST_ORG_COUNTRY = 'SE';

const TEST_REQUEST_BODY_MINIMAL: EntrySubmissionData = {
  timePeriod: {
    startDate: '2020-01-01',
    endDate: '2020-12-31',
  },
};

const HEATING_DATA_MINIMAL = {
  country: 'SE',
  startDate: '2020-01-01',
  endDate: '2020-12-31',
  ...HEATING_DEFAULTS,
};

describe('Parsing of heating data', () => {
  const heatingParser = new HeatingParser(new FacilitiesParser());

  it('should return null if none of spend, energy or area data are given', () => {
    // GIVEN starter data with no spend, energy use or area of facilities provided.
    const entryWithNoHeatingData: EntrySubmissionData = {
      timePeriod: {
        startDate: '2020-01-01',
        endDate: '2020-12-31',
      },
    };

    // WHEN we parse heating data
    const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, entryWithNoHeatingData);

    // THEN we expect the parsed data to be null
    expect(parsedHeatingData).toBeNull();
  });

  it('should return null when heating type is set to ELECTRICITY.', () => {
    const testRequestbody: EntrySubmissionData = {
      ...TEST_REQUEST_BODY_MINIMAL,
      heating: {
        type: HeatingType.ELECTRICITY,
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

    const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

    expect(parsedHeatingData).toBeNull();
  });

  it('should return null when heating type is set to NATURAL_GAS and spend or energy data are provided.', () => {
    const testRequestbody: EntrySubmissionData = {
      ...TEST_REQUEST_BODY_MINIMAL,
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

    const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

    expect(parsedHeatingData).toBeNull();
  });

  it('should return null when heating type is set to NONE.', () => {
    const testRequestbody: EntrySubmissionData = {
      ...TEST_REQUEST_BODY_MINIMAL,
      heating: {
        type: HeatingType.NONE,
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

    const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

    expect(parsedHeatingData).toBeNull();
  });

  it('should ignore heating type when its set to UNKNOWN.', () => {
    const testRequestbody: EntrySubmissionData = {
      ...TEST_REQUEST_BODY_MINIMAL,
      heating: {
        type: HeatingType.UNKNOWN,
        spend: {
          value: 1200,
          unit: 'SEK',
        },
      },
    };

    const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

    expect(parsedHeatingData).toEqual([
      {
        ...HEATING_DATA_MINIMAL,
        cost: 1200,
        costUnit: 'SEK',
      },
    ]);
  });

  it('should return heating data with activityName when heating type is DISTRICT.', () => {
    const testRequestbody: EntrySubmissionData = {
      ...TEST_REQUEST_BODY_MINIMAL,
      heating: {
        type: HeatingType.DISTRICT,
        spend: {
          value: 1200,
          unit: 'SEK',
        },
      },
    };

    const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

    expect(parsedHeatingData).toEqual([
      {
        ...HEATING_DATA_MINIMAL,
        cost: 1200,
        costUnit: 'SEK',
        activityName: 'district',
      },
    ]);
  });

  it('should return heating data with cost when only heating spend is provided.', () => {
    const testRequestbody: EntrySubmissionData = {
      ...TEST_REQUEST_BODY_MINIMAL,
      heating: {
        spend: {
          value: 1200,
          unit: 'SEK',
        },
      },
    };

    const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

    expect(parsedHeatingData).toEqual([
      {
        ...HEATING_DATA_MINIMAL,
        cost: 1200,
        costUnit: 'SEK',
      },
    ]);
  });

  it('should return heating data with energy when energy data are provided.', () => {
    const testRequestbody: EntrySubmissionData = {
      ...TEST_REQUEST_BODY_MINIMAL,
      heating: {
        energy: {
          value: 777,
          unit: 'kWh',
        },
      },
    };

    const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

    expect(parsedHeatingData).toEqual([
      {
        ...HEATING_DATA_MINIMAL,
        energy: 777,
        energyUnit: 'kWh',
      },
    ]);
  });

  it('should return heating data with energy cost and area data when a full entry is submitted.', () => {
    const testRequestbody: EntrySubmissionData = {
      ...TEST_REQUEST_BODY_MINIMAL,
      heating: {
        spend: {
          value: 1200,
          unit: 'SEK',
        },
        energy: {
          value: 777,
          unit: 'kWh',
        },
      },
      facilities: {
        size: {
          value: 1234,
          unit: 'm^2',
        },
      },
    };

    const parsedHeatingData = heatingParser.parseHeatingData(TEST_ORG_COUNTRY, testRequestbody);

    expect(parsedHeatingData).toEqual([
      {
        ...HEATING_DATA_MINIMAL,
        cost: 1200,
        costUnit: 'SEK',
        energy: 777,
        energyUnit: 'kWh',
        area: 1234,
        areaUnit: 'm^2',
      },
    ]);
  });
});
