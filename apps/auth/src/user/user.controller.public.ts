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

import { Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiBody } from '@nestjs/swagger';

import { Request } from 'express';

import { UserService } from './user.service';

/**
 * This controller is for any end-point in the users API which is public.
 * This is separated to more easily authenticate every other route.
 */
@Controller('users')
export class PublicUserController {
  constructor(private readonly userService: UserService) {}

  @Post('auth0')
  @ApiOperation({ summary: 'Create a new user from Auth0 user' })
  @ApiBody({
    required: true,
    description: 'The user data to be created.',
    // See true type below. The swagger annotations can't use typescript interfaces,
    // so our swagger will be lacking this for now.
    type: Object,
  })
  createFromAuth0User(@Req() req: Request) {
    const { ...user } = req.body;
    return this.userService.createFromAuth0User(user);
  }
}
