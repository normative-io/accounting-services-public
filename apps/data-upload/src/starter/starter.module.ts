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

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationAccount, OrganizationAccountSchema, NormativeServerSDKModule } from '@normative/utils';

import { CalculatedImpactModule } from '../calculatedImpact/calculatedImpact.module';

import { EntryModule } from './entry/entry.module';
import { ParserModule } from './parser/parser.module';
import { StarterAuthzService } from './starter.authz.service';
import { StarterController } from './starter.controller';
import { StarterService } from './starter.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OrganizationAccount.name, schema: OrganizationAccountSchema }]),
    CalculatedImpactModule,
    EntryModule,
    HttpModule,
    ParserModule,
    NormativeServerSDKModule,
  ],
  controllers: [StarterController],
  providers: [StarterAuthzService, StarterService],
})
export class StarterModule {}
