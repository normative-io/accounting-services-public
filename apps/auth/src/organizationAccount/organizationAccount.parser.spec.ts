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

import { OrganizationAccountCreationRequest } from '@normative/utils';

import { OrganizationAccountParser } from './organizationAccount.parser';

describe('Parsing of org account creation request data', () => {
  const organizationAccountParser = new OrganizationAccountParser();

  describe('parseData', () => {
    it('should parse the expected org data', () => {
      const requestBody: OrganizationAccountCreationRequest = {
        name: 'test-company',
        vat: 'dummyVat',
        country: 'SE',
        sector: '211', // "Manufacture of basic pharmaceutical products",
      };

      const parsedOrgData = organizationAccountParser.parse(requestBody);

      expect(parsedOrgData).toEqual({
        name: 'test-company',
        vat: 'dummyVat',
        country: 'SE',
        nace: '211',
      });
    });

    it('parsing org data fails for empty vat', () => {
      const requestBody: OrganizationAccountCreationRequest = {
        name: 'test-company',
        vat: '',
        country: 'SE',
        sector: '211', // "Manufacture of basic pharmaceutical products",
      };

      expect(() => organizationAccountParser.parse(requestBody)).toThrow(
        'The organization VAT cannot be null or empty',
      );
    });

    it('parsing org data fails for empty org name', () => {
      const requestBody: OrganizationAccountCreationRequest = {
        name: '',
        vat: 'dummyVat',
        country: 'SE',
        sector: '211', // "Manufacture of basic pharmaceutical products",
      };

      expect(() => organizationAccountParser.parse(requestBody)).toThrow(
        'The organization name cannot be null or empty',
      );
    });
  });
});
