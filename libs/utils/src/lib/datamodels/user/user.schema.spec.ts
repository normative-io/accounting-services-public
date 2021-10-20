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

import { UserRoles } from './user-roles';
import { User, UserDocument, UserSchema } from './user.schema';

const fakeEmail = 'fake@umodel.spec.com';
const user = {
  provider: 'local',
  name: 'Fake User',
  email: fakeEmail,
} as UserDocument;

describe('User Model', () => {
  let userModel: Model<User>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [],
      imports: [rootMongooseTestModule(), MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
    }).compile();
    userModel = module.get(getModelToken(User.name));
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await stopInMemoryMongoDb();
  });

  afterEach(async () => {
    await userModel.deleteOne(user._id);
  });

  it('should begin without fake user', () =>
    userModel
      .find({ email: fakeEmail })
      .countDocuments()
      .then((userLength: number) => {
        expect(userLength).toEqual(0);
      }));

  it('successfully saved a user with defaults', async () => {
    expect.assertions(6);
    const savedUser = await new userModel(user).save();

    // Verifying the default values.
    expect(savedUser.firstTime).toBeTruthy();
    expect(savedUser.role).toEqual(UserRoles.USER);

    // terms and bccTerms explicitly must _not_ be set on newly created User objects.
    // They should only be set when the user actually accepts the terms.
    expect(savedUser.terms).toBeUndefined();
    expect(savedUser.bccTerms).toBeUndefined();

    // Verifying the virtuals
    expect(savedUser.profile).not.toBeNull();
    expect(savedUser.token).not.toBeNull();
  });

  it('should fail when saving without an email', () => {
    expect.assertions(1);
    const userWithoutEmail = {
      provider: 'local',
      name: 'some name',
    } as UserDocument;
    const expectedErrorMessage = 'User validation failed: email: Path `email` is required.';

    return expect(new userModel(userWithoutEmail).save()).rejects.toThrow(expectedErrorMessage);
  });

  it('should fail when saving with an empty email string', () => {
    expect.assertions(1);
    const userWithEmptyEmail = {
      provider: 'local',
      name: 'some name',
      email: '  ',
    } as UserDocument;
    const expectedErrorMessage = 'Email cannot be an empty string';

    return expect(new userModel(userWithEmptyEmail).save()).rejects.toThrow(expectedErrorMessage);
  });

  it('should fail when saving with already used email', () => {
    expect.assertions(1);
    const user1 = new userModel({
      provider: 'local',
      name: 'name1',
      email: 'fake@umodel.spec.com',
    });
    const user2 = new userModel({
      provider: 'local',
      name: 'name2',
      email: 'fake@umodel.spec.com',
    });
    const saveTwoUsersWithTheSameEmailAddress = async () => {
      await user1.save();
      await user2.save();
    };
    const expectedErrorMessage = 'email_1 dup key: { email: "fake@umodel.spec.com" }'; // 'The specified email address is already in use.';
    return expect(saveTwoUsersWithTheSameEmailAddress()).rejects.toThrow(expectedErrorMessage);
  });

  it('should fail when saving with already used phone_number', () => {
    expect.assertions(1);
    const user1 = new userModel({
      provider: 'local',
      name: 'name1',
      email: 'email1',
      phone_number: '123456789',
    });
    const user2 = new userModel({
      provider: 'local',
      name: 'name2',
      email: 'email2',
      phone_number: '123456789',
    });
    const saveTwoUsersWithTheSamePhoneNumber = async () => {
      await user1.save();
      await user2.save();
    };

    return expect(saveTwoUsersWithTheSamePhoneNumber()).rejects.toThrow('The specified phone number is already in use');
  });

  it('should bypass phone_number duplicacy check with empty phone_number', () => {
    expect.assertions(2);
    const user1 = new userModel({
      provider: 'local',
      name: 'name1',
      email: 'email1',
    });
    const user2 = new userModel({
      provider: 'local',
      name: 'name2',
      email: 'email2',
    });
    const saveTwoUsersWithNoPhoneNumber = async () => {
      await user1.save();
      await user2.save();
      expect(user1).not.toBeNull();
      expect(user2).not.toBeNull();
    };
    // Must resolve for the test to pass
    return saveTwoUsersWithNoPhoneNumber();
  });
});
