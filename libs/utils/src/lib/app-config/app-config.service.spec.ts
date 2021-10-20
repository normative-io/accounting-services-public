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

import { All, Controller, HttpCode, INestApplication, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Request } from 'express';
import supertest from 'supertest';

import { Environment } from '../config';

import { AppConfigModule, PartialEnvironment } from './app-config.module';
import { AppConfigService, envValueToBoolean } from './app-config.service';

const TEST_UNRELATED_ORIGIN = 'https://my-magical-website.com';
const TEST_NORMATIVE_ORIGINS = [
  'https://bcc.normative.io',
  'https://businesscarboncalculator.normative.io',
];

@Controller()
class TestController {
  @All()
  @HttpCode(200)
  getRoot(@Req() req: Request) {
    return { result: true, authToken: req.header('authorization'), method: req.method };
  }
}

const createAppWithEnv = async (env: PartialEnvironment): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule.withStaticEnvironment(env)],
    controllers: [TestController],
  }).compile();

  const app = moduleRef.createNestApplication();
  const corsOptions = app.get(AppConfigService).getCorsOptions();
  app.enableCors(corsOptions);
  await app.init();
  return app;
};

describe('with ALLOW_CORS_FROM_ALL set', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Work around the ConfigService writing configuration back into process.env
    delete process.env[Environment.ALLOW_CORS_FROM_ALL];
    app = await createAppWithEnv({
      [Environment.ALLOW_CORS_FROM_ALL]: 'y',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([...TEST_NORMATIVE_ORIGINS, TEST_UNRELATED_ORIGIN])(
    'should set CORS headers on preflight (origin: %s)',
    async (fromOrigin) => {
      const resp = await supertest(app.getHttpServer())
        .options('/')
        .set('Origin', fromOrigin)
        .set('Access-Control-Request-Method', 'PUT')
        .set('Access-Control-Request-Headers', 'authorization');
      expect(resp.get('access-control-allow-origin')).toMatch(fromOrigin);
      expect(resp.get('access-control-allow-headers')).toContain('authorization');
      const allowsMethods = resp.get('access-control-allow-methods').split(',');
      expect(allowsMethods).toEqual(expect.arrayContaining(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']));
      expect(resp.status).toEqual(204);
    },
  );

  it.each(['HEAD', 'GET', 'POST'])('should set CORS headers on a simple %s request', async (method) => {
    const agent = supertest(app.getHttpServer());
    const methodFn = agent[method.toLowerCase()] as typeof agent['get'];

    // A "simple request" does not have any special headers (it doesn't have an Authorization header).
    // Otherwise it will have a preflight which is tested separately.
    const resp = await methodFn('/').set('Origin', TEST_UNRELATED_ORIGIN);

    expect(resp.get('access-control-allow-origin')).toMatch(TEST_UNRELATED_ORIGIN);
    // Note that the request is still processed!
    // The CORS middleware does _not_ act as a guard, it only sets headers.
    expect(resp.status).toEqual(200);
    if (method !== 'HEAD') {
      expect(resp.body).toEqual({
        result: true,
        method,
      });
    }
  });
});

describe('with ALLOW_CORS_FROM_ALL not set', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Work around the ConfigService writing configuration back into process.env
    delete process.env[Environment.ALLOW_CORS_FROM_ALL];
    app = await createAppWithEnv({});
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(TEST_NORMATIVE_ORIGINS)('should set CORS headers on preflight (origin: %s)', async (fromOrigin) => {
    const resp = await supertest(app.getHttpServer())
      .options('/')
      .set('Origin', fromOrigin)
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'authorization');
    expect(resp.get('access-control-allow-origin')).toMatch(fromOrigin);
    expect(resp.get('access-control-allow-headers')).toContain('authorization');
    const allowsMethods = resp.get('access-control-allow-methods').split(',');
    expect(allowsMethods).toEqual(expect.arrayContaining(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']));
    expect(resp.status).toEqual(204);
  });

  it('should not allow CORS on preflight from a disallowed origin', async () => {
    const resp = await supertest(app.getHttpServer())
      .options('/')
      .set('Origin', TEST_UNRELATED_ORIGIN)
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'authorization');
    expect(resp.get('access-control-allow-origin')).not.toBeDefined();
    expect(resp.get('access-control-allow-headers')).toContain('authorization');
    const allowsMethods = resp.get('access-control-allow-methods').split(',');
    expect(allowsMethods).toEqual(expect.arrayContaining(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']));
    expect(resp.status).toEqual(204);
  });

  it.each(['HEAD', 'GET', 'POST'])('should not allow CORS on %s from a disallowed origin', async (method) => {
    const agent = supertest(app.getHttpServer());
    const methodFn = agent[method.toLowerCase()] as typeof agent['get'];

    // A "simple request" does not have any special headers (it doesn't have an Authorization header).
    // Otherwise it will have a preflight which is tested separately.
    const resp = await methodFn('/').set('Origin', TEST_UNRELATED_ORIGIN);

    expect(resp.get('access-control-allow-origin')).not.toBeDefined();
    expect(resp.get('access-control-allow-headers')).not.toBeDefined();
    expect(resp.get('access-control-allow-methods')).not.toBeDefined();
    // Note that the request is still processed!
    // The CORS middleware does _not_ act as a guard, it only sets headers.
    expect(resp.status).toEqual(200);
    if (method !== 'HEAD') {
      expect(resp.body).toEqual({
        result: true,
        method,
      });
    }
  });
});

describe('envValueToBoolean', () => {
  it('should reject invalid strings', () => {
    expect(() => envValueToBoolean('foo', 'test_var')).toThrow(/test_var/);
    expect(() => envValueToBoolean('10', 'test_var')).toThrow(/test_var/);
    expect(() => envValueToBoolean('yellow', 'test_var')).toThrow(/test_var/);
    // Note that _blank string_ is explicitly rejected
    expect(() => envValueToBoolean('', 'test_var')).toThrow(/test_var/);
  });

  it('should return true for obviously true strings', () => {
    ['y', 'Y', 'YES', 'Yes', 'True', 'true', '1'].forEach((value) => {
      expect(envValueToBoolean(value, 'test_var')).toBeTruthy();
    });
  });

  it('should return false for obviously false strings', () => {
    ['n', 'N', 'NO', 'No', 'False', 'false', '0'].forEach((value) => {
      expect(envValueToBoolean(value, 'test_var')).toBeFalsy();
    });
  });
});
