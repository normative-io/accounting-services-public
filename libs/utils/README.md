<!--
 Copyright 2022 Meta Mind AB
 
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 
     http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
-->

# accounting-services/libs/utils

Houses the utilities that can be shared across different microservices under accounting-services. Some examples are shared datamodels for organization accounts & users, sentry setup, normative-server sdk. This was started as a "fork" of the normative-server code with this functionality.

## Library Generation

This library was generated with [Nx](https://nx.dev). Steps followed:

```
nx g @nrwl/nest:library --publishable --buildable --importPath @normative/utils
nx build utils
cd dist/libs/utils
npm publish
```

## Development

### One time Set-up

One time set-up, for system dependencies such as nvm and npm. Before beginning, ensure [`nvm`](https://github.com/nvm-sh/nvm) is installed and you're a member of [npmjs.com/org/normative](https://www.npmjs.com/org/normative).

```sh
$ nvm use
$ npm login # login to personal npm account
$ nvm install-latest-npm
```

### Running unit tests

Tests are written using [Jest](https://jestjs.io).

```sh
$ nvm use
$ npm run test utils
```

## Repo structure

```
./
├── src/
  ├── lib/
    ├── app-config/                   -- Common configuration setup
    ├── auth//                        -- Houses the common authentication utils
    ├── components/                   -- Container for sharable components like errors, middleware
    ├── config/                       -- Container for environment setup
    ├── data-upload-sdk/              -- Houses the SDK for data-upload
    ├── database/                     -- Houses the database setup
    ├── datamodels/                   -- Houses the data schemas
    ├── normative-server-sdk/         -- Houses the SDK for normative-server
    ├── sentry/                       -- Houses the data schemas
    ├── shared/                       -- Houses the misc stuff
    └── validators-transformers/      -- Houses the data validators and transformers
  └── index.ts                        -- Script to start the microservice
├── README.md
├── jest.config.js
├── package.json
├── tsconfig.json
├── tsconfig.lib.json
└── tsconfig.spec.json

```
