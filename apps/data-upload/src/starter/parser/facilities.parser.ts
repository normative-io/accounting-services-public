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

import { Injectable, Logger } from '@nestjs/common';

import { FacilitiesUsage } from '../starter.model';

@Injectable()
export class FacilitiesParser {
  private readonly logger = new Logger(FacilitiesParser.name);

  parseFacilitiesUsage(facilitiesUsage: FacilitiesUsage): Record<string, unknown> {
    const facilitiesData: Record<string, unknown> = {};

    if (facilitiesUsage?.size) {
      facilitiesData.area = facilitiesUsage.size.value;
      facilitiesData.areaUnit = facilitiesUsage.size.unit;
    }

    return facilitiesData;
  }
}
