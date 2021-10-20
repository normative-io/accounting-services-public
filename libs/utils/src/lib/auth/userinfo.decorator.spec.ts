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

import { Controller, Get, INestApplication, Injectable, UseGuards } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import passport from 'passport';
import supertest from 'supertest';

import { AppConfigModule } from '../app-config';
import { UserDocument } from '../datamodels';

import { AuthenticatedUser, JwtAuthGuard, UserInfo } from '.';

@Controller()
class TestController {
  @UseGuards(JwtAuthGuard)
  @Get('/tryit')
  tryIt(@UserInfo() userInfo: AuthenticatedUser) {
    return { subject: userInfo.sub };
  }

  @Get('/withoutguard')
  withoutGuard(@UserInfo() userInfo: AuthenticatedUser) {
    // Should never get here.
    return { subject: userInfo.sub };
  }
}

// Fake for passport-jwt Strategy class.
class FakeJwtStrategyBase extends passport.Strategy {
  constructor(options, private readonly verify) {
    super();
    this.name = 'jwt';
  }

  override authenticate(req: Request): void {
    const authHeader = req.get('authorization');
    if (authHeader === TEST_BEARER_TOKEN_OK) {
      const payload = { sub: TEST_USER_INFO.sub } as JwtPayload;
      req.user = this.verify(payload, (err: unknown, user: AuthenticatedUser, info) => {
        if (err) {
          return this.error(err);
        } else if (!user) {
          return this.fail(info);
        } else {
          return this.success(user, info);
        }
      });
    } else if (authHeader) {
      return this.fail('authorization header has an invalid token');
    } else {
      return this.fail('authorization header is not set');
    }
  }
}

@Injectable()
class FakeJwtStrategy extends PassportStrategy(FakeJwtStrategyBase) {
  constructor() {
    super({});
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // validate is only called if JWT token itself is authenticated.
    return TEST_USER_INFO;
  }
}

const TEST_BEARER_TOKEN_OK = 'Bearer the-magic-bearer';

const TEST_BEARER_TOKEN_DENIED = 'Bearer the-bad-token';

const TEST_USER_INFO: AuthenticatedUser = {
  userDoc: {
    _id: 'test-user-id',
    id: 'test-user-id',
    email: 'test@example.com',
  } as unknown as UserDocument,
  sub: 'test-user-id',
};

describe('UserInfo', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule.withStaticEnvironment({})],
      providers: [FakeJwtStrategy],
      controllers: [TestController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should provide AuthenticatedUser to the request handler', async () => {
    const resp = await supertest(app.getHttpServer()).get('/tryit').set('authorization', TEST_BEARER_TOKEN_OK);

    expect(resp.status).toEqual(200);
    expect(resp.body.subject).toMatch(TEST_USER_INFO.sub);
  });

  it('should reject if the request failed authentication', async () => {
    const resp = await supertest(app.getHttpServer()).get('/tryit').set('authorization', TEST_BEARER_TOKEN_DENIED);

    expect(resp.status).toEqual(401);
    expect(resp.body.subject).toBeUndefined();
  });

  it.each([undefined, TEST_BEARER_TOKEN_OK, TEST_BEARER_TOKEN_DENIED])(
    'should reject if the path was not guarded (with authorization = %s)',
    async (authToken) => {
      // Note we use a _valid_ token, but send it to a route that doesn't have JwtAuthGuard.
      let req = supertest(app.getHttpServer()).get('/withoutguard');
      if (authToken) {
        req = req.set('authorization', authToken);
      }
      const resp = await req;

      // The UserInfo() code should reject the request!
      expect(resp.status).toEqual(401);
      expect(resp.body.subject).toBeUndefined();
    },
  );
});
