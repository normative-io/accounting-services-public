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

import { Controller, Get, HttpStatus, INestApplication, Param, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import supertest from 'supertest';

import { ParseObjectIdPipe } from './parse-objectid.pipe';

@Controller()
class TestController {
  @Get('/param-ok/:id')
  tryParam(@Param('id', ParseObjectIdPipe) theId: Types.ObjectId) {
    return this.handleId(theId);
  }

  @Get('/param-notype/:id')
  tryParamNoAnnotation(@Param('id', ParseObjectIdPipe) theId) {
    return this.handleId(theId);
  }

  @Get('/query')
  tryQuery(@Query('id', ParseObjectIdPipe) theId: Types.ObjectId) {
    return this.handleId(theId);
  }

  // This should reject (unfortunately we can only check at runtime).
  @Get('/param-badtype/:id')
  tryParamBadAnnotation(@Param('id', ParseObjectIdPipe) theId: string) {
    return { str: theId };
  }

  private handleId(theId: Types.ObjectId) {
    return { hex: theId.toHexString() };
  }
}

const REQUEST_PATH_PREFIXES = ['/param-ok/', '/param-notype/', '/query?id='];

const TEST_ID = new Types.ObjectId();
const TEST_HEX_ID_OK = TEST_ID.toHexString();
const TEST_HEX_ID_OK_UPPERCASE = TEST_ID.toHexString().toUpperCase();
const TEST_HEX_ID_INVALID = [
  '', // blank
  'hello', // not hex, wrong length
  'text with 24 characters.', // not hex, but 24 characters...
  '42', // string, but parseable as a number
];

describe('ParseObjectId', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(REQUEST_PATH_PREFIXES)('should work for queries and params (path %s)', async (path) => {
    const resp = await supertest(app.getHttpServer()).get(path + TEST_HEX_ID_OK);
    expect(resp.status).toEqual(HttpStatus.OK);
    expect(resp.body).toEqual({ hex: TEST_HEX_ID_OK });
  });

  it('should accept uppercase IDs too', async () => {
    // Should still work if the ID is uppercase
    const resp = await supertest(app.getHttpServer()).get('/param-ok/' + TEST_HEX_ID_OK_UPPERCASE);
    expect(resp.status).toEqual(200);
    // Response should use the canonical lowercase form.
    expect(resp.body).toEqual({ hex: TEST_HEX_ID_OK });
  });

  it.each(TEST_HEX_ID_INVALID)('should reject invalid IDs (id: %s)', async (id) => {
    // This has to use the query variant because path params don't match blank strings which is one of the test cases.
    const resp = await supertest(app.getHttpServer()).get('/query?id=' + id);
    expect(resp.status).toEqual(HttpStatus.BAD_REQUEST);
    expect(resp.body.hex).toBeUndefined();
  });

  it('should verify the metatype is ObjectId', async () => {
    const resp = await supertest(app.getHttpServer()).get('/param-badtype/' + TEST_HEX_ID_OK);
    // Error message should mention what the metatype was.
    expect(resp.body.message).toMatch(/metatype String/);
    expect(resp.status).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
