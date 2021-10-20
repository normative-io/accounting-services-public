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

import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import {
  OrganizationAccount,
  OrganizationAccountSchema,
  rootMongooseTestModule,
  stopInMemoryMongoDb,
  User,
  UserSchema,
  UserRoles,
  OrganizationAccountType,
  OrganizationRole,
  Member,
  UserDocument,
} from '@normative/utils';
import { Request } from 'express';
import { capitalize } from 'lodash';
import { Model, Types } from 'mongoose';

import { AuthzService } from './authz.service';

const ObjectId = Types.ObjectId;
type ObjectId = Types.ObjectId;

const TEST_ORG_DATA = {
  name: 'A test org',
  accountType: OrganizationAccountType.PREMIUM,
  vat: 'test vat 12345',
  modules: [],
} as const;

describe('AuthzService', () => {
  let service: AuthzService;
  let userModel: Model<User>;
  let organizationAccountModel: Model<OrganizationAccount>;
  let testUsers: Record<string, UserDocument>;
  let testOrg: ObjectId;

  const createUser = async (ident: string, role: UserRoles): Promise<UserDocument> => {
    return new userModel({
      name: ident,
      email: `test-${ident}@example.com`,
      role,
    }).save();
  };

  // Create a full matrix of users to test access rules.
  const createUsersAndOrgs = async () => {
    // Test users that are not members of the test org at all.
    testUsers = {
      unrelatedSiteUser: await createUser('unrelatedSiteUser', UserRoles.USER),
      unrelatedSiteAdmin: await createUser('unrelatedSiteAdmin', UserRoles.ADMIN),
    };

    // Test users that are members of the test org with various different privilege levels.
    const members: Member[] = [];
    for (const role of [UserRoles.USER, UserRoles.ADMIN]) {
      for (const orgRole of Object.values(OrganizationRole)) {
        const ident = `site${capitalize(role)}Org${capitalize(orgRole)}`;
        const user = await createUser(ident, role);
        testUsers[ident] = user;
        members.push({ user, role: orgRole });
      }
    }

    const org = await new organizationAccountModel({
      ...TEST_ORG_DATA,
      members,
    }).save();

    testOrg = org._id;
  };

  const makeReqWithUser = (userDoc: UserDocument | null): Request => {
    const req = {} as unknown as Request;
    if (userDoc) {
      // Constructed this way because this gives type checking on the structure of the `user` field.
      req.user = {
        userDoc,
        sub: userDoc.id ?? 'test user',
      };
    }
    return req;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthzService],
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: OrganizationAccount.name, schema: OrganizationAccountSchema },
        ]),
      ],
    }).compile();
    userModel = module.get(getModelToken(User.name));
    organizationAccountModel = module.get(getModelToken(OrganizationAccount.name));
    service = module.get(AuthzService);

    await createUsersAndOrgs();
  });

  afterAll(async () => {
    await stopInMemoryMongoDb();
  });

  describe('loadOrganizationWithMembers', () => {
    it('should throw NotFoundException if the org is not found', async () => {
      const uniqueId = new ObjectId();
      await expect(service.loadOrganizationWithMembers(uniqueId)).rejects.toThrowError(NotFoundException);
    });

    it('should load the organization document and populate members', async () => {
      const org = await service.loadOrganizationWithMembers(testOrg);

      // Org exists.
      expect(org).toBeTruthy();
      // Org has the expected data.
      expect(org.vat).toEqual(TEST_ORG_DATA.vat);
      const memberNames = org.members.map((x) => (x.user as UserDocument).name);
      expect(memberNames).toEqual(
        expect.arrayContaining([
          // Note this is not the complete list of members, it's a subset.
          'siteUserOrgGuest',
          'siteUserOrgUser',
          'siteUserOrgAdmin',
          'siteAdminOrgGuest',
        ]),
      );
      expect(memberNames).toEqual(expect.not.arrayContaining(['unrelatedSiteUser', 'unrelatedSiteAdmin']));
    });
  });

  describe('checkSiteRoleAdmin', () => {
    it('should accept if the user has site role ADMIN', () => {
      const req = makeReqWithUser(testUsers.unrelatedSiteAdmin);
      expect(() => {
        service.checkSiteRoleAdmin(req);
      }).not.toThrowError();
    });

    it('should reject if the user is not authenticated', () => {
      expect(() => {
        service.checkSiteRoleAdmin(makeReqWithUser(null));
      }).toThrowError(UnauthorizedException);
    });

    it('should reject if the user is not role admin', () => {
      const req = makeReqWithUser(testUsers.unrelatedSiteUser);
      expect(() => {
        service.checkSiteRoleAdmin(req);
      }).toThrowError(ForbiddenException);
    });
  });

  describe('checkSiteRoleAdminOrOrgRole', () => {
    it('should accept if the user has one of the required roles', async () => {
      const org = await service.loadOrganizationWithMembers(testOrg);

      // Check not a member, but has site role admin.
      expect(() => {
        service.checkSiteRoleAdminOrOrgRole(makeReqWithUser(testUsers.unrelatedSiteAdmin), org, OrganizationRole.USER);
      }).not.toThrowError();

      // Check the exact org role.
      expect(() => {
        service.checkSiteRoleAdminOrOrgRole(makeReqWithUser(testUsers.siteUserOrgUser), org, OrganizationRole.USER);
      }).not.toThrowError();

      // Check a 'higher privilege' org role.
      expect(() => {
        service.checkSiteRoleAdminOrOrgRole(makeReqWithUser(testUsers.siteUserOrgAdmin), org, OrganizationRole.USER);
      }).not.toThrowError();

      // Check having both the site role and the required org role.
      expect(() => {
        service.checkSiteRoleAdminOrOrgRole(makeReqWithUser(testUsers.siteAdminOrgUser), org, OrganizationRole.USER);
      }).not.toThrowError();

      // Check having both the site role and a higher privilege org role.
      expect(() => {
        service.checkSiteRoleAdminOrOrgRole(makeReqWithUser(testUsers.siteAdminOrgAdmin), org, OrganizationRole.USER);
      }).not.toThrowError();
    });

    it('should reject if the user is not authenticated', async () => {
      const org = await service.loadOrganizationWithMembers(testOrg);
      expect(() => {
        service.checkSiteRoleAdminOrOrgRole(makeReqWithUser(null), org, OrganizationRole.USER);
      }).toThrowError(UnauthorizedException);
    });

    it('should reject if the user is not a member or site admin', async () => {
      const org = await service.loadOrganizationWithMembers(testOrg);
      expect(() => {
        service.checkSiteRoleAdminOrOrgRole(makeReqWithUser(testUsers.unrelatedSiteUser), org, OrganizationRole.USER);
      }).toThrowError(ForbiddenException);
    });

    it('should reject if the user is a member but does not have the required level', async () => {
      const org = await service.loadOrganizationWithMembers(testOrg);
      expect(() => {
        service.checkSiteRoleAdminOrOrgRole(makeReqWithUser(testUsers.siteUserOrgGuest), org, OrganizationRole.USER);
      }).toThrowError(ForbiddenException);
    });
  });
});
