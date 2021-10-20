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
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, ParseObjectIdPipe, SentryTraceInterceptor } from '@normative/utils';
import { Request } from 'express';
import { Types } from 'mongoose';

import { CalculatedImpactService } from '../calculatedImpact/calculatedImpact.service';

import { EntryService } from './entry/entry.service';
import { StarterImpactResponse } from './impact.model';
import { StarterAuthzService } from './starter.authz.service';
import { EntrySubmissionDataDto } from './starter.dto';
import { StarterService } from './starter.service';

@Controller()
@UseInterceptors(SentryTraceInterceptor)
@UseGuards(JwtAuthGuard)
export class StarterController {
  private readonly logger = new Logger(StarterController.name);
  constructor(
    private readonly calculatedImpactService: CalculatedImpactService,
    private readonly starterService: StarterService,
    private readonly entryService: EntryService,
    private readonly authzService: StarterAuthzService,
  ) {}

  @ApiOperation({ summary: 'Get the wizard entries for the given organization id' })
  @Get('starter/:orgId/entries')
  @ApiParam({
    name: 'orgId',
    required: true,
    description: 'The id of the organization for which to retrieve the organization entries.',
  })
  async getStarterEntries(@Req() request, @Param('orgId', ParseObjectIdPipe) orgId: Types.ObjectId) {
    this.logger.log(`User ${request.user?.userDoc?._id} requests starter entries for organization ${orgId}`);
    await this.authzService.checkUserIsAdminOnStarterOrg(request, orgId);
    return this.entryService.getStarterEntries(orgId);
  }

  @ApiOperation({ summary: 'Save a new wizard entry for the given organization id' })
  @Post('starter/:orgId/entries')
  @ApiParam({
    name: 'orgId',
    required: true,
    description: 'The id of the organization for which to retrieve the organization entries.',
  })
  async createStarterEntry(
    @Req() req: Request,
    @Headers('Authorization') authToken: string,
    @Param('orgId', ParseObjectIdPipe) orgId: Types.ObjectId,
    @Body() starterData: EntrySubmissionDataDto,
  ) {
    this.logger.log(`User ${req.user?.userDoc?._id} posts a new starter entry for organization ${orgId}`);
    const [user] = await this.authzService.checkUserIsAdminOnStarterOrg(req, orgId);
    // TODO: Make this robust to partial failure. Maybe move data-upload & report creation to a queued task.
    const dataRefs = await this.starterService.submitStarterData(authToken, orgId, starterData);
    return await this.entryService.createStarterEntry(user.userDoc._id, orgId, starterData, dataRefs);
  }

  @ApiOperation({ summary: 'Update an existing wizard entry for the given organization id' })
  @Put('starter/:orgId/entries/:entryId')
  @ApiParam({
    name: 'orgId',
    required: true,
    description: 'The id of the organization for which to retrieve the organization entries.',
  })
  @ApiParam({
    name: 'entryId',
    required: true,
    description: 'The id of the entry to update.',
  })
  async updateStarterEntry(
    @Req() req: Request,
    @Headers('Authorization') authToken: string,
    @Param('orgId', ParseObjectIdPipe) orgId: Types.ObjectId,
    @Param('entryId', ParseObjectIdPipe) entryId: Types.ObjectId,
    @Body() starterData: EntrySubmissionDataDto,
  ) {
    const [user] = await this.authzService.checkUserIsAdminOnStarterOrg(req, orgId);
    // TODO: Make this robust to partial failure. Maybe move data-upload & report creation to a queued task.
    const dataRefs = await this.starterService.submitStarterData(authToken, orgId, starterData);
    return await this.entryService.updateStarterEntry(
      authToken,
      user.userDoc._id,
      orgId,
      entryId,
      starterData,
      dataRefs,
    );
  }

  @ApiOperation({ summary: 'Resubmit the given wizard entry for the given organization id' })
  @Post('starter/:orgId/entries/:entryId/resubmit')
  @ApiParam({
    name: 'orgId',
    required: true,
    description: 'The id of the organization for which to retrieve the organization entries.',
  })
  @ApiParam({
    name: 'entryId',
    required: true,
    description: 'The id of the entry to resubmit.',
  })
  async resubmitStarterEntry(
    @Req() req: Request,
    @Headers('Authorization') authToken: string,
    @Param('orgId', ParseObjectIdPipe) orgId: Types.ObjectId,
    @Param('entryId', ParseObjectIdPipe) entryId: Types.ObjectId,
  ) {
    const [user] = await this.authzService.checkUserIsAdminOnStarterOrg(req, orgId);
    const starterEntry = await this.entryService.getStarterEntry(orgId, entryId);
    const starterData = starterEntry.rawClientState;
    const dataRefs = await this.starterService.submitStarterData(authToken, orgId, starterData);
    return await this.entryService.updateStarterEntry(
      authToken,
      user.userDoc._id,
      orgId,
      entryId,
      starterData,
      dataRefs,
    );
  }

  @ApiOperation({ summary: 'Get the wizard entry for the given organization id and entry id' })
  @Get('starter/:orgId/entries/:entryId')
  @ApiParam({
    name: 'orgId',
    required: true,
    description: 'The id of the organization for which to retrieve the wizard entry.',
  })
  @ApiParam({
    name: 'entryId',
    required: true,
    description: 'The wizard entry id submitted by the organization that needs to be fetched.',
  })
  async getStarterEntry(
    @Req() request: Request,
    @Param('orgId', ParseObjectIdPipe) orgId: Types.ObjectId,
    @Param('entryId', ParseObjectIdPipe) entryId: Types.ObjectId,
  ) {
    await this.authzService.checkUserIsAdminOnStarterOrg(request, orgId);
    return this.entryService.getStarterEntry(orgId, entryId);
  }

  @ApiOperation({ summary: 'Get the emissions estimate for the given organization id and entry id' })
  @Get('starter/:orgId/entries/:entryId/impact')
  @ApiParam({
    name: 'orgId',
    required: true,
    description: 'The id of the organization for which to retrieve the wizard entry impact.',
  })
  @ApiParam({
    name: 'entryId',
    required: true,
    description: 'The wizard entry id submitted by the organization that needs to be fetched.',
  })
  async getStarterEntryImpact(
    @Headers('Authorization') authToken: string,
    @Req() request: Request,
    @Param('orgId', ParseObjectIdPipe) orgId: Types.ObjectId,
    @Param('entryId', ParseObjectIdPipe) entryId: Types.ObjectId,
  ): Promise<StarterImpactResponse> {
    await this.authzService.checkUserIsAdminOnStarterOrg(request, orgId);
    this.logger.log(
      `User ${request.user?.userDoc?._id} requests impact for starter entry ${entryId} for organization ${orgId}`,
    );
    // TODO: Project in the query to only fetch the datasource IDs?
    const { dataSources } = await this.entryService.getStarterEntry(orgId, entryId);

    let calculationComplete: boolean;
    if (dataSources && dataSources.length) {
      calculationComplete = await this.calculatedImpactService.isCalculationCompleteForDataSources(
        authToken,
        dataSources,
      );
    } else {
      calculationComplete = true;
    }

    const impact = await this.calculatedImpactService.getImpactForDataSources(orgId, dataSources ?? []);
    return {
      starterEntryId: entryId.toHexString(),
      emissionCalculation: impact,
      calculationComplete,
    };
  }

  @Delete('starter/:orgId/entries')
  @ApiOperation({ summary: 'Deletes the starter entries for an organization account.' })
  @ApiParam({
    name: 'orgId',
    required: true,
    description: 'The id of the organization for which to delete the starter entries.',
  })
  async deleteStarterEntries(
    @Req() req: Request,
    @Headers('Authorization') authToken: string,
    @Param('orgId', ParseObjectIdPipe) orgId: Types.ObjectId,
  ) {
    // TODO: Ideally the check should be checkSiteRoleAdminOrOrgRole, but since it's not available in StarterAuthzService - this should be updated separately.
    await this.authzService.checkUserIsAdminOnStarterOrg(req, orgId);
    return this.entryService.deleteStarterEntries(orgId);
  }
}
