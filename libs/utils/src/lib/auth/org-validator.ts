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

import { ForbiddenException } from '@nestjs/common';

import { isRoleAtLeast, OrganizationAccount, OrganizationAccountType, OrganizationRole } from '../datamodels';

import { AuthenticatedUser } from './auth.interface';

/**
 * OrgValidator provides authorization/access check functions to build access rules based
 * on the properties of an OrganizationAccount.
 *
 * Each method checks one requirement of the organization or its relationship to a user,
 * and throws `ForbiddenException` if the requirement is not met. Methods can be chained
 * to perform multiple checks.
 *
 * For example:
 * ```
 * const org = await organizationAccountModel.findById(orgId);
 * (new OrgValidator(org))
 *   .checkType(OrganizationAccountType.PREMIUM)
 *   .checkMember(req.user, OrganizationRole.USER);
 * ```
 */
export class OrgValidator {
  constructor(private org: OrganizationAccount) {}

  /**
   * Check that the organization has the specified `accountType`.
   * Throws `ForbiddenException` if the check does not pass.
   * Calls can be chained with other OrgValidator checkX methods.
   *
   * @param requiredAccountType The required `OrganizationAccountType`.
   * @returns This `OrgValidator` instance, to chain calls.
   */
  checkType(requiredAccountType: OrganizationAccountType): this {
    if (this.org.accountType !== requiredAccountType) {
      throw new ForbiddenException(`Organization Account must be of type ${requiredAccountType}.`);
    }
    return this;
  }

  /**
   * Check that the specified user is a member of the organization and has at least the required role.
   * Throws `ForbiddenException` if the user is not a member or is a member with an insufficient role.
   * Calls can be chained with other OrgValidator checkX methods.
   *
   * @param user The `AuthenticatedUser` from the Request.user property (loaded during authentication).
   * @param minRole The required role level for the member in the organization.
   * @returns This `OrgValidator` instance, to chain calls.
   */
  checkMember(user: AuthenticatedUser, minRole: OrganizationRole): this {
    const membership = this.org.members?.find((m) => m.user._id.equals(user.userDoc._id));
    if (!isRoleAtLeast(membership?.role, minRole)) {
      throw new ForbiddenException(`User must be at least ${minRole} in the organization.`);
    }
    return this;
  }
}
