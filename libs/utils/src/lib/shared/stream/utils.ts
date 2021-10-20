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

import { flatMapDeep } from 'lodash';
import merge2 from 'merge2';
import miss from 'mississippi';
import { Writable } from 'readable-stream';
import util from 'util';

import { BufferedTransformer } from './transformer';

export const pPipe = util.promisify(miss.pipe);

export async function getPipelineResult<T>(pipeline): Promise<T[]> {
  const result: T[] = [];
  const storeInResult = miss.to.obj((chunk: T, _: unknown, done: (err?: Error) => void) => {
    result.push(chunk);
    done();
  });
  await pPipe(pipeline, storeInResult);
  return result;
}

export const ignorePipelineOutput = () =>
  new Writable({
    objectMode: true,
    write: (data, _, done) => done(),
  });

/**
 * Merge streams using merge2 but capturing/logging all source errors in a safe way.
 *
 * This function is equivalent to merge2 except it does not take an options
 * parameter, for more information see: https://www.npmjs.com/package/merge2
 *
 * As only one error can be emmited safely by the resulting stream, the extra
 * errors gotten from the source streams will be logged to the console.
 *
 * Implementation details:
 * The way this implementation works is by attaching error handlers to all
 * streams. After a first error, the merge2 implementation will completely
 * detach from all source streams. If we hadn't provided our own handler,
 * the rest of the streams would no longer have one and would cause an
 * uncaught exception if they threw an error. Our custom handler will log
 * those errors as they cannot be sent to the reader of this merged stream
 * anymore.
 *
 * @param nestedStreams This parameter follows the same structure as the ones
 * in the merge2 library (lists of lists... of streams) to indicate parallelism.
 */
export function mergeStreamsSafely(...nestedStreams) {
  const logUncaught = logAllButFirstUniqueError();
  for (const stream of flatMapDeep(nestedStreams)) {
    stream.on('error', logUncaught);
  }
  return merge2(...nestedStreams, { pipeError: true });
}

/**
 * Returns a logging callback that will ignore all errors that get passed
 * to it but will log all of the *distinct* errors after the first one.
 *
 * This can be useful if attached to many streams that may fail because of
 * the same source error. This way only *new* errors that come later (and
 * might presumably be ignored otherwise) will be logged.
 */
function logAllButFirstUniqueError(): (Error) => void {
  let firstError;
  const uniqueLogger = (e) => {
    if (firstError === undefined) {
      firstError = e;
    } else if (e !== firstError) {
      // Logging is the _point_.
      // eslint-disable-next-line no-console
      console.error('Additional not-propagated error on merge:', e);
    }
  };
  return uniqueLogger;
}

/**
 * Stream transformer that just logs the elements that pass through it.
 */
export class LogStream<LoggedType> extends BufferedTransformer<LoggedType, LoggedType> {
  bufferSize = 1;

  constructor(private prefix: string, private ratio: number = 1) {
    super();
    this.on('end', () => {
      console.log(prefix, 'stream end');
    });
  }

  override async transformOne(item: LoggedType): Promise<LoggedType> {
    if (Math.random() < this.ratio) {
      console.log(this.prefix, item);
    }
    return item;
  }
}
