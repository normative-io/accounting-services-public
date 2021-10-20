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

import { MiddlewareConsumer, Module } from '@nestjs/common';
import {
  AppConfigModule,
  AppConfigService,
  AuthConfig,
  AuthModule,
  DatabaseModule,
  Environment,
  SentryLoggerModule,
  SentryTraceMiddleware,
} from '@normative/utils';

import { StarterModule } from '../starter/starter.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule.register({
      secretsPath: '/run/secrets/data-upload',
    }),
    AuthModule.withConfig({
      useFactory: async (appConfigService: AppConfigService) =>
        ({
          auth0Domain: appConfigService.getRequired(Environment.AUTH0_DOMAIN),
          auth0DomainName: appConfigService.getRequired(Environment.AUTH0_DOMAIN_NAME),
          auth0Issuer: `https://${appConfigService.getRequired(Environment.AUTH0_DOMAIN_NAME)}/`,
        } as AuthConfig),
      inject: [AppConfigService],
    }),
    DatabaseModule,
    StarterModule,
    SentryLoggerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SentryTraceMiddleware).forRoutes('*');
  }
}
