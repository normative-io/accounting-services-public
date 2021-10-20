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

/**
 * How to add a new model:
 * - Add it to the ImpactCalculationModels enum
 * - Define its options below by inheriting an existing model
 * - If you define a model between two existing ones, consider updating the following one to inherit from the new one, if it makes sense.
 *
 * How to add a new calculation option:
 * - Add it to the calculationOptions interface
 * - Assign it the value which does NOT change behavior in the baseOptions object
 * - Overwrite that option in whichever model it should be used
 * - Make sure to review which models inherit from the one you change as those will also get the new behavior.
 *
 */

export enum ImpactCalculationModels {
  V1_UNSPSC = 'v1-unspsc',
  V1_5_UNSPSC_SCOPE12 = 'v1.5-unspsc-scope1&2',
  V1_6 = 'v1.6',
  V2_NORMID = 'v2-normid',
}

export interface CalculationOptions {
  pickMaxImpact: boolean;
  processNonTransactions: boolean;
  useCalculationAPI: boolean;
}

export const ImpactModelOptions: {
  [key in ImpactCalculationModels]?: CalculationOptions;
} = {};

/**
 * Default behavior of the oldest model v1-unspsc. This object is inherited
 * by all models so any new options should take the value that does NOT change
 * any previous behavior.
 */
const v1options: CalculationOptions = {
  pickMaxImpact: false,
  processNonTransactions: false,
  useCalculationAPI: false,
};

let prev = (ImpactModelOptions[ImpactCalculationModels.V1_UNSPSC] = v1options);

prev = ImpactModelOptions[ImpactCalculationModels.V1_5_UNSPSC_SCOPE12] = {
  ...prev,
  processNonTransactions: true,
};

prev = ImpactModelOptions[ImpactCalculationModels.V1_6] = {
  ...prev,
  pickMaxImpact: true,
};

const v2options: CalculationOptions = {
  useCalculationAPI: true,
  processNonTransactions: true,

  // V1, does not apply
  pickMaxImpact: false,
};

// Following the pattern, `prev` is always assigned even though it's not used...
// until someone comes to this file and adds the next version.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
prev = ImpactModelOptions[ImpactCalculationModels.V2_NORMID] = v2options;
