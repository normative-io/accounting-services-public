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
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DataSourceType } from '@normative/json-schemas';
import {
  AppConfigService,
  Environment,
  IReport,
  IReportTemplate,
  NormativeServerSDKService,
  OrganizationAccount,
} from '@normative/utils';
import FormData from 'form-data';
import moment from 'moment';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import { ElectricityParser } from './parser/electricity.parser';
import { ExpensesParser } from './parser/expenses.parser';
import { FuelParser } from './parser/fuel.parser';
import { HeatingParser } from './parser/heating.parser';
import { EntrySubmissionData, NormativeDataRefs, TimePeriod } from './starter.model';
import { DataSourceRows } from './utils';

const STARTER_REPORT_TEMPLATE_HEADER_NAME = 'Starter';

@Injectable()
export class StarterService {
  // URL to the server, *including* the scheme (e.g., https://), *excluding* the path (e.g., /api/...).
  private normativeServerUrl: string;
  private reportTemplateId: string | null = null;
  private readonly logger = new Logger(StarterService.name);

  constructor(
    private appConfigService: AppConfigService,
    private httpService: HttpService,
    private normativeServerSdkService: NormativeServerSDKService,
    private electricityParser: ElectricityParser,
    private expensesParser: ExpensesParser,
    private fuelParser: FuelParser,
    private heatingParser: HeatingParser,
    @InjectModel(OrganizationAccount.name)
    private readonly organizationAccountModel: Model<OrganizationAccount>,
  ) {
    this.normativeServerUrl = this.appConfigService.getRequired(Environment.NORMATIVE_SERVER_URL);
  }

  /**
   * Takes the starter questionnaire data, and transforms this data into dataSources supported by the normative-server API.
   *
   * @param authToken the token needed for authentication & authorisation
   * @param starterData The data from the starter questionnaire.
   * @returns A JSON string of parsed data, useful during development.
   * TODO create a normative-server client and stop passing this auth token around. - See normative-ts-worker.
   */
  async submitStarterData(
    authToken: string,
    organizationAccountId: Types.ObjectId,
    starterData: EntrySubmissionData,
  ): Promise<NormativeDataRefs> {
    const org = await this.organizationAccountModel.findById(organizationAccountId);
    if (!org) {
      throw new NotFoundException(`Organization ${organizationAccountId} was not found.`);
    }
    if (!org.country) {
      throw new BadRequestException(`Organization ${organizationAccountId} does not have a country recorded.`);
    }

    // Parse the dataSources from the starter request
    const uploads: Promise<Types.ObjectId>[] = [];
    const addSource = (dataType: DataSourceType, rows: DataSourceRows | null) => {
      if (rows) {
        uploads.push(
          this.processDataSource(dataType, rows, authToken, organizationAccountId).then((x) => x.dataSourceId),
        );
      }
    };

    addSource('fuel', this.fuelParser.parseFuelData(starterData));
    addSource('heating', this.heatingParser.parseHeatingData(org.country, starterData));
    addSource('electricity', this.electricityParser.parseElectricityData(org.country, starterData));
    addSource('transaction', this.expensesParser.parseExpensesData(starterData));

    let dataSources;
    try {
      dataSources = await Promise.all(uploads);
    } catch (error) {
      this.logger.error(`Error uploading the dataSources. ${error}`);
      throw new InternalServerErrorException();
    }
    // We used to create a report here, but this request would take too long and it was not needed for the result.
    // We still might want to do this in the future though.
    const reportId: Types.ObjectId | undefined = undefined;

    return {
      dataSources,
      reportId,
    };
  }

  private getDataSourceUrl = (organizationId: Types.ObjectId) =>
    `${this.normativeServerUrl}/api/organizationAccounts/${organizationId.toHexString()}/datasources`;
  private getRowsUrl = (dataSourceId: Types.ObjectId) =>
    `${this.normativeServerUrl}/api/dataSources/${dataSourceId.toHexString()}/rows`;

  /**
   * Creates a new dataSource file, and form data containing this file,
   * and posts it to the organizations's dataSources endpoint.
   *
   * @param authToken The auth Token from the original starter request. User must be a member of the organization.
   * @param filename  The filename that should be given to the generated file.
   * @param dataSourceType The data source type for the file uploaded.
   * @param data The data for the file uploaded. Should be JSON serializable.
   * @returns The document ID for the document uploaded.
   */
  private async postNewDataSource(
    authToken: string,
    organizationAccountId: Types.ObjectId,
    filename: string,
    dataSourceType: DataSourceType,
    data,
  ): Promise<Types.ObjectId> {
    const formData = new FormData();
    formData.append('dataSourceType', dataSourceType);
    formData.append('name', filename);
    formData.append('fileType', 'json');
    const buffer = Buffer.from(JSON.stringify(data), 'utf8');

    formData.append('file', buffer, {
      filepath: `${filename}.json`,
      contentType: 'application/json',
      knownLength: buffer.length,
    });
    const dataSourceResponse = await firstValueFrom(
      this.httpService.post(this.getDataSourceUrl(organizationAccountId), formData, {
        headers: {
          Authorization: authToken,
          ...formData.getHeaders(),
        },
      }),
    );
    const id = dataSourceResponse.data?._id;
    if (!id) {
      throw new InternalServerErrorException(
        `error when uploading data source of type ${dataSourceType} for org ${organizationAccountId}`,
      );
    }
    return new Types.ObjectId(id);
  }

  private async addRows(dataSourceId: Types.ObjectId, rows: DataSourceRows, authToken: string) {
    return await firstValueFrom(
      this.httpService.put(this.getRowsUrl(dataSourceId), rows, {
        headers: {
          Authorization: authToken,
          'Content-Type': 'application/json; charset=utf-8',
        },
      }),
    );
  }

  private async processDataSource(
    dataSourceType: DataSourceType,
    rows: DataSourceRows,
    authToken: string,
    organizationAccountId: Types.ObjectId,
  ) {
    this.logger.log(`Uploading new dataSource of type ${dataSourceType} for organization ${organizationAccountId}`);
    const dataSourceId = await this.postNewDataSource(
      authToken,
      organizationAccountId,
      `${dataSourceType}Data.json`,
      dataSourceType,
      rows,
    );
    this.logger.log(`dataSource created with ID ${dataSourceId}. Adding rows..`);
    const addRowsResult = await this.addRows(dataSourceId, rows, authToken);
    this.logger.log(`${JSON.stringify(addRowsResult?.data?.insertCount)} rows added.`);

    return {
      dataSourceId,
      addRowsResult: addRowsResult.data,
    };
  }

  private async postNewStarterReport(
    authToken: string,
    organizationAccountId: Types.ObjectId,
    timePeriod: TimePeriod,
    dataSources: Types.ObjectId[],
  ): Promise<Types.ObjectId> {
    const starterTemplateId = await this.findStarterReportTemplate(authToken);
    const startMoment = moment.utc(timePeriod.startDate, moment.ISO_8601, true).startOf('date');
    const endMoment = moment.utc(timePeriod.endDate, moment.ISO_8601, true).endOf('date');
    const startDateDisplay = startMoment.format('YYYY-MM-DD');
    const endDateDisplay = endMoment.format('YYYY-MM-DD');
    const report: IReport = {
      name: `Starter ${startDateDisplay} to ${endDateDisplay} (submitted at ${moment().toISOString()})`,
      reportSection: starterTemplateId,
      dataSources: dataSources.map((x) => x.toString()),
      startDate: startMoment.toDate(),
      endDate: endMoment.toDate(),
    };
    const fullReport = await this.normativeServerSdkService.postReport(
      authToken,
      organizationAccountId.toHexString(),
      report,
    );
    const id = fullReport._id;
    if (!id) {
      throw new InternalServerErrorException(`error when creating report for org ${organizationAccountId}`);
    }
    return new Types.ObjectId(id);
  }

  private async findStarterReportTemplate(authToken: string): Promise<string> {
    if (this.reportTemplateId !== null) {
      return this.reportTemplateId;
    }

    this.logger.debug(`Retrieving Starter report template ID by lookup on normative server.`);
    const templates = await this.normativeServerSdkService.getReportTemplates(authToken);
    this.logger.debug(`Normative server returned ${templates.length} report template records`);
    const starterTemplate = templates.find(
      (t: IReportTemplate): boolean => t.header === STARTER_REPORT_TEMPLATE_HEADER_NAME,
    );
    if (starterTemplate) {
      this.logger.debug(`Starter template record has ID ${starterTemplate._id}`);
      this.reportTemplateId = starterTemplate._id;
      return starterTemplate._id;
    } else {
      throw new InternalServerErrorException(
        `could not find the '${STARTER_REPORT_TEMPLATE_HEADER_NAME}' report template`,
      );
    }
  }
}
