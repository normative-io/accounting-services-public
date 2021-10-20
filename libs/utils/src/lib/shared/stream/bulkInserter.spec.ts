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

import { Document } from 'mongoose';
import { stub } from 'sinon';

import { BulkInserter } from './bulkInserter';
import { processStream } from './stream.mock';

export interface InputDocument extends Document {
  id?: string;
  organization: string;
  // the source file
  source: string;
  createdAt: Date;
  lastUpdated: Date;
}

describe('BulkInserter', () => {
  describe('transformBatch - shouldOutput is false', () => {
    let bulkInsert: BulkInserter<InputDocument>;
    let processTransactions;
    let mongooseModel;

    beforeEach(() => {
      mongooseModel = {
        collection: {
          insertMany: async () => {
            // no-op, for test
          },
        },
      };
      bulkInsert = new BulkInserter<InputDocument>({ mongooseModel });
      processTransactions = async (transactions) =>
        processStream<InputDocument, InputDocument, BulkInserter<InputDocument>>(bulkInsert, transactions);
    });

    it('receives empty array and should return empty array', async () => {
      const transactions: InputDocument[] = [];
      const results = await processTransactions(transactions);
      expect(Array.isArray(results));
      expect(results).toHaveLength(0);
    });

    it('inserts objects that are passed to it, stream does not return', async () => {
      const objects = [1, 2, 3] as unknown[] as InputDocument[]; // = [1, 2, 3]
      const insertMany = stub(bulkInsert.mongooseModel.collection, 'insertMany');
      insertMany.resolves(true);
      const results = await processTransactions(objects);
      expect(Array.isArray(results));
      expect(results).toHaveLength(0);
      expect(insertMany.firstCall.args[0]).toEqual(objects);
    });

    it('inserts objects that are passed to it, streams return the non-empty array', async () => {
      bulkInsert = new BulkInserter<InputDocument>({ mongooseModel, shouldOutput: true });
      processTransactions = async (transactions) =>
        processStream<InputDocument, InputDocument, BulkInserter<InputDocument>>(bulkInsert, transactions);
      const objects = [1, 2, 3] as unknown[] as InputDocument[];
      const insertMany = stub(bulkInsert.mongooseModel.collection, 'insertMany');
      insertMany.resolves(true);
      const results = await processTransactions(objects);
      expect(Array.isArray(results));
      expect(results).toEqual(objects);
      expect(insertMany.firstCall.args[0]).toEqual(objects);
    });
  });
});
