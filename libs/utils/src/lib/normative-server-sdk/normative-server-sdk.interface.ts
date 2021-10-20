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

import { Types } from 'mongoose';

type ObjectId = Types.ObjectId;
// TODO: Use a real type, from some appropriate normative npm package.
export interface IReportTemplate {
  _id: string;
  rootHeader: string;
  header: string;
}

// TODO: Use a real type, from some appropriate normative npm package.
export interface IReport {
  _id?: string;

  name: string;
  reportSection: string; // The mongodb ObjectId of the report 'section' (aka template)
  dataSources: string[]; // array of dataSource IDs.
  startDate: Date;
  endDate: Date;
}

// TODO: Use a real type, from some appropriate normative npm package.
export interface IDataSource {
  _id?: string;
  origin: string;
  count: number;
  dataSourceType: string;
  name: string;
  fileType: string;
  organization: ObjectId;
  status: string;
  createdAt: Date;
  lastUpdate: Date;
}
