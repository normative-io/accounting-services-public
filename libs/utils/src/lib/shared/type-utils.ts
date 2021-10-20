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
 * Creating an enum from an object which can also be re-used as a type. To export as type of create enum "ShapeEnum":
 *
 * export type ShapeType = (typeof ShapeEnum)[keyof typeof ShapeEnum];
 *
 * Recommended alternative by TS core member: https://github.com/microsoft/TypeScript/issues/17690#issuecomment-321365759
 *
 * @param x
 */
export function mkenum<T extends { [index: string]: U }, U extends string>(x: T) {
  return x;
}

/**
 * Returns an array that can be used for creating union types with the array
 * strings as actual literals instead of just the type String.
 *
 * Example:
 *
 * const fuelTypes = literalArray(['petrol', 'diesel'])
 * type FuelType = typeof fuelTypes[0]
 *
 * // FuelType == 'petrol' | 'diesel'
 *
 * @param array
 */
export function literalArray<T extends string>(array: T[]): T[] {
  return array;
}

/**
 * Generic type for getting all possible keys of a union, not just the ones
 * they have in common, as "keyof" would do.
 * src: https://stackoverflow.com/questions/49401866/all-possible-keys-of-an-union-type
 *
 * Example:
 * interface A {a: string, common: string}
 * interface B {b: string, common: string}
 * type AB = A | B;
 * type IntersectionKeys = keyof AB // only "common" allowed
 * type UnionKeys = AllKeysOfUnion<AB> // "a", "b" & "common" allowed
 */
export type AllKeysOfUnion<T> = T extends T ? keyof T : never;

/**
 * Type to declare a union type as a subset of another union
 * src: https://stackoverflow.com/questions/53637125/typescript-extract-and-create-union-as-a-subset-of-a-union
 *
 * Example:
 * type MyUnionType = 'foo' | 'bar' | 'baz'
 * type MySubUnionType = Extends<MyUnionType, 'foo' | 'bar'>; // okay, compiles
 * type MySubUnionType = Extends<MyUnionType, 'foo' | 'bas'>; // error:
 */
export type Extends<T, U extends T> = U;

/**
 * Get an iterable through the keys of an Enum
 * src: https://www.petermorlion.com/iterating-a-typescript-enum/
 *
 * Example:
 * enum Color { Red = "RED", Green = "GREEN" }
 * for (const value of enumKeys(Color)) { console.log(Color[value]); }
 *
 * @param obj
 */
export function enumKeys<O, K extends keyof O = keyof O>(obj: O): K[] {
  return Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];
}
