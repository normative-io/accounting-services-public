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

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import moment from 'moment';

import { EntrySubmissionData } from '../starter.model';

import { ExpensesParser } from './expenses.parser';

const TEST_REQUEST_BODY_MINIMAL: EntrySubmissionData = {
  timePeriod: {
    startDate: '2020-01-01',
    endDate: '2020-12-31',
  },
};

const TEST_REQUEST_BODY: EntrySubmissionData = {
  ...TEST_REQUEST_BODY_MINIMAL,
  expenses: [
    {
      description: 'Lion',
      normId: 'big-lion',
      spend: { value: 3782, unit: 'GBP' },
    },
    {
      description: 'Tabby',
      normId: 'little-tabby',
      spend: { value: 42, unit: 'SEK' },
    },
  ],
};

describe('Parsing of starter data', () => {
  const expensesParser = new ExpensesParser();

  describe('parse happy path', () => {
    it('should parse the expected expenses data', () => {
      const parsedExpenses = expensesParser.parseExpensesData(TEST_REQUEST_BODY);

      // Note Date constructor takes month as a 0-based index.
      const yearStart = new Date(Date.UTC(2020, 0, 1));
      const yearEnd = new Date(Date.UTC(2020, 11, 31));
      expect(parsedExpenses).toEqual([
        {
          cost: 3782,
          currency: 'GBP',
          date: expect.anything(), // Checked below
          description: 'Lion',
          vat: expect.anything(), // VAT is required by schema but otherwise not used.
          normId: 'big-lion',
        },
        {
          cost: 42,
          currency: 'SEK',
          date: expect.anything(), // Checked below
          description: 'Tabby',
          vat: expect.anything(), // VAT is required by schema but otherwise not used.
          normId: 'little-tabby',
        },
      ]);
      expect(parsedExpenses).not.toBeNull();
      parsedExpenses!.forEach((ex) => {
        const exDate = moment.utc(ex.date as string, moment.ISO_8601, true).toDate();
        expect(exDate.valueOf()).toBeGreaterThanOrEqual(yearStart.valueOf());
        expect(exDate.valueOf()).toBeLessThanOrEqual(yearEnd.valueOf());
      });
    });

    it('should skip data sources without sufficient input values', () => {
      const parsedExpensesData = expensesParser.parseExpensesData(TEST_REQUEST_BODY_MINIMAL);

      expect(parsedExpensesData).toBeNull();
    });
  });
});
