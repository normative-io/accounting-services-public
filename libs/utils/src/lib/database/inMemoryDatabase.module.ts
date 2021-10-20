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

// Just import the MongoMemoryServer type here; type imports are removed at compile time.
// This avoids having a production runtime dependency on mongodb-memory-server.
// TODO: Restructure libs/utils to split out development-only code; then we can go back to a normal non-dynamic import.
import type { MongoMemoryServer } from 'mongodb-memory-server';

import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { disconnect } from 'mongoose';

let mongod: MongoMemoryServer;

/**
 * A Module that can be used in place of the Database module.
 */
export const rootMongooseTestModule = (options: MongooseModuleOptions = {}) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      // Dynamically import mongodb-memory-server so that it's only needed in code that
      // actually uses rootMongooseTestModule (ie, only needed in test code).
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      const mongoUri = mongod.getUri();
      return {
        uri: mongoUri,
        ...options,
      };
    },
  });

/**
 * Disconnect and stop the in-memory db.
 * Must be called after all tests have completed to exit jest properly.
 */
export const stopInMemoryMongoDb = async () => {
  await disconnect();
  if (mongod) await mongod.stop();
};
