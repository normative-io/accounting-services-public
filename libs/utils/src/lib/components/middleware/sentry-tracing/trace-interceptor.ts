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

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Span } from '@sentry/types';
import { Observable, tap } from 'rxjs';

/**
 * Interceptor that needs to be applied on a per controller basis.
 *
 * This will only work in combination with the SentryTraceMiddleware
 * (that can easily be applied by default to the whole app). It will
 * enhance the transaction provided by the middleware with a proper
 * identifier (the url pattern, more generic than the actual url).
 * This piece also serves as the point in which the middleware phase
 * of the request is finished and the actual handling begins (hence
 * the span creation).
 */
@Injectable()
export class SentryTraceInterceptor<T> implements NestInterceptor<T, T> {
  constructor(@InjectSentry() private readonly sentry: SentryService) {}
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    const request = context.switchToHttp().getRequest();
    const routeIdentifier = `${request.method} ${request.route.path}`;
    let controllerSpan: Span | undefined;
    this.sentry.instance().configureScope((scope) => {
      scope.setTransactionName(routeIdentifier);
      const previousSpan = scope.getSpan();
      if (previousSpan) {
        // end the previous span (middleware) and set the proper description too
        previousSpan.finish();
        previousSpan.description = routeIdentifier;
      }
      controllerSpan = scope.getTransaction()?.startChild({
        description: routeIdentifier,
        op: 'controller.handle',
      });
      scope.setSpan(controllerSpan);
    });
    return next.handle().pipe(tap(() => controllerSpan && controllerSpan.finish()));
  }
}
