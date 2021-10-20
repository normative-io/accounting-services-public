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

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrganizationAccount, OrganizationAccountCreationRequest } from '@normative/utils';

/**
 * Parses the orgAccountCreationRequest from the starter questionnaire data.
 *
 * @param orgAccountCreationRequest The OrganizationAccountCreationRequest data
 * @returns An object representing the org data parsed from the starter data.
 * @throws Error if the result does not parse validation.
 */
@Injectable()
export class OrganizationAccountParser {
  private readonly logger = new Logger(OrganizationAccountParser.name);
  parse(orgAccountCreationRequest: OrganizationAccountCreationRequest): Partial<OrganizationAccount> {
    if (!orgAccountCreationRequest.name?.trim()) {
      this.logger.error(
        `Received null/empty name from organization account creation request. The request was: ${JSON.stringify(
          orgAccountCreationRequest,
        )}`,
      );
      throw new BadRequestException('The organization name cannot be null or empty.');
    }

    if (!orgAccountCreationRequest.vat?.trim()) {
      this.logger.error(
        `Received null/empty VAT from organization account creation request. The request was: ${JSON.stringify(
          orgAccountCreationRequest,
        )}`,
      );
      throw new BadRequestException('The organization VAT cannot be null or empty.');
    }

    const orgData: Record<string, unknown> = {
      name: orgAccountCreationRequest.name,
      vat: orgAccountCreationRequest.vat,
    };

    if (orgAccountCreationRequest.sector) {
      orgData.nace = orgAccountCreationRequest.sector;
    }

    if (orgAccountCreationRequest.country) {
      orgData.country = orgAccountCreationRequest.country;
    }

    if (orgAccountCreationRequest.currency) {
      orgData.currency = orgAccountCreationRequest.currency;
    }

    return orgData;
  }
}
