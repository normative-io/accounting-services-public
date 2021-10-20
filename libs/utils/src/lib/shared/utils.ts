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

import { NextFunction, Response } from 'express';
import moment from 'moment';

import { Document, Types } from 'mongoose';

import { HttpError } from '../components/errors/httpError';

export function handleError(next: NextFunction, status = 500) {
  return (error: Error & HttpError) => {
    // HttpErrors have a statusCode
    if (error.statusCode === undefined) {
      error.statusCode = status;
    }
    next(error);
  };
}

export function handleResponse(res: Response, status = 200, onlyStatus = false) {
  return (result: unknown) => {
    if (!result) {
      res = res.sendStatus(404);
    } else {
      res = onlyStatus ? res.sendStatus(status) : res.status(status).json(result);
    }
  };
}

/**
 * Compares ObjectId values of "string" and "ObjectId" types in any combinations
 *
 * @param {string | ObjectId} value
 * @param {string | ObjectId} other
 */
export function isObjectIdsEquals(
  value: null | undefined | string | Types.ObjectId,
  other: null | undefined | string | Types.ObjectId,
): boolean {
  if (
    !value ||
    (typeof value !== 'string' && !value.equals) ||
    !other ||
    (typeof other !== 'string' && !other.equals)
  ) {
    return false;
  }

  return typeof value === 'string'
    ? typeof other === 'string'
      ? value === other
      : other.equals(value)
    : value.equals(other);
}

export async function validateSchema<T extends Document>(document: T) {
  const validationError = document.validateSync();
  if (validationError) {
    throw new HttpError(422, validationError.message);
  }
  return document;
}

/**
 * A drop-in promise-based replacement for setTimeout.
 *
 * Credit: https://stackoverflow.com/a/33292942/1825329
 *
 * @param ms Amount of time in ms the timeout should last
 */
export function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TransactionOrActivity {
  date?: Date | string;
}

/**
 * Returns formatted date from input field date
 *
 * @param transaction Either a transaction or an activity with a date
 */
export function getDateFromTransactionOrActivity(transaction: TransactionOrActivity) {
  let tDate = moment(transaction.date);
  if (!tDate.isValid()) {
    tDate = moment(moment.now());
  }
  return tDate.toDate();
}
