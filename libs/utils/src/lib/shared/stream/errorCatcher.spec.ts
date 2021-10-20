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

import { ErrorCatcherTransform } from './errorCatcher';
import { processStream } from './stream.mock';

describe('ErrorCatcher', () => {
  type ProcessTransactionsFn = (input: unknown[]) => void;

  let errorCatcher: ErrorCatcherTransform;
  let processTransactions: ProcessTransactionsFn;

  beforeEach(() => {
    errorCatcher = new ErrorCatcherTransform((transactions, cb) => {
      cb(null, transactions);
    });
    processTransactions = async (transactions: unknown[]) => processStream(errorCatcher, transactions);
  });

  it('receives empty array and should return empty array', async () => {
    const transactions = [];

    const results = await processTransactions(transactions);

    expect(Array.isArray(results)).toBeTruthy();
    expect(results).toHaveLength(0);
  });

  it('passes array of objects, stream should return it', async () => {
    const transactions: number[] = [1, 2, 3];

    const results = await processTransactions(transactions);

    expect(results).toEqual(transactions);
  });

  it('inserts objects, should call _transformFn', async () => {
    const objects = [{ value: 1 }, { value: 2 }, { value: 3 }];
    const objectsDoubled = objects.map((item) => ({ value: item.value * 2 }));
    errorCatcher = new ErrorCatcherTransform((item, cb) => {
      const doubled = (item as unknown as { value: number }).value * 2;
      cb(null, { value: doubled });
    });
    processTransactions = async (transactions: unknown[]) => processStream(errorCatcher, transactions);

    const results = await processTransactions(objects);

    expect(Array.isArray(results)).toBeTruthy();
    expect(results).toHaveLength(objects.length);
    expect(results).toEqual(objectsDoubled);
  });

  it('inserts objects, produces one error; should return error inside errors array', async () => {
    const objects = [{ a: 'a' }];
    const errorMessage = 'error';
    errorCatcher = new ErrorCatcherTransform((transactions, cb) => {
      cb(errorMessage, transactions);
    });
    processTransactions = async (transactions: unknown[]) => processStream(errorCatcher, transactions);

    const results = await processTransactions(objects);

    expect(Array.isArray(results)).toBeTruthy();
    expect(results).toHaveLength(0);
    expect(Array.isArray(errorCatcher.errors)).toBeTruthy();
    expect(errorCatcher.errors).toHaveLength(1);
    expect(errorCatcher.errors[0]).toEqual(errorMessage);
  });
});
