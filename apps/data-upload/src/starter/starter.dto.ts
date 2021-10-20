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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNestedArray, IsNestedObject } from '@normative/utils';
import { IsBoolean, IsDateString, IsInt, IsISO31661Alpha2, IsNumber, IsOptional, IsString } from 'class-validator';

import {
  ElectricityUsage,
  EntrySubmissionData,
  ExpenseUsage,
  FacilitiesUsage,
  FuelUsage,
  HeatingUsage,
  MachineryUsage,
  TimePeriod,
  ValueWithUnit,
} from './starter.model';

export class ValueWithUnitDto implements ValueWithUnit {
  @ApiProperty()
  @IsNumber()
  value: number;

  @ApiProperty()
  @IsString()
  unit: string;
}

export class TimePeriodDto implements TimePeriod {
  @ApiProperty({ description: 'Start date (inclusive), ISO-8601 format (YYYY-MM-DD).' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date (inclusive), ISO-8601 format (YYYY-MM-DD).' })
  @IsDateString()
  endDate: string;
}

export class ElectricityUsageDto implements ElectricityUsage {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  renewablePercent?: number;

  @ApiPropertyOptional()
  @IsNestedObject(ValueWithUnitDto)
  spend?: ValueWithUnitDto;

  @ApiPropertyOptional()
  @IsNestedObject(ValueWithUnitDto)
  energy?: ValueWithUnitDto;
}

export class FacilitiesDto implements FacilitiesUsage {
  @ApiPropertyOptional()
  @IsNestedObject(ValueWithUnitDto)
  size?: ValueWithUnitDto;
}

export class FuelUsageDto implements FuelUsage {
  @ApiPropertyOptional()
  @IsNestedObject(ValueWithUnitDto)
  spend?: ValueWithUnitDto;

  @ApiPropertyOptional()
  @IsNestedObject(ValueWithUnitDto)
  volume?: ValueWithUnitDto;
}

export class MachineryUsageDto implements MachineryUsage {
  @ApiPropertyOptional()
  @IsNestedObject(ValueWithUnitDto)
  spend?: ValueWithUnitDto;

  @ApiPropertyOptional()
  @IsNestedObject(ValueWithUnitDto)
  volume?: ValueWithUnitDto;
}

export class HeatingUsageDto implements HeatingUsage {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  districtHeating?: boolean;

  @ApiProperty()
  @IsNestedObject(ValueWithUnitDto)
  spend: ValueWithUnitDto;

  @ApiPropertyOptional()
  @IsNestedObject(ValueWithUnitDto)
  energy?: ValueWithUnitDto;
}

export class ExpenseDto implements ExpenseUsage {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  normId: string;

  @ApiProperty()
  @IsNestedObject(ValueWithUnitDto, { required: true })
  spend: ValueWithUnitDto;
}

export class EntrySubmissionDataDto implements EntrySubmissionData {
  @ApiProperty()
  @IsNestedObject(TimePeriodDto, { required: true })
  timePeriod: TimePeriodDto;

  @ApiPropertyOptional()
  @IsISO31661Alpha2()
  @IsOptional()
  countryOfRegistration?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  numberOfEmployees?: number;

  @ApiPropertyOptional()
  @IsNestedObject(ValueWithUnitDto)
  revenue?: ValueWithUnitDto;

  @ApiPropertyOptional()
  @IsNestedObject(ElectricityUsageDto)
  electricity?: ElectricityUsageDto;

  @ApiPropertyOptional()
  @IsNestedObject(FacilitiesDto)
  facilities?: FacilitiesDto;

  @ApiPropertyOptional()
  @IsNestedObject(FuelUsageDto)
  fuel?: FuelUsageDto;

  @ApiPropertyOptional()
  @IsNestedObject(FuelUsageDto)
  machinery?: MachineryUsageDto;

  @ApiPropertyOptional()
  @IsNestedObject(HeatingUsageDto)
  heating?: HeatingUsageDto;

  @ApiPropertyOptional({ type: [ExpenseDto] })
  @IsNestedArray(ExpenseDto)
  expenses?: ExpenseDto[];
}
