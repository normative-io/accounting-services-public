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

import { NextFunction, Response } from 'express';
import * as _ from 'lodash';
import { HydratedDocument, Model } from 'mongoose';

import { RequestWithData } from '../../../shared/request-with-data';
import { HttpError } from '../../errors/httpError';

/**
 * Loads a single mongoose document based on the specified parameters from
 *
 * @param mongooseModel The mongoose model
 * @param idParam The parameter containing the id
 */
export function loadSingle<T>(mongooseModel: Model<T>, idParam: string) {
  return async (req: RequestWithData, res: Response, next: NextFunction) => {
    const id = req.params[idParam];
    if (_.isNil(id)) {
      return next(new Error(`${idParam} is not set in route`));
    }
    if (_.isNil(mongooseModel)) {
      return next(new Error(`model is defined with params ${JSON.stringify(req.params)}`));
    }
    console.log(`Invoking loadSingle for ${mongooseModel.modelName} with ${idParam}=${id}`);

    let doc: HydratedDocument<T> | null;
    try {
      doc = await mongooseModel.findById(id);
    } catch (e) {
      return next(e);
    }

    if (!doc) {
      return next(new HttpError(404, `${mongooseModel.modelName} ${id} not found`));
    }
    // store the document on the request object in a safe place
    if (!req.loaded) {
      req.loaded = {};
    }
    // name key after document model but lowercase the first letter
    req.loaded[_.lowerFirst(mongooseModel.modelName)] = doc;
    next();
  };
}
