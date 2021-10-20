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

import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotImplementedException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import {
  AuthenticatedUser,
  JwtAuthGuard,
  OrganizationAccountDocument,
  OrganizationRole,
  parseObjectId,
  ParseObjectIdPipe,
  PartialUser,
  SentryTraceInterceptor,
  UserInfo,
  UserInput,
} from '@normative/utils';
import { Request } from 'express';
import { Types } from 'mongoose';

import { AuthzService } from '../authz/authz.service';

import { UserService } from './user.service';

@Controller('users')
@UseInterceptors(SentryTraceInterceptor)
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService, private readonly authzService: AuthzService) {}

  /**
   * restriction: "admin"
   */
  @Get()
  @ApiOperation({ summary: 'Get a list of users.' })
  fetchAllUsers(@Req() req: Request) {
    this.authzService.checkSiteRoleAdmin(req);

    return this.userService.getAllUsers();
  }

  // This _MUST_ be listed before the @Get(':id') route, otherwise the more general route will take priority.
  @Get('me')
  @ApiOperation({ summary: 'Get my info' })
  async me(@UserInfo() userInfo: AuthenticatedUser) {
    const user = await this.userService.fetchMyUser(userInfo.userDoc._id);
    const isBetaUser: boolean = await this.userService.isBetaUser(user.email);
    return { ...user, beta: isBetaUser };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the user to be retrieved.',
  })
  async fetchUser(@Req() req: Request, @Param('id', ParseObjectIdPipe) userId: Types.ObjectId) {
    this.authzService.checkSiteRoleAdmin(req);

    try {
      const user = await this.userService.findUser(userId);

      let isBetaUser = false;
      if (user) {
        isBetaUser = await this.userService.isBetaUser(user.email);
      }

      return { ...user, beta: isBetaUser };
    } catch (err) {
      throw new UnauthorizedException('Unauthorized');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({
    required: true,
    description: 'The user data to be created.',
    // See true type below. The swagger annotations can't use typescript interfaces,
    // so our swagger will be lacking this for now.
    type: Object,
  })
  createUser(@Req() req: Request) {
    this.authzService.checkSiteRoleAdmin(req);

    const { locale, ...user } = req.body;
    return this.userService.createUser(user, locale);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user (ADMIN)' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the user to be updated.',
  })
  @ApiBody({
    required: true,
    description: 'The user data to update.',
    // See true type below. The swagger annotations can't use typescript interfaces,
    // so our swagger will be lacking this for now.
    type: Object,
  })
  updateUser(@Req() req: Request, @Param('id', ParseObjectIdPipe) userId: Types.ObjectId) {
    this.authzService.checkSiteRoleAdmin(req);

    const propertyChanges: UserInput = req.body;
    return this.userService.changeUser(userId, propertyChanges);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update yourself' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the user to be retrieved.',
  })
  updateMe(
    @Req() req: Request,
    @UserInfo() userInfo: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) userId: Types.ObjectId,
  ) {
    // THIS ENDPOINT IS NOT YET SAFE, DUE TO WRITING UNVALIDATED DATA DIRECTLY INTO THE DATABASE.
    // PLEASE KEEP THE BLOCK UNTIL VALIDATION HAS BEEN IMPLEMENTED.
    throw new NotImplementedException('PATCH user is not implemented on this server.');

    if (!userId.equals(userInfo.userDoc._id)) {
      // May only change yourself
      throw new ForbiddenException('Claimed user id does not match the existing one');
    }

    const propertyChanges: UserInput = req.body;

    // These properties may not be changed by the user in this route.
    if (propertyChanges.role) {
      delete propertyChanges.role;
    }
    if (propertyChanges.password) {
      delete propertyChanges.password;
    }
    if (propertyChanges.email) {
      delete propertyChanges.email;
    }
    if (propertyChanges.provider) {
      delete propertyChanges.provider;
    }

    return this.userService.changeUser(userId, propertyChanges as PartialUser);
  }

  @Put(':id/email')
  @HttpCode(204)
  @ApiOperation({ summary: "Change a user's email" })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the user whose email is to be updated.',
  })
  changeEmail(
    @Req() req: Request,
    @UserInfo() userInfo: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) userId: Types.ObjectId,
  ) {
    if (!userId.equals(userInfo.userDoc._id)) {
      // May only change yourself
      throw new ForbiddenException('Claimed user id does not match the existing one');
    }
    const newEmail = String(req.body.email);

    return this.userService.changeUserEmail(userId, newEmail);
  }

  @Put(':id/phone')
  @ApiOperation({ summary: "Change a user's phone number" })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the user whose phone number is to be updated.',
  })
  changePhone(
    @Req() req: Request,
    @UserInfo() userInfo: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) userId: Types.ObjectId,
  ) {
    if (!userId.equals(userInfo.userDoc._id)) {
      // May only change yourself
      throw new ForbiddenException('Claimed user id does not match the existing one');
    }
    const newPhoneNumber = String(req.body.phoneNumber);

    return this.userService.changeUserPhone(userId, newPhoneNumber);
  }

  /**
   * restriction: "admin"
   */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deletes a user by id' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the user to be deleted.',
  })
  destroy(@Req() req: Request, @Param('id', ParseObjectIdPipe) userId: Types.ObjectId) {
    this.authzService.checkSiteRoleAdmin(req);

    return this.userService.deleteUserById(userId);
  }

  /**
   * restriction: "admin"
   */
  @Post('delete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deletes many users by ids' })
  destroyMany(@Req() req: Request) {
    this.authzService.checkSiteRoleAdmin(req);

    // TODO: Replace this ad-hoc validation with a normal schema-based validation.
    if (!Array.isArray(req.body)) {
      throw new BadRequestException('Invalid request; body should be an array of user IDs.');
    }
    const ids: unknown[] = req.body;
    return this.userService.deleteUsersByIds(ids.map((s) => parseObjectId(s)));
  }

  @Put(':id/terms')
  @ApiOperation({ summary: 'Accept the terms and conditions' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the user accepting terms and conditions',
  })
  acceptTerms(
    @Req() req: Request,
    @UserInfo() userInfo: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) userId: Types.ObjectId,
  ) {
    if (!userId.equals(userInfo.userDoc._id)) {
      throw new ForbiddenException('User ID parameter does not match authenticated user');
    }
    return this.userService.updateTerms(userId, req.body.terms);
  }

  @Put(':id/bccTerms')
  @ApiOperation({ summary: 'Accept the BCC terms and conditions' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the user accepting BCC terms and conditions',
  })
  acceptBccTerms(
    @Req() req: Request,
    @UserInfo() userInfo: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) userId: Types.ObjectId,
  ) {
    if (!userId.equals(userInfo.userDoc._id)) {
      throw new ForbiddenException('User ID parameter does not match authenticated user');
    }
    return this.userService.updateBccTerms(userId, req.body.bccTerms);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invites user to organization' })
  async invite(@Req() req: Request, @UserInfo() userInfo: AuthenticatedUser) {
    const newUserData = req.body;

    // TODO: Define a properly annotated DTO for the request body so that this custom validation & transform isn't needed.
    const orgId: Types.ObjectId = parseObjectId(newUserData?.organization);

    const organization: OrganizationAccountDocument = await this.authzService.loadOrganizationWithMembers(orgId);
    // Authorization / access check. Allow site admin role, or org admin role.
    this.authzService.checkSiteRoleAdminOrOrgRole(req, organization, OrganizationRole.ADMIN);

    return this.userService.inviteUserToOrganization(newUserData, organization, userInfo.userDoc);
  }

  @Post('resend-verification-email')
  @HttpCode(204)
  @ApiOperation({ summary: 'Resend verification email' })
  resendVerificationEmail(@Req() req: Request) {
    const { email } = req.body;
    return this.userService.resendUserVerificationEmail(email);
  }
}
