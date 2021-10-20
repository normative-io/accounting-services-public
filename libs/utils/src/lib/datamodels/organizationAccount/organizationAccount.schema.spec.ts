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

import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Model } from 'mongoose';

import { rootMongooseTestModule, stopInMemoryMongoDb } from '../../database/inMemoryDatabase.module';
import { User, UserSchema } from '../user/user.schema';

import { OrganizationAccount, OrganizationAccountSchema } from './organizationAccount.schema';

describe('Organization Model', () => {
  let organizationAccountModel: Model<OrganizationAccount>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: OrganizationAccount.name, schema: OrganizationAccountSchema },
          { name: User.name, schema: UserSchema },
        ]),
      ],
    }).compile();
    organizationAccountModel = module.get(getModelToken(OrganizationAccount.name));
  });

  afterAll(async () => {
    await stopInMemoryMongoDb();
  });

  describe('Required properties', () => {
    it('should save with required props', async () => {
      expect.assertions(2);
      // Create the organizationAccouunt
      const newOrg = new organizationAccountModel({
        vat: '123123123',
        name: 'Gotham Gazette',
      });
      // Saving the organizationAccount should succeed
      const saved = await newOrg.save();
      expect(saved.name).toEqual('Gotham Gazette');
      expect(saved.vat).toEqual('123123123');
    });

    it('should fail when saving without a name', async () => {
      expect.assertions(1);
      const orgAcc = new organizationAccountModel({
        vat: '1231231',
      });
      await expect(orgAcc.save()).rejects.toThrow('Path `name` is required.');
    });

    it('should fail when saving without a vat', async () => {
      expect.assertions(1);
      const orgAcc = new organizationAccountModel({
        name: 'Big Belly Burger',
      });
      await expect(orgAcc.save()).rejects.toThrow('Path `vat` is required.');
    });
  });
});
