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

import { BadRequestException, Controller, Get, HttpException, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@Controller('sentry')
export class SentryController {
  @Get('generate-error')
  @ApiOperation({
    summary: 'Throw an error to validate Sentry integration',
  })
  @ApiQuery({
    name: 'status',
    description: 'Specify the error code to generate (must be a 4xx or 5xx response code)',
    type: 'number',
    required: false,
  })
  @ApiResponse({
    description: 'An Http error (4xx or 5xx) including a simple string message as `sentry validation check`',
  })
  generateError(@Query('status') status: number) {
    // Throw an error which should be logged to Sentry.
    if (status && status >= 400 && status < 600) {
      throw new HttpException(`sentry validation check (status ${status})`, status);
    } else {
      throw new BadRequestException('sentry validation check');
    }
  }
}
