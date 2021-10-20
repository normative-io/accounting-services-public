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

import { isRoleAtLeast, isRoleAtMost, OrganizationRole } from './organization-role';

describe('OrganizationRole', () => {
  it('should have a total order given by isRoleAtLeast', () => {
    expect(isRoleAtLeast(OrganizationRole.GUEST, OrganizationRole.GUEST)).toBe(true);
    expect(isRoleAtLeast(OrganizationRole.GUEST, OrganizationRole.USER)).toBe(false);
    expect(isRoleAtLeast(OrganizationRole.GUEST, OrganizationRole.ADMIN)).toBe(false);
    expect(isRoleAtLeast(OrganizationRole.GUEST, OrganizationRole.SUPER_ADMIN)).toBe(false);

    expect(isRoleAtLeast(OrganizationRole.USER, OrganizationRole.GUEST)).toBe(true);
    expect(isRoleAtLeast(OrganizationRole.USER, OrganizationRole.USER)).toBe(true);
    expect(isRoleAtLeast(OrganizationRole.USER, OrganizationRole.ADMIN)).toBe(false);
    expect(isRoleAtLeast(OrganizationRole.USER, OrganizationRole.SUPER_ADMIN)).toBe(false);

    expect(isRoleAtLeast(OrganizationRole.ADMIN, OrganizationRole.GUEST)).toBe(true);
    expect(isRoleAtLeast(OrganizationRole.ADMIN, OrganizationRole.USER)).toBe(true);
    expect(isRoleAtLeast(OrganizationRole.ADMIN, OrganizationRole.ADMIN)).toBe(true);
    expect(isRoleAtLeast(OrganizationRole.ADMIN, OrganizationRole.SUPER_ADMIN)).toBe(false);

    expect(isRoleAtLeast(OrganizationRole.SUPER_ADMIN, OrganizationRole.GUEST)).toBe(true);
    expect(isRoleAtLeast(OrganizationRole.SUPER_ADMIN, OrganizationRole.USER)).toBe(true);
    expect(isRoleAtLeast(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN)).toBe(true);
    expect(isRoleAtLeast(OrganizationRole.SUPER_ADMIN, OrganizationRole.SUPER_ADMIN)).toBe(true);
  });

  it('should have a total order given by isRoleAtMost', () => {
    expect(isRoleAtMost(OrganizationRole.GUEST, OrganizationRole.GUEST)).toBe(true);
    expect(isRoleAtMost(OrganizationRole.GUEST, OrganizationRole.USER)).toBe(true);
    expect(isRoleAtMost(OrganizationRole.GUEST, OrganizationRole.ADMIN)).toBe(true);
    expect(isRoleAtMost(OrganizationRole.GUEST, OrganizationRole.SUPER_ADMIN)).toBe(true);

    expect(isRoleAtMost(OrganizationRole.USER, OrganizationRole.GUEST)).toBe(false);
    expect(isRoleAtMost(OrganizationRole.USER, OrganizationRole.USER)).toBe(true);
    expect(isRoleAtMost(OrganizationRole.USER, OrganizationRole.ADMIN)).toBe(true);
    expect(isRoleAtMost(OrganizationRole.USER, OrganizationRole.SUPER_ADMIN)).toBe(true);

    expect(isRoleAtMost(OrganizationRole.ADMIN, OrganizationRole.GUEST)).toBe(false);
    expect(isRoleAtMost(OrganizationRole.ADMIN, OrganizationRole.USER)).toBe(false);
    expect(isRoleAtMost(OrganizationRole.ADMIN, OrganizationRole.ADMIN)).toBe(true);
    expect(isRoleAtMost(OrganizationRole.ADMIN, OrganizationRole.SUPER_ADMIN)).toBe(true);

    expect(isRoleAtMost(OrganizationRole.SUPER_ADMIN, OrganizationRole.GUEST)).toBe(false);
    expect(isRoleAtMost(OrganizationRole.SUPER_ADMIN, OrganizationRole.USER)).toBe(false);
    expect(isRoleAtMost(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN)).toBe(false);
    expect(isRoleAtMost(OrganizationRole.SUPER_ADMIN, OrganizationRole.SUPER_ADMIN)).toBe(true);
  });

  const nonRoles = ['specialRole' as OrganizationRole, null, undefined];

  it.each(nonRoles)('should return false when comparing an unknown query role "%p" to any other.', (theRole) => {
    expect(isRoleAtLeast(theRole, OrganizationRole.GUEST)).toBe(false);
    expect(isRoleAtLeast(theRole, OrganizationRole.USER)).toBe(false);
    expect(isRoleAtLeast(theRole, OrganizationRole.ADMIN)).toBe(false);
    expect(isRoleAtLeast(theRole, OrganizationRole.SUPER_ADMIN)).toBe(false);
    expect(isRoleAtMost(theRole, OrganizationRole.GUEST)).toBe(false);
    expect(isRoleAtMost(theRole, OrganizationRole.USER)).toBe(false);
    expect(isRoleAtMost(theRole, OrganizationRole.ADMIN)).toBe(false);
    expect(isRoleAtMost(theRole, OrganizationRole.SUPER_ADMIN)).toBe(false);
  });

  it.each(nonRoles)('should return false when comparing unknown _required_ role "%p" to any other.', (theRole) => {
    expect(isRoleAtLeast(OrganizationRole.GUEST, theRole)).toBe(false);
    expect(isRoleAtLeast(OrganizationRole.USER, theRole)).toBe(false);
    expect(isRoleAtLeast(OrganizationRole.ADMIN, theRole)).toBe(false);
    expect(isRoleAtLeast(OrganizationRole.SUPER_ADMIN, theRole)).toBe(false);
    expect(isRoleAtMost(OrganizationRole.GUEST, theRole)).toBe(false);
    expect(isRoleAtMost(OrganizationRole.USER, theRole)).toBe(false);
    expect(isRoleAtMost(OrganizationRole.ADMIN, theRole)).toBe(false);
    expect(isRoleAtMost(OrganizationRole.SUPER_ADMIN, theRole)).toBe(false);
  });
});
