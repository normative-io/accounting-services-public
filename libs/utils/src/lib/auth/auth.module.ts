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

import { DynamicModule, FactoryProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';

import { User, UserSchema } from '../datamodels';

import { AUTH_OPTIONS_TOKEN } from './constants';
import { JwtStrategy } from './jwt.strategy';

export type AuthModuleOptions = Pick<FactoryProvider, 'useFactory' | 'inject'>;

@Module({})
export class AuthModule {
  static withConfig(options: AuthModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      imports: [PassportModule, MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
      providers: [
        {
          ...options,
          provide: AUTH_OPTIONS_TOKEN,
        },
        JwtStrategy,
      ],
    };
  }
}
