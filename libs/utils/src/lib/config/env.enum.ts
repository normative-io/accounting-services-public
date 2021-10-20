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

export enum Environment {
  ALLOW_CORS_FROM_ALL = 'ALLOW_CORS_FROM_ALL',
  AUTH0_CLIENT_ID = 'AUTH0_CLIENT_ID',
  AUTH0_CLIENT_SECRET = 'AUTH0_CLIENT_SECRET',
  AUTH0_DOMAIN = 'AUTH0_DOMAIN',
  AUTH0_DOMAIN_NAME = 'AUTH0_DOMAIN_NAME',
  AUTH0_DB_CONNECTION = 'AUTH0_DB_CONNECTION',
  AUTH0_SMS_CONNECTION = 'AUTH0_SMS_CONNECTION',
  EMAIL_WELCOME_SITE = 'EMAIL_WELCOME_SITE',
  LOG_DEBUG = 'LOG_DEBUG',
  MONGO_URI = 'MONGO_URI',
  NORMATIVE_DATA_UPLOAD_URL = 'NORMATIVE_DATA_UPLOAD_URL',
  NORMATIVE_SERVER_URL = 'NORMATIVE_SERVER_URL',
  PORT = 'PORT',
  SEND_GRID_KEY = 'SEND_GRID_KEY',
  SENTRY_DSN = 'SENTRY_DSN',
  SENTRY_ENVIRONMENT = 'SENTRY_ENVIRONMENT',
  SENTRY_TRACES_SAMPLE_RATE = 'SENTRY_TRACES_SAMPLE_RATE',
}
