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

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import {
  AppConfigModule,
  NormativeServerSDKService,
  rootMongooseTestModule,
  stopInMemoryMongoDb,
} from '@normative/utils';
import { Model, Types } from 'mongoose';

import { StarterEntry, StarterEntrySchema } from '../starter/entry/entry.schema';

import { CalculatedImpact, CalculatedImpactSchema } from './calculatedImpact.schema';
import { CalculatedImpactService } from './calculatedImpact.service';
import { createDataSource, createImpact } from './calculatedImpact.test.utils';

const ObjectId = Types.ObjectId;
type ObjectId = Types.ObjectId;

const CO2_KG_UNIT = 'co2 kg';
const TEST_AUTH_TOKEN = 'auth_token';

describe('CalculatedImpactService', () => {
  let service: CalculatedImpactService;
  let calculatedImpactModel: Model<CalculatedImpact>;
  let normativeServerService: NormativeServerSDKService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CalculatedImpactService],
      imports: [
        AppConfigModule.register({
          secretsPath: '/run/secrets/data-upload',
        }),
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: CalculatedImpact.name, schema: CalculatedImpactSchema },
          { name: StarterEntry.name, schema: StarterEntrySchema },
        ]),
      ],
    })
      .useMocker((token) => {
        if (token === NormativeServerSDKService) {
          return { getDataSource: jest.fn() };
        }
        return undefined;
      })
      .compile();
    service = module.get<CalculatedImpactService>(CalculatedImpactService);
    calculatedImpactModel = module.get(getModelToken(CalculatedImpact.name));
    normativeServerService = module.get<NormativeServerSDKService>(NormativeServerSDKService);
  });

  afterAll(async () => {
    await stopInMemoryMongoDb();
  });

  describe('getImpactForDataSources', () => {
    it('should return a response with the a single scope and total', async () => {
      expect.assertions(6);
      // GIVEN the following impacts in the database
      const organizationId = new ObjectId();
      const dataSourceId = new ObjectId();
      await new calculatedImpactModel(
        createImpact({ organizationId, scope: 'Scope 1', co2Value: 600, sourceId: dataSourceId }),
      ).save();
      // WHEN we fetch the impact for the dataSource
      const response = await service.getImpactForDataSources(organizationId, [dataSourceId]);

      // THEN the response should have the same Scope 1 emissions and total emissions.
      const totalEmissions = response.totalEmissions;
      const emissionsByScope = response.emissionsByScope;
      expect(totalEmissions.value).toEqual(600);
      expect(totalEmissions.unit).toEqual(CO2_KG_UNIT);

      expect(emissionsByScope.length).toEqual(1);

      expect(emissionsByScope[0].scope).toEqual('Scope 1');
      expect(emissionsByScope[0].emission.unit).toEqual(CO2_KG_UNIT);
      expect(emissionsByScope[0].emission.value).toEqual(600);
    });

    it('should return a response with all the scopes and a total', async () => {
      expect.assertions(9);
      // GIVEN the following impacts in the database; one for each scope
      const organizationId = new ObjectId();
      const dataSources = [new ObjectId(), new ObjectId(), new ObjectId()];
      await new calculatedImpactModel(
        createImpact({ organizationId, scope: 'Scope 1', co2Value: 600, sourceId: dataSources[0] }),
      ).save();
      await new calculatedImpactModel(
        createImpact({ organizationId, scope: 'Scope 2', co2Value: 400, sourceId: dataSources[1] }),
      ).save();
      await new calculatedImpactModel(
        createImpact({ organizationId, scope: 'Scope 3', co2Value: 500, sourceId: dataSources[2] }),
      ).save();
      // WHEN we fetch the impact for the dataSources
      const response = await service.getImpactForDataSources(organizationId, dataSources);

      // THEN the response should have the corresponding emissions for each scope and the correctly summed total emissions.
      const totalEmissions = response.totalEmissions;
      const emissionsByScope = response.emissionsByScope;
      expect(totalEmissions.value).toEqual(1500);
      expect(totalEmissions.unit).toEqual(CO2_KG_UNIT);

      expect(emissionsByScope.length).toEqual(3);

      const scope1Emissions = emissionsByScope.find((x) => x.scope === 'Scope 1');
      expect(scope1Emissions!.emission.value).toEqual(600);
      expect(scope1Emissions!.emission.unit).toEqual(CO2_KG_UNIT);

      const scope2Emissions = emissionsByScope.find((x) => x.scope === 'Scope 2');
      expect(scope2Emissions!.emission.value).toEqual(400);
      expect(scope2Emissions!.emission.unit).toEqual(CO2_KG_UNIT);

      const scope3Emissions = emissionsByScope.find((x) => x.scope === 'Scope 3');
      expect(scope3Emissions!.emission.value).toEqual(500);
      expect(scope3Emissions!.emission.unit).toEqual(CO2_KG_UNIT);
    });

    it('should sum multiple impacts within the same scope', async () => {
      expect.assertions(4);
      // GIVEN the following impacts in the database; two for scope 3 and one for scope 1.
      const organizationId = new ObjectId();
      const dataSources = [new ObjectId(), new ObjectId(), new ObjectId()];
      await new calculatedImpactModel(
        createImpact({ organizationId, scope: 'Scope 1', co2Value: 600, sourceId: dataSources[0] }),
      ).save();
      await new calculatedImpactModel(
        createImpact({ organizationId, scope: 'Scope 3', co2Value: 400, sourceId: dataSources[1] }),
      ).save();
      await new calculatedImpactModel(
        createImpact({ organizationId, scope: 'Scope 3', co2Value: 500, sourceId: dataSources[2] }),
      ).save();
      // WHEN we fetch the impact for the dataSources
      const response = await service.getImpactForDataSources(organizationId, dataSources);

      // THEN the response should have the correctly summed scope 1 emissions, the correct scope 3 emissions and the correctly summed total.
      const totalEmissions = response.totalEmissions;
      const emissionsByScope = response.emissionsByScope;
      expect(totalEmissions.value).toEqual(1500);

      expect(emissionsByScope.length).toEqual(2);

      const scope1Emissions = emissionsByScope.find((x) => x.scope === 'Scope 1');
      expect(scope1Emissions!.emission.value).toEqual(600);

      const scope3Emissions = emissionsByScope.find((x) => x.scope === 'Scope 3');
      expect(scope3Emissions!.emission.value).toEqual(900);
    });

    it('should return a result from only the selected sources', async () => {
      expect.assertions(6);
      // GIVEN impacts for multiple data sources
      const sourceIds = [new ObjectId(), new ObjectId(), new ObjectId()];
      const organizationId = new ObjectId();
      await new calculatedImpactModel(
        createImpact({ organizationId, scope: 'Scope 1', co2Value: 100, sourceId: sourceIds[0] }),
      ).save();
      await new calculatedImpactModel(
        createImpact({ organizationId, scope: 'Scope 1', co2Value: 20, sourceId: sourceIds[1] }),
      ).save();
      await new calculatedImpactModel(
        createImpact({ organizationId, scope: 'Scope 1', co2Value: 4, sourceId: sourceIds[2] }),
      ).save();
      // WHEN we fetch the impact for the first two sources
      const response = await service.getImpactForDataSources(organizationId, sourceIds.slice(0, 2));

      // THEN the response should be the aggregation of the specified sources.
      const totalEmissions = response.totalEmissions;
      const emissionsByScope = response.emissionsByScope;
      expect(totalEmissions.value).toEqual(120);
      expect(totalEmissions.unit).toEqual(CO2_KG_UNIT);

      expect(emissionsByScope.length).toEqual(1);

      expect(emissionsByScope[0].scope).toEqual('Scope 1');
      expect(emissionsByScope[0].emission.unit).toEqual(CO2_KG_UNIT);
      expect(emissionsByScope[0].emission.value).toEqual(120);
    });

    it('should include a breakdown by category', async () => {
      // GIVEN the following impacts in the database; two for scope 3 and one for scope 1.
      const organizationId = new ObjectId();
      const dataSourceId = new ObjectId();
      const impacts = [
        createImpact({ organizationId, scope: 'Scope 1', co2Value: 10, category: 'c1', sourceId: dataSourceId }),
        createImpact({ organizationId, scope: 'Scope 1', co2Value: 20, category: 'c2', sourceId: dataSourceId }),
        createImpact({ organizationId, scope: 'Scope 1', co2Value: 30, category: 'c2', sourceId: dataSourceId }),
        createImpact({ organizationId, scope: 'Scope 2', co2Value: 40, category: 'c3', sourceId: dataSourceId }),
        createImpact({ organizationId, scope: 'Scope 2', co2Value: 50, category: 'c3', sourceId: dataSourceId }),
        createImpact({ organizationId, scope: 'Scope 2', co2Value: 60, category: 'c3', sourceId: dataSourceId }),
        createImpact({ organizationId, scope: 'Scope 3', co2Value: 70, category: 'c4', sourceId: dataSourceId }),
        createImpact({ organizationId, scope: 'Scope 3', co2Value: 80, category: 'c5', sourceId: dataSourceId }),
        createImpact({ organizationId, scope: 'Scope 3', co2Value: 90, category: 'c6', sourceId: dataSourceId }),
      ];
      await Promise.all(impacts.map((x) => new calculatedImpactModel(x).save()));

      // WHEN we request the impacts for the dataSource
      const response = await service.getImpactForDataSources(organizationId, [dataSourceId]);

      // THEN the catefory breakdowns exist for each scope and are correctly summed.
      const totalEmissions = response.totalEmissions;
      const emissionsByScope = response.emissionsByScope;
      const scope1Emissions = emissionsByScope.find((x) => x.scope === 'Scope 1');
      const scope2Emissions = emissionsByScope.find((x) => x.scope === 'Scope 2');
      const scope3Emissions = emissionsByScope.find((x) => x.scope === 'Scope 3');
      expect(totalEmissions.value).toEqual(450);

      expect(scope1Emissions!.emission.value).toEqual(60);
      expect(scope1Emissions!.categoryBreakdown).toEqual(
        expect.arrayContaining([
          {
            category: 'c1',
            emission: {
              unit: CO2_KG_UNIT,
              value: 10,
            },
          },
          {
            category: 'c2',
            emission: {
              unit: CO2_KG_UNIT,
              value: 50,
            },
          },
        ]),
      );
      expect(scope2Emissions!.emission.value).toEqual(150);
      expect(scope2Emissions!.categoryBreakdown).toEqual([
        {
          category: 'c3',
          emission: {
            unit: CO2_KG_UNIT,
            value: 150,
          },
        },
      ]);
      expect(scope3Emissions!.emission.value).toEqual(240);
      expect(scope3Emissions!.categoryBreakdown).toEqual(
        expect.arrayContaining([
          {
            category: 'c4',
            emission: {
              unit: CO2_KG_UNIT,
              value: 70,
            },
          },
          {
            category: 'c5',
            emission: {
              unit: CO2_KG_UNIT,
              value: 80,
            },
          },
          {
            category: 'c6',
            emission: {
              unit: CO2_KG_UNIT,
              value: 90,
            },
          },
        ]),
      );
    });
  });

  describe('isCalculationCompleteForDataSources', () => {
    it('should return true if all dataSources have completed calculation', async () => {
      // Given a mock getDataSource that always returns with a status of succeeded
      jest
        .spyOn(normativeServerService, 'getDataSource')
        .mockImplementation((authToken: string, dataSourceId: ObjectId) =>
          Promise.resolve(createDataSource({ id: dataSourceId, status: 'succeeded' })),
        );

      // WHEN we check the status for multiple dataSources
      const result = await service.isCalculationCompleteForDataSources(TEST_AUTH_TOKEN, [
        new ObjectId(),
        new ObjectId(),
        new ObjectId(),
      ]);

      // THEN we expect the result to be true
      expect(result).toEqual(true);
    });

    it('should treat failed as completed', async () => {
      // Given a mock getDataSource that always returns with a status of failed
      jest
        .spyOn(normativeServerService, 'getDataSource')
        .mockImplementation((authToken: string, dataSourceId: ObjectId) =>
          Promise.resolve(createDataSource({ id: dataSourceId, status: 'failed' })),
        );

      // WHEN we check the status for multiple dataSources
      const result = await service.isCalculationCompleteForDataSources(TEST_AUTH_TOKEN, [new ObjectId()]);

      // THEN we expect the result to be true
      expect(result).toEqual(true);
    });

    it('should return false if one of the dataSources has incompleted calculation status', async () => {
      // Given a mock getDataSource that returns pending for one dataSource.
      const inProgressDataSource = new ObjectId();
      jest
        .spyOn(normativeServerService, 'getDataSource')
        .mockImplementation((authToken: string, dataSourceId: ObjectId) => {
          return Promise.resolve(
            createDataSource({
              id: dataSourceId,
              status: dataSourceId === inProgressDataSource ? 'pending' : 'succeeded',
            }),
          );
        });

      // WHEN we check the status for multiple dataSources, including the one with calculation ongoing.
      const result = await service.isCalculationCompleteForDataSources(TEST_AUTH_TOKEN, [
        new ObjectId(),
        inProgressDataSource,
        new ObjectId(),
      ]);

      // THEN we expect the result to be false
      expect(result).toEqual(false);
    });
  });
});
