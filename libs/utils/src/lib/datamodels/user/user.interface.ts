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

import { User as Auth0User, UserData as CreateAuth0UserData } from 'auth0';
import * as mongoose from 'mongoose';

import { OrganizationAccountType } from '../organizationAccount';

import { UserDocument } from './user.schema';

interface OrgSnapshot {
  _id: mongoose.Types.ObjectId;
  accountType?: OrganizationAccountType;
  name: string;
  role: string;
  vat: string;
}

export interface UserInput extends Partial<UserDocument & CreateAuth0UserData> {
  password?: string;
}

export interface IUser extends UserDocument {
  organizationAccounts?: OrgSnapshot[];
}

export type PartialUser = Partial<UserDocument & Auth0User>;
