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

import { EntrySubmissionData } from '../starter.model';

export class DataTransformError extends Error {
  constructor(
    private readonly type: string,
    private readonly initialData: EntrySubmissionData,
    private readonly parsedData: Record<string, unknown>,
    private readonly validationErrors,
  ) {
    super(
      [
        `Unable to parse valid ${type} data from the provided data.`,
        `Validation Errors: ${JSON.stringify(validationErrors.map((e: Error) => e.message))}`,
        `Data provided: ${JSON.stringify(initialData)}`,
        `Parsed data (invalid): ${JSON.stringify(parsedData)}`,
      ].join('\n'),
    );
  }
}
