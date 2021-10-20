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

import { Document, Model } from 'mongoose';

import { BufferedTransformer } from '../../shared/stream/transformer';

/**
 * Creates a writable stream that inserts items without validation into the mongodb database
 *
 * @param MongooseModel The mongoose model of the items we want to insert
 * @returns {Writable}
 */
export class BulkInserter<InputDocument extends Document> extends BufferedTransformer<InputDocument, InputDocument> {
  mongooseModel: Model<Document>;
  protected shouldOutput: boolean;

  constructor(options: { mongooseModel; bufferLength?: number; shouldOutput?: boolean }) {
    super();
    this.mongooseModel = options.mongooseModel;
    if (options.bufferLength && options.bufferLength > 1000) {
      this.bufferLength = 1000;
    }
    // Force boolean (default is false, so with this we change undefined to false)
    this.shouldOutput = !!options.shouldOutput;
  }

  override async transformBatch(documents: InputDocument[]): Promise<InputDocument[]> {
    if (documents.length === 0) {
      return [];
    }
    await this.mongooseModel.collection.insertMany(documents);
    if (this.shouldOutput) {
      return documents;
    }
    return [];
  }
}
