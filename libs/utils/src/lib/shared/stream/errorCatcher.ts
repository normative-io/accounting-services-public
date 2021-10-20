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

import { BufferedTransformer } from './transformer';

/**
 * Wraps a function in a transformation stream which caches the errors returned by the function.
 */
export class ErrorCatcherTransform extends BufferedTransformer<Record<string, unknown>, unknown> {
  errors: string[];
  _transformFn: TransformFn;

  constructor(transformFn: TransformFn) {
    super();
    this.errors = [];
    this._transformFn = transformFn;
  }

  override async transformOne(item: Record<string, unknown>) {
    this._transformFn(item, (err: string | null | undefined, transformedItem: Record<string, unknown>) => {
      if (err) {
        this.errors.push(err);
      } else {
        this.push(transformedItem);
      }
    });
  }
}

type TransformFn = (item: Record<string, unknown>, callback: CallbackFn) => void;
type CallbackFn = (errorMessage: string | null | undefined, transformedItem: Record<string, unknown>) => void;
