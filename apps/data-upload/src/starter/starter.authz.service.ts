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

import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  AuthenticatedUser,
  OrganizationAccount,
  OrganizationAccountDocument,
  OrganizationAccountType,
  OrganizationRole,
  OrgValidator,
} from '@normative/utils';
import { Request } from 'express';
import { Model, Types } from 'mongoose';

@Injectable()
export class StarterAuthzService {
  constructor(
    @InjectModel(OrganizationAccount.name)
    private readonly organizationAccountModel: Model<OrganizationAccount>,
  ) {}

  /**
   * Performs authorization check and throws ForbiddenException if authz is rejected.
   *
   * @returns The authenticated user and organization (tuple).
   */
  async checkUserIsAdminOnStarterOrg(
    req: Request,
    orgId: Types.ObjectId,
  ): Promise<[AuthenticatedUser, OrganizationAccountDocument]> {
    // Extract the authenticated user information from the request.
    if (!req.user) {
      // This should never happen because the request should be rejected by the guard before we get here.
      // TODO: Restructure so we don't need the redundant check.
      throw new UnauthorizedException(`User not authenticated`);
    }
    const { user } = req;

    const org = await this.organizationAccountModel.findById(orgId);
    if (!org) {
      // Could throw NotFoundException instead but as a general guide it's best not to reveal
      // the existence or non-existence of things that the caller doesn't have access to.
      throw new ForbiddenException(`Organization ${orgId} not allowed.`);
    }

    // Authorization check for the user on this organization.
    new OrgValidator(org).checkType(OrganizationAccountType.STARTER).checkMember(user, OrganizationRole.ADMIN);
    return [user, org];
  }
}
