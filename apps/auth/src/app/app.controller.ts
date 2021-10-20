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

import { Controller, Get, Res, UseGuards, Header } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthenticatedUser, JwtAuthGuard, UserInfo } from '@normative/utils';
import { Response } from 'express';

@Controller()
export class AppController {
  @Get('/')
  getRoot(@Res() res: Response) {
    return res.redirect(301, '/api');
  }

  @Get('/ping')
  @Header('Cache-Control', 'no-cache, no-store')
  @Header('Content-Type', 'text/plain')
  healthCheck() {
    return 'ok';
  }

  @ApiOperation({
    summary: 'An endpoint to check authentication. Checks the jwt auth token in the header of the request.',
  })
  @ApiResponse({ status: 401, description: 'When unauthenticated' })
  @ApiResponse({ status: 200, description: 'When authenticated' })
  @UseGuards(JwtAuthGuard)
  @Get('check-auth')
  checkAuth(@UserInfo() userInfo: AuthenticatedUser) {
    return userInfo.userDoc;
  }
}
