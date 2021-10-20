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

import type { JwtPayload } from 'jsonwebtoken';

import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { User, UserDocument } from '../datamodels';

import { AuthenticatedUser } from './auth.interface';
import { AUTH_OPTIONS_TOKEN } from './constants';

export interface AuthConfig {
  auth0Domain: string;
  auth0DomainName: string;
  auth0Issuer: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @Inject(AUTH_OPTIONS_TOKEN) private authConfig: AuthConfig,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${authConfig.auth0Domain}.well-known/jwks.json`,
      }),
      ignoreExpiration: false,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: `${authConfig.auth0Domain}api/v2/`,
      issuer: `${authConfig.auth0Issuer}`,
      algorithms: ['RS256'],
    });
    this.logger.log(`JwtStrategy config: ${JSON.stringify(authConfig)}`);
  }

  // TODO: This should be marked `override`, but typescript can't see through the class mixin.
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // This field on the auth token corresponds to the user ID field in the db.
    // The 'sub' field on the auth token corresponds to the auth0Id field in the db.
    const userId = payload[`${this.authConfig.auth0Issuer}user_id`] as string | undefined | null;
    if (!userId) {
      throw new UnauthorizedException('JWT does not contain a user ID');
    }
    const sub = payload.sub;
    if (!sub) {
      throw new UnauthorizedException('JWT does not contain a valid subject');
    }

    // Look up this id in the database
    const userDoc: UserDocument | null = await this.userModel.findById(userId);
    if (!userDoc) {
      throw new UnauthorizedException('User not found');
    }
    return { userDoc, sub };
  }
}
