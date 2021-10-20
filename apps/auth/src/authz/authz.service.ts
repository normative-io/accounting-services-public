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

import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  OrganizationAccount,
  OrganizationAccountDocument,
  OrganizationRole,
  OrgValidator,
  UserRoles,
} from '@normative/utils';
import { Request } from 'express';
import { Model, Types } from 'mongoose';

@Injectable()
export class AuthzService {
  constructor(
    @InjectModel(OrganizationAccount.name)
    private organizationAccountModel: Model<OrganizationAccount>,
  ) {}

  /**
   * Loads the given organization, including populating the 'members' array with User documents.
   * Throws `BadRequestException` if the given ID is syntactically invalid, or `NotFoundException`
   * if the organization is not found.
   *
   * @param orgId The organization ID, typically from a URL path parameter.
   * @returns The loaded OrganizationAccountDocument.
   */
  async loadOrganizationWithMembers(orgId: Types.ObjectId): Promise<OrganizationAccountDocument> {
    const organization: OrganizationAccountDocument = await this.organizationAccountModel
      .findById(orgId)
      .populate('members.user');
    if (!organization) {
      throw new NotFoundException(`Organization not found`);
    }
    return organization;
  }

  /**
   * Checks that the authenticated user is a site admin (exactly user role 'admin').
   * Throws `ForbiddenException` if the requirement is not met.
   *
   * @param req The Request (after authentication has added the `user` data).
   */
  checkSiteRoleAdmin(req: Request): void {
    // TODO: Check is redundant with the guard, but needed as a type assertion.
    if (!req.user) {
      throw new UnauthorizedException(`User not authenticated`);
    }

    if (req.user.userDoc.role !== UserRoles.ADMIN) {
      throw new ForbiddenException('Forbidden');
    }
  }

  /**
   * Checks that the authenticated user is either a site admin (user role 'admin') _or_
   * is a member of the given organization, with at least the specified organization role level.
   * Throws `ForbiddenException` if neither requirement is met.
   *
   * @param req The Request (after authentication has added the `user` data).
   * @param org The full OrganizationAccount document.
   * @param orgRoleRequired The minimum role level that the user must have in the organization.
   */
  checkSiteRoleAdminOrOrgRole(req: Request, org: OrganizationAccount, orgRoleRequired: OrganizationRole): void {
    // TODO: Check is redundant with the guard, but needed as a type assertion.
    if (!req.user) {
      throw new UnauthorizedException(`User not authenticated`);
    }

    if (req.user.userDoc.role === UserRoles.ADMIN) {
      // Site Admin role is enough to pass the check.
      return;
    }
    // Otherwise, check for Organization role.
    new OrgValidator(org).checkMember(req.user, orgRoleRequired);
  }
}
