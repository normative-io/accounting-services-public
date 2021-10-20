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

export enum OrganizationRole {
  GUEST = 'guest',
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'superAdmin',
}

const ORGANIZATION_ROLE_ORDER: Record<OrganizationRole, number> = {
  [OrganizationRole.GUEST]: 0,
  [OrganizationRole.USER]: 1,
  [OrganizationRole.ADMIN]: 2,
  [OrganizationRole.SUPER_ADMIN]: 3,
} as const;

/**
 * Check if the given role (first param) has at least some required privilege level (second param),
 * so that higher levels have all the privileges of lower levels.
 * Levels: guest < user < admin < superAdmin.
 *
 * @param role The role being tested.
 * @param wantRole The role/privilege level that is required.
 * @returns true if the role being tested is at least the required role.
 */
export function isRoleAtLeast(
  role: OrganizationRole | null | undefined,
  wantRole: OrganizationRole | null | undefined,
): boolean {
  const haveRoleIdx = role ? ORGANIZATION_ROLE_ORDER[role] : -1;
  const wantRoleIdx = wantRole ? ORGANIZATION_ROLE_ORDER[wantRole] : 99;
  return haveRoleIdx >= wantRoleIdx;
}

/**
 * Check if the given role (first) has at most the privilege level of the atMost role (second param).
 * A convenience method (≤) for the complement to the above isRoleAtLeastMethod (≥).
 *
 * @param role The role being tested.
 * @param atMost The role/privilege level that is required.
 * @returns true if the role being tested is at most the required role.
 */
export function isRoleAtMost(
  role: OrganizationRole | null | undefined,
  atMost: OrganizationRole | null | undefined,
): boolean {
  return isRoleAtLeast(atMost, role);
}
