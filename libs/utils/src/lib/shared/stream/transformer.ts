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

import * as _ from 'lodash';
import { Transform } from 'readable-stream';

/**
 * Base class for implementing object transformers.
 *
 * If you subclass this you either implement transformBatch or transformOne
 * in your class. Also, you may configure bufferLength.
 *
 * This implementation will take care of properly handling errors and clearing
 * out buffers and the stream.
 *
 * See subclass implementation examples below.
 */
export abstract class BufferedTransformer<InputType, OutputType> extends Transform {
  protected bufferLength = 100;
  protected debugLogs = false;
  private buffer: InputType[];

  constructor() {
    super({
      writableObjectMode: true,
      readableObjectMode: true,
    });
    this.buffer = [];
    if (this.debugLogs) this.setUpEventLogs();
  }

  transformBatch(batch: InputType[]): Promise<OutputType[]> {
    return Promise.all(batch.map((i) => this.transformOne(i)));
  }

  transformOne(input: InputType): Promise<OutputType> {
    throw new Error('Either transformOne or transformBatch should be implented');
  }

  /**
   * Writes a chunk to the buffer
   *
   * @param chunk A chunk in the stream
   * @param ignore
   * @param next callback for the next item
   * @private
   */
  override _transform(chunk: InputType | InputType[], ignore, next) {
    // add items to buffer
    if (_.isArray(chunk)) {
      this.buffer.push(...chunk);
    } else {
      this.buffer.push(chunk);
    }
    if (this.debugLogs) this.logBufferSize();

    // if buffer reached the target length, classify buffered items
    if (this.buffer.length >= this.bufferLength) {
      return this.flushBuffer(next);
    }
    return next();
  }

  /**
   * Called when there are no more items to be written but before emitting the 'end' event
   *
   * @param cb The callback
   * @private
   */
  override _final(cb) {
    return this.flushBuffer(cb);
  }

  async flushBuffer(cb: (err?) => void) {
    if (this.buffer.length === 0) return cb(); // Don't do anything for empty buffers
    try {
      if (this.debugLogs) this.debugLog('transform batch', this.buffer.length);

      const transformed = await this.transformBatch(this.buffer);

      if (this.debugLogs) this.debugLog('end transform batch');

      transformed?.map((t) => {
        if (t !== undefined) {
          this.push(t);
        }
      });
      this.buffer = [];
      cb();
    } catch (err) {
      this.buffer = [];
      cb(err);
    }
  }

  protected setUpEventLogs() {
    const events = ['close', 'drain', 'error', 'finish', 'pipe', 'unpipe'];
    events.forEach((eventName) => this.on(eventName, () => this.debugLog('event', eventName)));
  }

  protected logBufferSize(factor = 4) {
    // WARNING: This logic does not work (as intented) if the buffer is expanded in chunks
    if (this.buffer.length !== 0 && this.buffer.length % (this.bufferLength / factor) === 0) {
      this.debugLog('buffer size', this.buffer.length);
    }
  }

  protected debugLog(...args) {
    console.log(`BufferedTransformer ${this.constructor.name}`, ...args);
  }
}
