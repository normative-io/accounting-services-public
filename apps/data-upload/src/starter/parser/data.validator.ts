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

import { Injectable } from '@nestjs/common';
import * as jsonSchemas from '@normative/json-schemas';
import { ValidateFunction } from 'ajv';

import { ajv } from '../../constants';
import { EntrySubmissionData } from '../starter.model';

import { DataTransformError } from './dataTransform.error';

@Injectable()
export class DataValidator {
  validator: ValidateFunction;

  constructor(readonly schemaName: string) {
    this.validator = ajv.compile(jsonSchemas[schemaName]);
  }

  validate(initialData: EntrySubmissionData, parsedData: Record<string, unknown>) {
    const valid = this.validator(parsedData);
    if (!valid) {
      throw new DataTransformError(this.schemaName, initialData, parsedData, this.validator.errors);
    }
  }
}
