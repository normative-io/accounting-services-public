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

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SentryInterceptor, SentryModule } from '@ntegral/nestjs-sentry';
import { Integrations } from '@sentry/node';
import { Integrations as TracingIntegrations } from '@sentry/tracing';

import { AppConfigService } from '../app-config/app-config.service';
import { Environment } from '../config/env.enum';

import { SentryController } from './sentry.controller';

@Module({
  imports: [
    SentryModule.forRootAsync({
      useFactory: async (appConfigService: AppConfigService) => ({
        dsn: appConfigService.get(Environment.SENTRY_DSN),
        environment: appConfigService.get(Environment.SENTRY_ENVIRONMENT),
        integrations: [
          new Integrations.Http({ breadcrumbs: true, tracing: true }),
          new TracingIntegrations.Express(),
          new TracingIntegrations.Mongo({
            useMongoose: true,
          }),
        ],
        tracesSampleRate: appConfigService.getFloat(Environment.SENTRY_TRACES_SAMPLE_RATE) || 0,
      }),
      inject: [AppConfigService],
    }),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new SentryInterceptor(),
    },
  ],
  controllers: [SentryController],
})
export class SentryLoggerModule {}
