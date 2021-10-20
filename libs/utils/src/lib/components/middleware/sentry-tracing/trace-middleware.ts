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

import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Span } from '@sentry/types';
import { NextFunction, Request, Response } from 'express';

/**
 * Middleware that starts a sentry transaction to measure performance.
 * It is designed to be used along with the SentryTraceInterceptor
 * although it is not required.
 *
 * If used standalone the transaction will have the name of the request
 * url and all of the request handling will be grouped under the "middleware"
 * span.
 *
 * If used with the SentryTraceInterceptor, the name will be the url pattern
 * making it easier to group similar calls, and the request timing will be
 * appropriately divided between middleware and request handling.
 */
@Injectable()
export class SentryTraceMiddleware implements NestMiddleware {
  constructor(@InjectSentry() private readonly sentry: SentryService) {}
  use(req: Request, res: Response, next: NextFunction): void {
    const transaction = this.sentry.instance().startTransaction({
      op: 'request',
      // This name is just a default that will be overwritten by the interceptor
      name: req.originalUrl,
    });

    this.sentry
      .instance()
      .getCurrentHub()
      .configureScope((scope) => {
        scope.addEventProcessor((event) => {
          event.request = {
            method: req.method,
            url: req.originalUrl,
          };
          return event;
        });
      });

    let middlewareSpan: Span;
    this.sentry.instance().configureScope((scope) => {
      middlewareSpan = transaction.startChild({
        description: req.originalUrl, // Overwriten later
        op: 'middleware',
      });
      scope.setSpan(middlewareSpan);
    });

    req.on('close', () => {
      // Finish span in case it was not finished by the request interceptor (middleware request rejection)
      middlewareSpan.endTimestamp ? null : middlewareSpan.finish();
      // Finish transaction
      transaction.setHttpStatus(res.statusCode);
      transaction.finish();
    });

    next();
  }
}
