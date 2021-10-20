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

import { model, Schema, Types } from 'mongoose';

import { HttpError } from '../components/errors/httpError';

import { isObjectIdsEquals, validateSchema } from './utils';

const stringId1 = '5d492ebfcaa0a917504481df';
const objectId1 = new Types.ObjectId('5d492ebfcaa0a917504481df');

const stringId2 = '5d441dbcf78735de4e25e973';
const objectId2 = new Types.ObjectId('5d441dbcf78735de4e25e973');

describe('Utils', () => {
  describe('isObjectIdsEquals', () => {
    it('Must compare string and ObjectId values in any combinations', (done) => {
      expect(isObjectIdsEquals(stringId1, stringId1)).toBeTruthy();
      expect(isObjectIdsEquals(objectId1, objectId1)).toBeTruthy();
      expect(isObjectIdsEquals(stringId1, objectId1)).toBeTruthy();
      expect(isObjectIdsEquals(objectId1, stringId1)).toBeTruthy();

      expect(isObjectIdsEquals(stringId1, stringId2)).toBeFalsy();
      expect(isObjectIdsEquals(objectId1, objectId2)).toBeFalsy();
      expect(isObjectIdsEquals(stringId1, objectId2)).toBeFalsy();
      expect(isObjectIdsEquals(objectId1, stringId2)).toBeFalsy();

      expect(isObjectIdsEquals('', stringId1)).toBeFalsy();
      expect(isObjectIdsEquals('012345', stringId1)).toBeFalsy();
      expect(isObjectIdsEquals(null, stringId1)).toBeFalsy();
      expect(isObjectIdsEquals(undefined, stringId1)).toBeFalsy();

      done();
    });
  });

  describe('validateSchema', () => {
    const DummySchema = new Schema({
      foo: { type: String, required: true },
      bar: { type: Number },
    });

    const DummyModel = model('Dummy', DummySchema);

    it('should reject with HttpError with message on invalid schemas', async () => {
      await expect(validateSchema(new DummyModel({ baz: 1 }))).rejects.toBeInstanceOf(HttpError);

      await expect(validateSchema(new DummyModel({ bar: 2 }))).rejects.toBeInstanceOf(HttpError);

      await expect(validateSchema(new DummyModel({ foo: '1', bar: '2a' }))).rejects.toBeInstanceOf(HttpError);
    });

    it('should accept valid schemas', async () => {
      const m1 = new DummyModel({ foo: '1' });
      validateSchema(m1).then((data) => {
        expect(data).toEqual(m1);
      });

      const m2 = new DummyModel({ foo: '1', bar: 2 });
      validateSchema(m2).then((data) => {
        expect(data).toEqual(m2);
      });

      const m3 = new DummyModel({ foo: '1', bar: '2' }); // implicit type conversion
      validateSchema(m3).then((data) => {
        expect(data).toEqual(m3);
      });
    });

    it('should validate fast', async () => {
      const m1 = new DummyModel({ foo: '1' });
      await validateSchema(m1);
      const t0Ms = new Date().getTime();
      await validateSchema(m1);
      const t1Ms = new Date().getTime();
      expect(t1Ms - t0Ms).toBeLessThan(2);
    });
  });
});
