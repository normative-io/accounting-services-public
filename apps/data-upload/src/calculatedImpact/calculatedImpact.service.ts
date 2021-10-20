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
import { InjectModel } from '@nestjs/mongoose';
import { NormativeServerSDKService } from '@normative/utils';
import _ from 'lodash';
import { Model, Types } from 'mongoose';

import { EmissionCalculation, EmissionsByCategory, EmissionsByScope } from '../starter/impact.model';

import { CalculatedImpact } from './calculatedImpact.schema';

const ObjectId = Types.ObjectId;
type ObjectId = Types.ObjectId;
const CO2KGS = 'co2 kg';

@Injectable()
export class CalculatedImpactService {
  private readonly logger = new Logger(CalculatedImpactService.name);
  constructor(
    @InjectModel(CalculatedImpact.name) private calculatedImpactModel: Model<CalculatedImpact>,
    private normativeServerService: NormativeServerSDKService,
  ) {}

  /**
   * Returns the calculated impact for list of data sources
   *
   * @param organizationAccountId The organizationAccount that owns the dataSources
   * @param dataSources The dataSource Ids to include.
   * @returns  An emissions calculation, summed from the impacts for all dataSources.
   */
  async getImpactForDataSources(
    organizationAccountId: ObjectId,
    dataSources: ObjectId[],
  ): Promise<EmissionCalculation> {
    // Although sources on their own are enough to find the records, including the organizationAccountId allows use of an index.
    this.logger.log(`Fetching calculated impacts for ${dataSources.length} dataSources from the database.`);
    this.logger.debug(`dataSources:  ${dataSources}`);
    const calculatedImpacts = await this.calculatedImpactModel.find({
      'transaction.organization': organizationAccountId,
      'transaction.source': { $in: dataSources },
    });
    this.logger.log(`Found ${calculatedImpacts.length} calulcated impacts.`);

    return this.aggregateImpacts(calculatedImpacts);
  }

  /**
   * Returns true iff all dataSources have status "succeeded".
   *
   * @param authToken The user's auth token, forwarded to normative-server.
   * @param dataSourceIds The data source ids to check
   */
  async isCalculationCompleteForDataSources(authToken: string, dataSourceIds: ObjectId[]): Promise<boolean> {
    const dataSourceGets = dataSourceIds.map((id) => this.normativeServerService.getDataSource(authToken, id));
    const dataSources = await Promise.all(dataSourceGets);
    return dataSources.every((dataSource) => {
      this.logger.log(`DataSource ${dataSource._id} has status ${dataSource.status}`);
      return dataSource.status === 'succeeded' || dataSource.status === 'failed';
    });
  }

  private sumEmissions(impacts: CalculatedImpact[]): number {
    return impacts.map((i) => i.impacts?.value ?? 0).reduce((a, b) => a + b, 0);
  }

  private getEmissionsByCategory(impacts: CalculatedImpact[]): EmissionsByCategory[] {
    const impactsByCategory = _.groupBy(impacts, (x) => x.activity?.category ?? 'unknown');
    return Object.entries(impactsByCategory).map(([category, impactsForCategory]) => ({
      category,
      emission: {
        unit: CO2KGS,
        value: this.sumEmissions(impactsForCategory),
      },
    }));
  }

  private aggregateImpacts(calculatedImpacts: CalculatedImpact[]): EmissionCalculation {
    // Data Transform
    // Group impacts by scope
    const calculatedImpactsByScope = _.groupBy(calculatedImpacts, (x) => x.activity?.ghgScope ?? 'unknown');

    // Map + Reduce to an array of EmissionsByScope
    const emissionsByScope: EmissionsByScope[] = Object.entries(calculatedImpactsByScope).map(
      ([scope, impactsForScope]) => {
        return {
          scope,
          emission: {
            unit: CO2KGS,
            value: this.sumEmissions(impactsForScope),
          },
          categoryBreakdown: this.getEmissionsByCategory(impactsForScope),
        };
      },
    );

    return {
      totalEmissions: {
        // Sum the EmissionsByScope values to get the total emissions value.
        value: emissionsByScope.map((e) => e.emission.value).reduce((a, b) => a + b, 0),
        unit: CO2KGS,
      },
      emissionsByScope,
    };
  }
}
