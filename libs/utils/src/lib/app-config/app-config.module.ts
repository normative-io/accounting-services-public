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

import { Global, Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { Environment } from '../config';

import { AppConfigService } from './app-config.service';

export interface DockerConfiguration {
  // This file is supposed to be added from aws secrets at the runtime. It is injected in the container environment
  // when running in docker or in dev or prod cluster.  If it doesn't exist it will be ignored.
  // This is set by ci configuration. To find out more, look at: https://docs.docker.com/cloud/ecs-integration/#secrets.
  secretsPath: string;
}

export type PartialEnvironment = Partial<Record<Environment, string>>;

@Global()
@Module({})
export class AppConfigModule {
  static register(options: DockerConfiguration): DynamicModule {
    return {
      module: AppConfigModule,
      imports: [
        ConfigModule.forRoot({
          cache: true,
          envFilePath: ['.env', options.secretsPath],
        }),
      ],
      providers: [AppConfigService],
      exports: [AppConfigService],
    };
  }

  /**
   * Creates an AppConfigModule with a fixed configuration, for tests.
   *
   * @param env Full environment to use.
   */
  static withStaticEnvironment(env: PartialEnvironment): DynamicModule {
    return {
      module: AppConfigModule,
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          // validate returns the 'validated' environment, and can
          // override env vars, so we use it to inject fixed values.
          validate: () => ({ ...env }),
        }),
      ],
      providers: [AppConfigService],
      exports: [AppConfigService],
    };
  }
}
