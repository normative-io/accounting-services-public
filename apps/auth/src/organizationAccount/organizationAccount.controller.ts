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
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import {
  AuthenticatedUser,
  GetOrganizationAccountsRequest,
  JwtAuthGuard,
  OrganizationAccountCreationRequest,
  OrganizationAccountDocument,
  OrganizationAccountType,
  OrganizationRole,
  ParseObjectIdPipe,
  SentryTraceInterceptor,
  UserInfo,
  UserRoles,
} from '@normative/utils';
import { Request } from 'express';
import { Types } from 'mongoose';

import { AuthzService } from '../authz/authz.service';

import { OrganizationAccountParser } from './organizationAccount.parser';
import { OrganizationAccountService } from './organizationAccount.service';

@Controller('organizationAccounts')
@UseInterceptors(SentryTraceInterceptor)
@UseGuards(JwtAuthGuard)
export class OrganizationAccountController {
  constructor(
    private readonly authzService: AuthzService,
    private readonly organizationAccountService: OrganizationAccountService,
    private readonly organizationAccountParser: OrganizationAccountParser,
  ) {}

  /**
   * Get a list of organization accounts for the authenticated user
   */
  @Get('/')
  @ApiOperation({ summary: 'Get a list of organization accounts for the authenticated user.' })
  fetchAllOrganizationAccounts(
    @Req() req: Request,
    @UserInfo() userInfo: AuthenticatedUser,
    @Body() body: GetOrganizationAccountsRequest,
  ) {
    this.authzService.checkSiteRoleAdmin(req);

    const user = userInfo.userDoc;
    if (body?.accountType && !Object.values(OrganizationAccountType).includes(body.accountType)) {
      throw new BadRequestException(`Requested accountType must be one of ${Object.values(OrganizationAccountType)}`);
    }
    return this.organizationAccountService.getOrganizationAccountsForUser(user._id, body?.accountType);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get a single organization account by id.' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the organization for which to retrieve the account.',
  })
  async fetchOrganizationAccount(
    @Req() req: Request,
    @UserInfo() userInfo: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) orgId: Types.ObjectId,
  ) {
    const organization = await this.authzService.loadOrganizationWithMembers(orgId);
    this.authzService.checkSiteRoleAdminOrOrgRole(req, organization, OrganizationRole.GUEST);

    const role: UserRoles = userInfo.userDoc.role;
    return this.organizationAccountService.getOrganizationAccountById(orgId, role);
  }

  @Post('/')
  @ApiOperation({ summary: 'Creates a new organization account.' })
  createOrganizationAccount(
    @Req() req: Request,
    @UserInfo() userInfo: AuthenticatedUser,
    @Body() submittedData: OrganizationAccountCreationRequest,
  ) {
    // Anyone can create a starter organization account
    if (submittedData.accountType === OrganizationAccountType.STARTER) {
      return this.organizationAccountService.createStarterOrganizationAccount(
        this.organizationAccountParser.parse(submittedData),
        userInfo.userDoc._id,
      );
    }

    // Only site-admins can create other organization accounts
    if (userInfo.userDoc.role !== UserRoles.ADMIN) {
      throw new ForbiddenException('Only site admins can create a premium account.');
    } else {
      return this.organizationAccountService.createOrgAccount(this.organizationAccountParser.parse(submittedData));
    }
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Deletes an organization account.' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the organization for which to delete the account.',
  })
  deleteOrganizationAccount(
    @Req() req: Request,
    @Headers('Authorization') authToken: string,
    @Param('id', ParseObjectIdPipe) orgId: Types.ObjectId,
  ) {
    this.authzService.checkSiteRoleAdmin(req);
    return this.organizationAccountService.deleteOrgAccount(authToken, orgId);
  }

  @Put('/:id')
  @ApiOperation({ summary: 'Updates an organization account.' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the organization for which to update the account.',
  })
  @ApiBody({
    required: true,
    description: 'The organization account data to update.',
    // See true type below. The swagger annotations can't use typescript interfaces,
    // so our swagger will be lacking this for now.
    type: Object,
  })
  updateOrganizationAccount(
    @Req() req: Request,
    @Body()
    organizationAccountUpdates: Partial<OrganizationAccountDocument>,
    @Param('id', ParseObjectIdPipe) orgId: Types.ObjectId,
  ) {
    this.authzService.checkSiteRoleAdmin(req);
    return this.organizationAccountService.updateOrganizationAccountById(orgId, organizationAccountUpdates);
  }

  @Put('/:id/details')
  @ApiOperation({ summary: 'Updates an organization account details.' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The id of the organization for which details are to be updated.',
  })
  @ApiBody({
    required: true,
    description: 'The organization account data to update.',
    // See true type below. The swagger annotations can't use typescript interfaces,
    // so our swagger will be lacking this for now.
    type: Object,
  })
  async updateOrganizationAccountDetails(
    @Req() req: Request,
    @Body() organizationAccountUpdates: Partial<OrganizationAccountDocument>,
    @Param('id', ParseObjectIdPipe) orgId: Types.ObjectId,
  ) {
    const organization = await this.authzService.loadOrganizationWithMembers(orgId);
    this.authzService.checkSiteRoleAdminOrOrgRole(req, organization, OrganizationRole.ADMIN);

    const fieldsAllowedForUpdate = ['country', 'currency', 'nace', 'name', 'vat'];
    Object.keys(organizationAccountUpdates).forEach((key) => {
      if (!fieldsAllowedForUpdate.includes(key)) {
        delete organizationAccountUpdates[key];
      }
    });

    return this.organizationAccountService.updateOrganizationAccountById(orgId, organizationAccountUpdates);
  }

  @ApiOperation({ summary: 'Update the properties of a member.' })
  @ApiParam({ name: 'id', description: 'The id of the organization.' })
  @ApiParam({ name: 'userId', description: 'The user id of the member.' })
  @ApiBody({
    required: true,
    description: 'The user id for the member to update.',
    // See true type below. The swagger annotations can't use typescript interfaces,
    // so our swagger will be lacking this for now.
    type: Object,
  })
  @Patch('/:id/members/:userId')
  async updateMember(
    @Req() req: Request,
    @Param('id', ParseObjectIdPipe) orgId: Types.ObjectId,
    @Param('userId', ParseObjectIdPipe) userId: Types.ObjectId,
  ) {
    const organization = await this.authzService.loadOrganizationWithMembers(orgId);
    this.authzService.checkSiteRoleAdminOrOrgRole(req, organization, OrganizationRole.ADMIN);

    const { role } = req.body;
    return this.organizationAccountService.updateUsersOrganizationRole(organization, userId, role);
  }

  @ApiOperation({ summary: 'Delete a user from an organization.' })
  @ApiParam({ name: 'id', description: 'The id of the organization.' })
  @ApiParam({ name: 'userId', description: 'The user id of the member to remove.' })
  @Delete('/:id/user/:userId')
  @HttpCode(204)
  async deleteMember(
    @Req() req: Request,
    @Param('id', ParseObjectIdPipe) orgId: Types.ObjectId,
    @Param('userId', ParseObjectIdPipe) userId: Types.ObjectId,
  ) {
    const organization = await this.authzService.loadOrganizationWithMembers(orgId);
    this.authzService.checkSiteRoleAdminOrOrgRole(req, organization, OrganizationRole.ADMIN);

    await this.organizationAccountService.removeUserFromOrganization(organization, userId);
  }
}
