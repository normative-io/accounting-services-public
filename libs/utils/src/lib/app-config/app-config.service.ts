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

import { Injectable, LogLevel } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

import { Environment } from '../config/env.enum';

const BOOL_FLAG_TRUE_REGEX: RegExp = /^(1|y(es)?|t(rue)?)$/i;
const BOOL_FLAG_FALSE_REGEX: RegExp = /^(0|n(o)?|f(alse)?)$/i;

// Exported for test.
export function envValueToBoolean(value: string, key?: string): boolean {
  if (BOOL_FLAG_FALSE_REGEX.test(value)) {
    return false;
  } else if (BOOL_FLAG_TRUE_REGEX.test(value)) {
    return true;
  } else {
    throw new Error(`${key ?? 'The'} value '${value}' is invalid`);
  }
}

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get(key: Environment): string | undefined {
    // Raw config values are _always_ string values because they come from the environment.
    return this.configService.get<string>(key);
  }

  getRequired(key: Environment): string {
    const v = this.get(key);
    if (!v) {
      throw new Error(`Could not read required environment var ${key}`);
    }
    return v;
  }

  getBool(key: Environment): boolean | undefined {
    const v = this.get(key);
    return v ? envValueToBoolean(v, key) : undefined;
  }

  getInt(key: Environment): number | undefined {
    const v = this.get(key);
    if (typeof v === 'undefined' || v === null) {
      return undefined;
    }
    if (!/^[0-9]+$/.test(v)) {
      throw new Error(`Env var ${key} should be an int but is "${v}".`);
    }
    return parseInt(v, 10);
  }

  getFloat(key: Environment): number | undefined {
    const v = this.get(key);
    if (typeof v === 'undefined' || v === null) {
      return undefined;
    }
    if (!/^[+-]?([0-9]*[.])?[0-9]+$/.test(v)) {
      throw new Error(`Env var ${key} should be an float but is "${v}".`);
    }
    return parseFloat(v);
  }

  getCorsOptions(): CorsOptions {
    const allowCorsFromAll = this.getBool(Environment.ALLOW_CORS_FROM_ALL) ?? false;
    return {
      origin: allowCorsFromAll ? true : /^https:\/\/[a-z0-9-]+\.normative\.io$/i,
    };
  }

  getLogLevels(): LogLevel[] {
    const logLevels: LogLevel[] = ['error', 'warn', 'log'];
    if (this.getBool(Environment.LOG_DEBUG) ?? false) {
      logLevels.push('debug');
    }
    return logLevels;
  }
}
