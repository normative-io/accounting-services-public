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

import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import {
  OrganizationAccount,
  OrganizationAccountSchema,
  OrganizationAccountType,
  OrganizationModules,
  OrganizationRole,
  rootMongooseTestModule,
  stopInMemoryMongoDb,
  User,
  UserDocument,
  UserSchema,
} from '@normative/utils';
import { Request } from 'express';
import { Model, Types } from 'mongoose';

import { StarterAuthzService } from './starter.authz.service';

describe('StarterAuthzService', () => {
  let service: StarterAuthzService;
  let userModel: Model<User>;
  let organizationAccountModel: Model<OrganizationAccount>;

  const createUserAndOrg = async (isStarterOrg, userRole) => {
    const userDoc = await new userModel({ name: 'some test user' });
    userDoc.email = `testuser-${userDoc.id}@example.com`;
    userDoc.save();
    const modules = [{ name: OrganizationModules.REPORTING, submodules: [] }];
    if (isStarterOrg) {
      modules.push({ name: OrganizationModules.STARTER, submodules: [] });
    }
    const members = userRole ? [{ user: userDoc, role: userRole }] : [];
    const orgDoc = await new organizationAccountModel({
      name: 'test starter org',
      vat: 'some kind of VAT number',
      modules,
      members,
      accountType: isStarterOrg ? OrganizationAccountType.STARTER : OrganizationAccountType.PREMIUM,
    }).save();
    return { userDoc, orgDoc };
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
      providers: [StarterAuthzService],
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
    service = module.get<StarterAuthzService>(StarterAuthzService);
  });

  afterAll(async () => {
    await stopInMemoryMongoDb();
  });

  it('should accept an admin user on a starter org', async () => {
    const isStarterOrg = true;
    const { orgDoc, userDoc } = await createUserAndOrg(isStarterOrg, OrganizationRole.ADMIN);
    const req = makeReqWithUser(userDoc);
    await expect(service.checkUserIsAdminOnStarterOrg(req, orgDoc.id)).resolves.toBeTruthy();
  });

  it('should reject admin on non-Starter', async () => {
    const isStarterOrg = false;
    const { orgDoc, userDoc } = await createUserAndOrg(isStarterOrg, OrganizationRole.ADMIN);
    const req = makeReqWithUser(userDoc);
    await expect(service.checkUserIsAdminOnStarterOrg(req, orgDoc.id)).rejects.toThrowError(ForbiddenException);
  });

  it('should reject a non-admin on Starter org', async () => {
    const isStarterOrg = true;
    const { orgDoc, userDoc } = await createUserAndOrg(isStarterOrg, OrganizationRole.GUEST);
    const req = makeReqWithUser(userDoc);
    await expect(service.checkUserIsAdminOnStarterOrg(req, orgDoc.id)).rejects.toThrowError(ForbiddenException);
  });

  it('should reject a user with no membership in the org', async () => {
    const isStarterOrg = true;
    const { orgDoc, userDoc } = await createUserAndOrg(isStarterOrg, null);
    const req = makeReqWithUser(userDoc);
    await expect(service.checkUserIsAdminOnStarterOrg(req, orgDoc.id)).rejects.toThrowError(ForbiddenException);
  });

  it("should reject a user if the org can't be found", async () => {
    const isStarterOrg = true;
    const { userDoc } = await createUserAndOrg(isStarterOrg, OrganizationRole.ADMIN);
    const req = makeReqWithUser(userDoc);

    // Request with an 'incorrect' Org ID, so the org won't be found
    const unknownId = new Types.ObjectId();
    await expect(service.checkUserIsAdminOnStarterOrg(req, unknownId)).rejects.toThrowError(ForbiddenException);
  });

  it('should reject if the user is not authenticated', async () => {
    const req = makeReqWithUser(null);
    await expect(service.checkUserIsAdminOnStarterOrg(req, new Types.ObjectId())).rejects.toThrowError(
      UnauthorizedException,
    );
  });
});
