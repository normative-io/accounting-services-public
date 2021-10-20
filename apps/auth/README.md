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

# accounting-services/auth

Serves API end-points for any operations (creation, updation, deletion etc.) on organization accounts and users. It's named auth since it takes care of both authentication and authorisation.

## Development

> 🚧 **Warning**
>
> It is currently not possible for developers not associated with Normative to
> start this service as it requires access to protected resources.

### One time Set-up

One time set-up, for system dependencies such as nvm and npm. Before beginning, ensure [`nvm`](https://github.com/nvm-sh/nvm) is installed and you're a member of [npmjs.com/org/normative](https://www.npmjs.com/org/normative).

```sh
$ nvm use
$ npm login # login to personal npm account
$ nvm install-latest-npm
```

### Environment Setup

Make a copy of `.env.sample`, fill the values (ex: MONGO_URI) and save as `.env.dev` in the same folder.

### Local server

```sh
$ nvm use
$ npm install
$ npm start auth # running on localhost:5000
```

### Running unit tests

Tests are written using [Jest](https://jestjs.io).

```sh
$ nvm use
$ npm run test auth
```

## Repo structure

```
./
├── src/
  ├── app/                  -- Home for starting the microservice.
  ├── assets/               -- Contains trademarked assets
  ├── authz/                -- Houses the authentication logic
  ├── components/           -- Container for common stuff like email, auth0
  ├── organizationAccount/  -- Houses the application logic for organization accounts
  ├── user/                 -- Houses the application logic for user
  └── main.ts               -- Script to start the microservice
├── Dockerfile
├── README.md
├── jest.config.js
├── tsconfig.app.json
├── tsconfig.json
└── tsconfig.spec.json

```
