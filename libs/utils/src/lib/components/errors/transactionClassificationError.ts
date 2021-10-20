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

/**
 * An error that indicates that a transaction could not be classified
 */
export class TransactionClassificationError extends Error {
  /**
   * Creates an error
   */
  constructor(transaction) {
    super();
    this.name = this.constructor.name;
    this.message = `Could not classify transaction with id: ${transaction.id || transaction._id}`;
  }
}
