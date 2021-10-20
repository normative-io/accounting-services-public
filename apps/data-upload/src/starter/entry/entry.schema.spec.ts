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

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { rootMongooseTestModule, stopInMemoryMongoDb } from '@normative/utils';
import { Model } from 'mongoose';

import { StarterEntry, StarterEntrySchema } from './entry.schema';
import { createStarterEntry } from './entry.test.utils';

describe('StarterEntry Schema', () => {
  let starterEntryModel: Model<StarterEntry>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [],
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([{ name: StarterEntry.name, schema: StarterEntrySchema }]),
      ],
    }).compile();
    starterEntryModel = module.get(getModelToken(StarterEntry.name));
  });

  afterAll(async () => {
    await stopInMemoryMongoDb();
  });

  it('Writes and reads back a StarterEntry', async () => {
    // GIVEN a starter entry
    const starterEntry = createStarterEntry({});
    // WHEN we save the entry and read it back from the database.
    const starterEntryId = (await new starterEntryModel(starterEntry).save())._id;
    const readBack = await starterEntryModel.findById(starterEntryId);
    // THEN the read entry is the same as that initially created.
    expect(readBack).toMatchObject(starterEntry);
    expect(readBack!._id).toEqual(starterEntryId);
  });
});
