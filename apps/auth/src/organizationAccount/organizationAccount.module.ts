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
import {
  DataUploadSdkModule,
  NormativeServerSDKModule,
  OrganizationAccount,
  OrganizationAccountSchema,
} from '@normative/utils';

import { AuthzModule } from '../authz/authz.module';

import { OrganizationAccountController } from './organizationAccount.controller';
import { OrganizationAccountParser } from './organizationAccount.parser';
import { OrganizationAccountService } from './organizationAccount.service';

@Module({
  imports: [
    AuthzModule,
    DataUploadSdkModule,
    HttpModule,
    NormativeServerSDKModule,
    MongooseModule.forFeature([{ name: OrganizationAccount.name, schema: OrganizationAccountSchema }]),
  ],
  controllers: [OrganizationAccountController],
  providers: [OrganizationAccountService, OrganizationAccountParser],
})
export class OrganizationAccountModule {}
