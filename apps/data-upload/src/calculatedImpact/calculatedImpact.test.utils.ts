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

import { IDataSource } from '@normative/utils';
import { Types } from 'mongoose';

const ObjectId = Types.ObjectId;
type ObjectId = Types.ObjectId;

// Extend parameters as needed to create impacts for testing.
// Use defaults to keep the method as flexible as possible.
export function createImpact({
  organizationId,
  co2Value,
  scope = 'Scope 1',
  category = 'Facility fuel and vehicle emissions',
  sourceId = null,
}: {
  organizationId: Types.ObjectId;
  co2Value: number;
  scope: string;
  category?: string;
  sourceId?: Types.ObjectId | null;
}) {
  sourceId = sourceId ?? new ObjectId();
  return {
    impacts: {
      source: sourceId,
      indicator: 'Global warming',
      value: co2Value,
      ghgDieselCars: 11.530108857001485,
      emissionsSpendIntesity: 1.8592201637225336,
    },
    _id: new ObjectId(),
    details: {
      _id: new ObjectId(),
      isValid: true,
      supplier: 'unknownHeatingSupplier',
      startDate: '2020-01-01T00:00:00.000Z',
      endDate: '2020-12-31T00:00:00.000Z',
      address: 'Unknown Address',
      country: 'SE',
      area: 1000,
      areaUnit: 'm^2',
      organization: organizationId,
      source: sourceId,
      createdAt: '2021-12-03T08:24:29.235Z',
      lastUpdated: '2021-12-03T08:24:29.235Z',
      calculatedProperties: ['cost', 'costUnit', 'energy', 'energyUnit', 'currency', 'normId', 'ghg', 'ghgUnit'],
      cost: 12533.4,
      costUnit: 'EUR',
      energy: 135000,
      energyUnit: 'kWh',
      ghg: 23302.350000000002,
      ghgUnit: 'kg CO2-eq.',
      normId: '02010100000000',
      normalCost: 128748.7224997402,
      normalCurrency: 'SEK',
      renewable: 0,
      volume: 0,
      distance: 0,
      distanceUnit: 'Unknown',
      distancePassenger: 0,
      distancePassengerUnit: 'Unknown',
      distanceWeight: 0,
      distanceWeightUnit: 'Unknown',
      ghgLocationBased: 0,
      fuelType: 'Unknown',
      vehicleType: 'Unknown',
      transportMode: 'Unknown',
      wasteType: 'Unknown',
      weight: 0,
      weightUnit: 'Unknown',
      productType: 'Unknown',
      travelMode: 'Unknown',
      hazardous: null,
      itemsTransported: 0,
      materialOrigin: 'Unknown',
      renewablePercent: 0,
    },
    supplier: { nace: '352', name: 'unknownHeatingSupplier', country: 'SE' },
    transaction: {
      organization: organizationId,
      _id: new ObjectId(),
      date: '2020-01-01T00:00:00.000Z',
      cost: 12533.4,
      currency: 'EUR',
      costCenter: 'Unknown',
      costCenterCode: 'Unknown',
      source: sourceId,
      country: 'SE',
      supplierName: 'unknownHeatingSupplier',
    },
    activity: {
      scope: `${scope} : Heat`,
      ghgScope: scope,
      category,
      normId: '02010100000000',
      description: 'District heat',
      date: '2020-01-01T00:00:00.000Z',
      cost: 12533.4,
      currency: 'EUR',
      country: 'SE',
      type: 'Unknown',
      scope3category: 'Unknown',
      year: '2020',
      yearMonth: '2020-01',
    },
    updatedAt: '2022-01-26T07:34:46.074Z',
    createdAt: '2022-01-26T07:34:46.074Z',
  };
}

export function createDataSource({ id, status }: { id?: ObjectId; status?: string }): IDataSource {
  return {
    _id: new ObjectId().toString(),
    origin: '',
    count: 4,
    dataSourceType: 'electricity',
    name: '',
    fileType: '',
    organization: new ObjectId(),
    status: status ?? 'pending',
    createdAt: new Date(),
    lastUpdate: new Date(),
  };
}
