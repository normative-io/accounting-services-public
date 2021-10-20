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

import { FacilitiesUsage } from '../starter.model';

import { FacilitiesParser } from './facilities.parser';

const TEST_REQUEST_BODY: FacilitiesUsage = {
  size: {
    value: 1000,
    unit: 'm^2',
  },
};

describe('Parsing of facilities data', () => {
  const facilitiesParser = new FacilitiesParser();

  describe('happy path', () => {
    it('should parse the expected facilities data', () => {
      const parsedFacilitiesData = facilitiesParser.parseFacilitiesUsage(TEST_REQUEST_BODY);

      expect(parsedFacilitiesData).toEqual({
        area: 1000,
        areaUnit: 'm^2',
      });
    });
  });

  describe('parse facilities usage', () => {
    it('should return empty data without area when facilities data is not provided.', () => {
      const testRequestbody: FacilitiesUsage = {};

      const parsedFacilitiesData = facilitiesParser.parseFacilitiesUsage(testRequestbody);

      expect(parsedFacilitiesData).toEqual({});
    });
  });
});
