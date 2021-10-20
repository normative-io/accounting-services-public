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

/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppConfigService, Environment } from '@normative/utils';

import { AppModule } from './app/app.module';
import { VALIDATION_PIPE_OPTIONS } from './constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(AppConfigService);

  app.useLogger(configService.getLogLevels());

  app.enableCors(configService.getCorsOptions());

  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Data Upload')
    .setDescription('The data upload API for Normative.')
    .setVersion('1.0')
    .addTag('Normative')
    .build();

  const openApiDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, openApiDoc);

  const port = configService.getInt(Environment.PORT) ?? 3333;
  await app.listen(port, () => {
    Logger.log('Listening at http://localhost:' + port);
  });
}

bootstrap();
