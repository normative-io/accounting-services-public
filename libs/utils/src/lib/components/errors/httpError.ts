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
 * Creates a http error object for use in routes
 * e.g. next(new HttpError(404, 'Not found'))
 */
export class HttpError extends Error {
  statusCode: number;

  /**
   *
   * @param {number} statusCode The status code for the http error to be returned
   * @param {string} message  The error message
   */
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    this.statusCode = statusCode;
  }
}
