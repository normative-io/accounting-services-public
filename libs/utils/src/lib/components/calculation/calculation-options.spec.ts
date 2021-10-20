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

import { enumKeys } from '../../shared/type-utils';

import { CalculationOptions, ImpactCalculationModels, ImpactModelOptions } from './calculation-options';

describe('ImpactCalculationModels', () => {
  it('provides options for all models', () => {
    for (const modelVersionKey of enumKeys(ImpactCalculationModels)) {
      const modelVersion = ImpactCalculationModels[modelVersionKey];
      const options: CalculationOptions | undefined = ImpactModelOptions[modelVersion];
      try {
        expect(options).not.toBeNull();
      } catch (error) {
        throw new Error(`No ImpactModelOptions found for version ${modelVersion}`);
      }
    }
  });
});
