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

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import { AppConfigService } from '../app-config';
import { Environment } from '../config';

type ObjectId = Types.ObjectId;

/**
 * DataUploadSdkService wraps the data-upload server related APIs.
 * Making this an injectable service supports using mock or fake implementations in unit tests.
 */
@Injectable()
export class DataUploadSdkService {
  // URL to the server, *including* the scheme (e.g., https://), *excluding* the path (e.g., /api/...).
  private dataUploadUrl: string;
  private readonly logger = new Logger(DataUploadSdkService.name);

  constructor(private httpService: HttpService, configService: AppConfigService) {
    this.dataUploadUrl = configService.getRequired(Environment.NORMATIVE_DATA_UPLOAD_URL);
  }

  async deleteStarterEntries(authToken: string, organizationAccountId: ObjectId) {
    const url = `${this.dataUploadUrl}/starter/${organizationAccountId}/entries`;
    try {
      await firstValueFrom(
        this.httpService.delete(url, {
          headers: {
            Authorization: authToken,
          },
        }),
      );
    } catch (err) {
      this.logger.error(`Error deleting starter entries for organizationAccountId ${organizationAccountId}.`, err);
      throw err;
    }
  }
}
