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

import { IDataSource, IReport, IReportTemplate } from './normative-server-sdk.interface';

type ObjectId = Types.ObjectId;

// NormativeServerSDKService wraps the Normative Server related APIs.
//
// TODO: Replace this with a 'real' SDK.
//
// Making this an injectable service supports using mock or fake implementations in unit tests.
@Injectable()
export class NormativeServerSDKService {
  // URL to the server, *including* the scheme (e.g., https://), *excluding* the path (e.g., /api/...).
  private normativeServerUrl: string;
  private readonly logger = new Logger(NormativeServerSDKService.name);

  constructor(private httpService: HttpService, configService: AppConfigService) {
    this.normativeServerUrl = configService.getRequired(Environment.NORMATIVE_SERVER_URL);
  }

  async postReport(authToken: string, organizationAccountId: string, reportData: Partial<IReport>): Promise<IReport> {
    const url = `${this.normativeServerUrl}/api/organizationAccounts/${organizationAccountId}/reports`;
    const resp = await firstValueFrom(
      this.httpService.post(url, reportData, {
        headers: {
          Authorization: authToken,
          'Content-Type': 'application/json; charset=utf-8',
        },
      }),
    );
    return resp.data as IReport;
  }

  async getReportTemplates(authToken: string): Promise<IReportTemplate[]> {
    const resp = await firstValueFrom(
      this.httpService.get(`${this.normativeServerUrl}/api/reportTemplates`, {
        headers: { Authorization: authToken },
      }),
    );
    return resp.data as IReportTemplate[];
  }

  async getReports(authToken: string, organizationAccountId: ObjectId): Promise<IReport[]> {
    const url = this.getReportsUrl(organizationAccountId);
    this.logger.debug(`Fetching all reports from ${url}`);
    const resp = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          Authorization: authToken,
        },
      }),
    );
    return resp.data as IReport[];
  }

  async getDataSources(authToken: string, organizationAccountId: ObjectId): Promise<IDataSource[]> {
    const url = this.getDataSourcesUrl(organizationAccountId);
    this.logger.debug(`Fetching all datasources from ${url}`);
    const resp = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          Authorization: authToken,
        },
      }),
    );
    return resp.data as IDataSource[];
  }

  async getDataSource(authToken: string, dataSourceId: ObjectId): Promise<IDataSource> {
    const dataSourceUrl = this.getDataSourceUrl(dataSourceId.toString());
    this.logger.debug(`Fetching dataSource from ${dataSourceUrl}`);
    const resp = await firstValueFrom(
      this.httpService.get(dataSourceUrl, {
        headers: {
          Authorization: authToken,
        },
      }),
    );
    return resp.data as IDataSource;
  }

  // This method doesn't work for deletion to complete.
  async deleteOrgDataSources(authToken: string, organizationAccountId: ObjectId) {
    const dataSources = await this.getDataSources(authToken, organizationAccountId);

    dataSources.forEach(async (dataSource) => {
      try {
        await this.deleteDataSource(authToken, dataSource);
      } catch (error) {
        this.logger.error(
          `Error deleting the dataSources for ${organizationAccountId._id}. Failed with error: ${error}`,
        );
      }
    });
  }

  async deleteDataSource(authToken: string, dataSource: IDataSource): Promise<void> {
    if (!dataSource?._id) {
      this.logger.error(
        `Missing dataSource id for dataSoure and hence won't be able to delete. Data source: ${dataSource}`,
      );
      return;
    }

    const isTransaction = dataSource.dataSourceType === 'transaction';
    const dataSourceId = dataSource._id.toString();
    const dataSourceUrl = this.getDataSourceUrl(dataSourceId, isTransaction);
    this.logger.debug(`Deleting dataSource ${dataSourceId}`);
    try {
      await firstValueFrom(
        this.httpService.delete(dataSourceUrl, {
          headers: {
            Authorization: authToken,
          },
        }),
      );
    } catch (err) {
      this.logger.error(`Error deleting dataSource ${dataSourceId}.`, err);
      throw err;
    }
  }

  async deleteOrgReports(authToken: string, organizationAccountId: ObjectId) {
    const reports = await this.getReports(authToken, organizationAccountId);
    reports.forEach(async (report) => {
      try {
        if (report?._id) {
          await this.deleteReport(authToken, report._id.toString());
        } else {
          this.logger.error(`Missing report id for report and hence won't be able to delete. Report: ${report}`);
        }
      } catch (error) {
        this.logger.error(`Error deleting the report ${report?._id}. Failed with error: ${error}`);
      }
    });
  }

  async deleteReport(authToken: string, reportId: string): Promise<void> {
    const reportUrl = this.getReportUrl(reportId);
    this.logger.debug(`Deleting report ${reportId}`);
    try {
      await firstValueFrom(
        this.httpService.delete(reportUrl, {
          headers: {
            Authorization: authToken,
          },
        }),
      );
    } catch (err) {
      this.logger.error(`Error deleting report ${reportId}`, err);
      throw err;
    }
  }

  // Org data sources
  private getDataSourcesUrl = (organizationAccountId: ObjectId) =>
    `${this.normativeServerUrl}/api/organizationAccounts/${organizationAccountId.toHexString()}/dataSources`;
  private getDataSourceUrl = (dataSourceId, isTransaction?: boolean) =>
    isTransaction
      ? `${this.normativeServerUrl}/api/transactionSources/${dataSourceId}`
      : `${this.normativeServerUrl}/api/dataSources/${dataSourceId}`;

  // Org reports
  private getReportsUrl = (organizationAccountId: ObjectId) =>
    `${this.normativeServerUrl}/api/organizationAccounts/${organizationAccountId.toHexString()}/reports`;
  private getReportUrl = (reportId) => `${this.normativeServerUrl}/api/reports/${reportId}`;
}
