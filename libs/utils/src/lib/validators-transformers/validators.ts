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

import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional, ValidateNested } from 'class-validator';

export interface IsNestedObjectOptions {
  required?: boolean;
}

export const IsNestedObject = (objType, options?: IsNestedObjectOptions): PropertyDecorator => {
  const isOptional = IsOptional();
  const transformToType = Type(() => objType);
  const isObject = IsObject();
  const checkNested = ValidateNested();
  // Return type should match `PropertyDecorator`
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    checkNested(target, propertyKey);
    isObject(target, propertyKey);
    if (!options?.required) {
      isOptional(target, propertyKey);
    }
    transformToType(target, propertyKey);
  };
};

export const IsNestedArray = (itemType, options?: IsNestedObjectOptions): PropertyDecorator => {
  const isOptional = IsOptional();
  const transformToType = Type(() => itemType);
  const isArray = IsArray();
  const checkNested = ValidateNested({ each: true });
  // Return type should match `PropertyDecorator`
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    checkNested(target, propertyKey);
    isArray(target, propertyKey);
    if (!options?.required) {
      isOptional(target, propertyKey);
    }
    transformToType(target, propertyKey);
  };
};
