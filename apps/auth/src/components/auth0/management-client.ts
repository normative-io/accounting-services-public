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

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AppConfigService, Environment } from '@normative/utils';
import { CreateUserData, ManagementClient, User as Auth0User, UserData } from 'auth0';

@Injectable()
export class Auth0ManagementClient extends ManagementClient {
  constructor(private readonly appConfigService: AppConfigService) {
    super({
      domain: appConfigService.getRequired(Environment.AUTH0_DOMAIN_NAME),
      clientId: appConfigService.getRequired(Environment.AUTH0_CLIENT_ID),
      clientSecret: appConfigService.getRequired(Environment.AUTH0_CLIENT_SECRET),
      audience: appConfigService.getRequired(Environment.AUTH0_DOMAIN) + 'api/v2/',
      scope: 'read:users create:users update:users delete:users',
    });
  }

  /**
   * @param {string} id
   */
  async getAuth0UserById(id: string): Promise<Auth0User> {
    try {
      return await this.getUser({ id });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * @param {string} email
   */
  async getAuth0UsersByEmail(email: string): Promise<Auth0User[]> {
    try {
      return await this.getUsersByEmail(email);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * @param {auth0.UserData} userData
   */
  async createAuth0User(userData: CreateUserData): Promise<Auth0User> {
    try {
      return await this.createUser({ ...userData, email_verified: true });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * @param {string} connection - User connection
   * @param {string} userId - User ID in Auth0 database
   * @param {auth0.UserData} updates - updated user data
   */
  async updateAuth0User(userId: string, updates: UserData): Promise<Auth0User> {
    try {
      return await this.updateUser({ id: userId }, { ...updates });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * @param {string} userId
   */
  async deleteAuth0User(userId: string) {
    try {
      return await this.deleteUser({ id: userId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * @param {string} primaryUserId
   * @param {string} secondaryUserId
   * @param {string} secondaryUserProvider
   */
  async linkAuth0Users(primaryUserId: string, secondaryUserId: string, secondaryUserProvider: string) {
    try {
      return await this.linkUsers(primaryUserId, {
        provider: secondaryUserProvider,
        user_id: secondaryUserId,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * @param {string} userId
   */
  async sendUserEmailVerification(userId: string) {
    try {
      return await this.sendEmailVerification({ user_id: userId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error): never {
    const err = error.error || error;
    const msg = typeof err.message === 'string' ? err.message : (err.message && err.message.error_description) || '';
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
    throw new HttpException(`Auth0 Error: ${msg}, code: ${err.statusCode}`, statusCode);
  }
}
