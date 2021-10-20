# Copyright 2022 Meta Mind AB
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

FROM segment/chamber:2 AS chamber
FROM node:14-bullseye-slim AS builder
WORKDIR /repo

ARG BUILD_CONFIG=production

# First just install NPM dependencies; this will give an image
# layer that should be reasonably cacheable (only needs to be
# rebuilt when dependencies change...)
# TODO: Pick npm version from package.json engines field??
COPY ./package.json ./package-lock.json ./
RUN --mount=type=secret,id=npm_rc_file,dst=/repo/.npmrc \
  npm install -g npm@8.3.0 \
  && NODE_ENV=development npm ci

# Pull in all source code.
# We could try to exclude the other components but it's
# easier to just grab everything.
COPY ./ ./
# Build, then strip out development packages from the install.
# We strip installed packages so that we can copy node_modules/ into the distribution image.
RUN \
  npx nx build auth -c "${BUILD_CONFIG}" \
  && npm prune --production

# Build a distribution image.
FROM node:14-bullseye-slim
RUN apt update && apt install -y ca-certificates && apt clean
WORKDIR /app
RUN mkdir ./dist ./node_modules
COPY ./package.json ./package-lock.json ./
COPY --from=builder /repo/dist ./dist/
COPY --from=builder /repo/node_modules ./node_modules
CMD node ./dist/apps/auth/main.js
