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
 * Error responses
 */
export * from './httpError';
export * from './transactionClassificationError';

export function pageNotFound(req, res) {
  const viewFilePath = '404';
  const statusCode = 404;
  const result = {
    status: statusCode,
  };

  res.status(result.status);
  res.render(viewFilePath, {}, (err, html) => {
    if (err) {
      return res.status(result.status).json(result);
    }

    return res.send(html);
  });
}
