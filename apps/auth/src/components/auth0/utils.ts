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

import { UserInput } from '@normative/utils';
import { UserData as Auth0UserData } from 'auth0';
import _ from 'lodash';

export function parseAuth0Payload(data: UserInput): Partial<Auth0UserData> | null {
  let updates = { ...data };
  if (updates.role) {
    updates = {
      ...updates,
      app_metadata: { role: updates.role },
    };
  }
  // pick only properties that are accepted by Auth0 API
  // TODO: This either needs to really validate the _structure_ of `updates` or the type
  // of the `data` argument needs to be restricted so that callers will be forced to validate.
  const filteredData: Partial<Auth0UserData> = _.pick(updates, Auth0UserProperties);

  // updated properties must be defined
  _.forIn(filteredData, (value, key) => {
    if (_.isNil(value)) {
      _.unset(filteredData, key);
    }
  });

  if (_.isEmpty(filteredData)) {
    // no updates for auth0 properties
    return null;
  }

  return filteredData;
}

// all properties that are used in UserData interface (node_modules/@types/auth0/index.d.ts)
const Auth0UserProperties: (keyof Auth0UserData)[] = [
  'email',
  'username',
  'email_verified',
  'verify_email',
  'password',
  'phone_number',
  'phone_verified',
  'given_name',
  'family_name',
  'name',
  'user_metadata',
  'app_metadata',
];
