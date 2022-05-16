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

export interface EmissionValue {
  value: number;
  unit: string;
}

export interface EmissionsByCategory {
  category: string;
  emission: EmissionValue;
}

export interface EmissionsByScope {
  scope: string;
  emission: EmissionValue;
  categoryBreakdown: EmissionsByCategory[];
}

export interface EmissionCalculation {
  totalEmissions: EmissionValue;
  emissionsByScope: EmissionsByScope[];
}

export interface StarterImpactRequest {
  organizationAccountId: string;
}

export interface StarterImpactResponse {
  // Metadata: what entry ID is this the estimate for?
  starterEntryId: string;
  calculationComplete: boolean;
  emissionCalculation: EmissionCalculation;
}
