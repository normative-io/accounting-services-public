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

import { ArgumentMetadata, ValidationError, ValidationPipe } from '@nestjs/common';

import { VALIDATION_PIPE_OPTIONS } from '../constants';

import { EntrySubmissionDataDto } from './starter.dto';

// Helper to build a list of the names of properties that fail validation.
function expandPropertyNames(errors: ValidationError[], prefix: string, into: string[]): string[] {
  errors.forEach((e) => {
    into.push(prefix + e.property);
    if (e.children) {
      expandPropertyNames(e.children, prefix + e.property + '.', into);
    }
  });
  return into;
}

// Helper to collect field names that failed validation so that tests can match them.
class CollectedErrs extends Error {
  errors: ValidationError[];
  mentionedFields: string[];

  constructor(errors: ValidationError[]) {
    super(`Validation errors: ${JSON.stringify(errors, null, '  ')}`);
    this.errors = errors;
    this.mentionedFields = expandPropertyNames(errors, '', []);
  }
}

// Metadata which would normally come from the @Body decorator.
const BODY_PARAM_META: ArgumentMetadata = {
  type: 'body',
  metatype: EntrySubmissionDataDto,
} as const;

describe('Validation of Starter submissions', () => {
  let validationPipe: ValidationPipe;

  beforeAll(() => {
    validationPipe = new ValidationPipe({
      ...VALIDATION_PIPE_OPTIONS,
      exceptionFactory: (errs: ValidationError[]) => {
        throw new CollectedErrs(errs);
      },
    });
  });

  it('should accept a minimum submission', async () => {
    const raw = {
      organizationAccountId: '12345',
      timePeriod: {
        startDate: '2021-07-01',
        endDate: '2021-09-30',
      },
    };

    const body = await validationPipe.transform(raw, BODY_PARAM_META);
    // Values should all be retained.
    expect(body).toMatchObject(raw);
  });

  it('should accept a maximal submission', async () => {
    const raw = {
      organizationAccountId: '12345',
      countryOfRegistration: 'FR',
      numberOfEmployees: 42,
      revenue: {
        value: 368.5,
        unit: 'EUR',
      },
      timePeriod: {
        startDate: '2021-07-01',
        endDate: '2021-09-30',
      },
      electricity: {
        renewablePercent: 98.0,
        spend: {
          value: 1005,
          unit: 'EUR',
        },
        energy: {
          value: 345,
          unit: 'kWh',
        },
      },
      facilities: {
        size: {
          value: 30000,
          unit: 'm^2',
        },
      },
      fuel: {
        spend: {
          value: 2000,
          unit: 'EUR',
        },
      },
      heating: {
        districtHeating: true,
        spend: {
          value: 3500,
          unit: 'EUR',
        },
        energy: {
          value: 234,
          unit: 'kWh',
        },
      },
      expenses: [
        {
          description: 'A big spinning sign in front of the building',
          normId: 'signs',
          spend: {
            value: 23,
            unit: 'EUR',
          },
        },
        {
          description: 'A lawyer for every occasion',
          normId: 'legal',
          spend: {
            value: 9999,
            unit: 'EUR',
          },
        },
      ],
    };

    const body = await validationPipe.transform(raw, BODY_PARAM_META);
    expect(body).toMatchObject(raw);
  });

  it('should retain extra fields', async () => {
    const raw = {
      organizationAccountId: '12345',
      timePeriod: {
        startDate: '2021-07-01',
        endDate: '2021-09-30',
      },
      someExtra: 'data',
      usedBy: 'the client',
    };

    const body = await validationPipe.transform(raw, BODY_PARAM_META);
    // Values should all be retained.
    expect(body).toMatchObject(raw);
    expect(body.someExtra).toBeTruthy();
    expect(body.usedBy).toBeTruthy();
  });

  it('should reject badly formatted dates', async () => {
    const raw = {
      organizationAccountId: '12345',
      timePeriod: {
        startDate: '1-Jul-2020',
        endDate: '2021-09-30',
      },
    };
    const badFields = await validationPipe.transform(raw, BODY_PARAM_META).catch((e) => e?.mentionedFields);
    expect(badFields).toContain('timePeriod.startDate');
  });

  it('should reject invalid country codes', async () => {
    const raw = {
      organizationAccountId: '12345',
      countryOfRegistration: 'XYZZY', // <-- Invalid country code.
      timePeriod: {
        startDate: '2020-07-01',
        endDate: '2021-09-30',
      },
    };
    const badFields = await validationPipe.transform(raw, BODY_PARAM_META).catch((e) => e?.mentionedFields);
    expect(badFields).toContain('countryOfRegistration');
  });

  it('should reject values with the wrong types', async () => {
    const raw = {
      timePeriod: false,

      countryOfRegistration: {}, // object; should be string
      numberOfEmployees: [42], // array, should be number
      revenue: {
        value: true, // boolean, should be number
        unit: { someSubField: true }, // object, should be string
      },
      electricity: {
        renewablePercent: {}, // object, should be number
        // spend is optional
      },
      // array, should be object
      facilities: [
        {
          size: {
            value: 30000,
            unit: 'm^2',
          },
        },
      ],
      fuel: {
        volume: 'Twenty Olympic-sized swimming pools', // string, should be ValueWithUnit object
        // spend is optional
      },
      heating: {
        districtHeating: 100.0, // number, should be boolean
        // spend is optional
      },
      expenses: [
        {
          description: ['expensive expenses'], // array, should be string
          normId: 3143214, // number, should be string
        },
      ],
    };

    const badFields: string[] = await validationPipe.transform(raw, BODY_PARAM_META).catch((e) => e?.mentionedFields);
    badFields.sort(); // Sort so that the output is deterministic.
    expect(badFields).toMatchObject([
      'countryOfRegistration',
      'electricity',
      'electricity.renewablePercent',
      'expenses',
      'expenses.0',
      'expenses.0.description',
      'expenses.0.normId',
      'expenses.0.spend',
      'facilities',
      'fuel',
      'fuel.volume',
      'fuel.volume.volume',
      'heating',
      'heating.districtHeating',
      'numberOfEmployees',
      'revenue',
      'revenue.unit',
      'revenue.value',
      'timePeriod',
      'timePeriod.timePeriod', // this is an artefact of validating a boolean against a nested object.
    ]);
  });
});
