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
import { AppConfigService, Environment, HttpError } from '@normative/utils';
import { AuthenticationClient } from 'auth0';

@Injectable()
export class Auth0AuthenticationClient extends AuthenticationClient {
  readonly auth0DbConnection: string;
  constructor(private readonly appConfigService: AppConfigService) {
    super({
      domain: appConfigService.getRequired(Environment.AUTH0_DOMAIN_NAME),
      clientId: appConfigService.getRequired(Environment.AUTH0_CLIENT_ID),
      clientSecret: appConfigService.getRequired(Environment.AUTH0_CLIENT_SECRET),
    });
    this.auth0DbConnection = this.appConfigService.getRequired(Environment.AUTH0_DB_CONNECTION);
  }

  /**
   * @param {string} email
   */
  async sendResetUserPasswordEmail(email: string): Promise<unknown> {
    try {
      return await this.requestChangePasswordEmail({
        connection: this.auth0DbConnection,
        email,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error) {
    const err = error.error || error;
    throw new HttpError(err.statusCode, `Auth0 Error: ${err.message}`);
  }
}
