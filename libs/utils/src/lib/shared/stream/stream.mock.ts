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

import miss from 'mississippi';
import { Transform } from 'readable-stream';
import StreamTest from 'streamtest';

import { BufferedTransformer } from './transformer';
import { getPipelineResult } from './utils';

/**
 * Function to test a stream transformer. It will take a transformer instance
 * and a list of elements and build a fake stream around the object. The
 * given elements will be piped in, and the transformed objects, after passing
 * through the stream, will be returned.
 *
 * Also, it expects the stream not to fail.
 *
 *
 * @typeParam I - Type of one element of the input. Actual input is I[]
 * @typeParam O - Type of one element of the output. Actual output is Promise<O[]>
 * @typeParam T - The type of the transformer that this function will get an instance of
 *
 * @param attacherInstance - an instance of the stream transformer through which
 * the elements should be put through
 * @param elements - the elements that should be piped into the stream that
 * the transformer will be attached to
 */
export async function processStream<I, O>(attacherInstance: BufferedTransformer<I, O>, elements: I[]): Promise<O[]>;

export async function processStream<I, O, T extends Transform>(attacherInstance: T, elements: I[]): Promise<O[]>;

export async function processStream<I, O, T extends Transform>(attacherInstance: T, elements: I[]): Promise<O[]> {
  return await getPipelineResult(miss.pipeline.obj(StreamTest.v2.fromObjects(elements), attacherInstance));
}
