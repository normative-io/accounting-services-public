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

import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { AuthenticatedUser } from '.';

/**
 * Route handler parameter decorator. Extracts the `AuthenticatedUser`
 * from the request. This should be used on routes that have a `JwtAuthGuard`,
 * if the request handler needs access to information about the authenticated user.
 *
 * If authentication failed or was not configured on the route, then the
 * parameter handler will throw an exception, preventing access to the route.
 * This ensures that the value can be assumed to be defined and valid within
 * the main handler code.
 *
 * @example
 * ```
 *   @UseGuard(JwtAuthGuard)
 *   @Get('/me')
 *   getMyInfo(@UserInfo() userInfo: AuthenticatedUser) {
 *     return userInfo.userDoc;
 *   }
 * ```
 */
export const UserInfo: () => ParameterDecorator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request: Request = ctx.switchToHttp().getRequest();
    if (request.user) {
      return request.user;
    } else {
      throw new UnauthorizedException(`Not authenticated`);
    }
  },
);
