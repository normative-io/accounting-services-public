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
import moment from 'moment';

import { ExpenseUsage, EntrySubmissionData } from '../starter.model';
import { DataSourceRows } from '../utils';

import { DataValidator } from './data.validator';

const EXPENSES_DEFAULTS = {
  name: 'TRANSACTION',
};

/**
 * Parses the fuel data from the starter questionnaire data.
 * TODO How to handle distance based fuel data from the starter questionnaire?
 *
 * @param starterData The starter request data
 * @returns An object representing the Fuel dataSource parsed from the starter data.
 * @throws DataTransformError if the result does not parse validation. (Typically insufficient data provided).
 */
@Injectable()
export class ExpensesParser {
  validator: DataValidator;
  private readonly logger = new Logger(ExpensesParser.name);

  constructor() {
    this.validator = new DataValidator(EXPENSES_DEFAULTS.name);
  }

  parseExpensesData(starterData: EntrySubmissionData): DataSourceRows | null {
    if (!starterData.expenses) {
      return null;
    }

    const startMoment = moment.utc(starterData.timePeriod.startDate, moment.ISO_8601, true);
    const endMoment = moment.utc(starterData.timePeriod.endDate, moment.ISO_8601, true);
    const duration = endMoment.diff(startMoment, 'days', false);
    const expenseDate = startMoment.add(Math.trunc(duration / 2), 'days').toDate();

    const expenses: Record<string, unknown>[] = [];
    for (const expense of starterData.expenses) {
      const expenseData: Record<string, unknown> = this.parseSingleExpense(expense, expenseDate);
      this.validator.validate(starterData, expenseData);
      expenses.push(expenseData);
    }
    return expenses;
  }

  private parseSingleExpense(expense: ExpenseUsage, onDate: Date) {
    return {
      cost: expense.spend.value,
      currency: expense.spend.unit,
      date: onDate.toISOString(),
      description: expense.description,
      normId: expense.normId,
      vat: 'dummy',
    };
  }
}
