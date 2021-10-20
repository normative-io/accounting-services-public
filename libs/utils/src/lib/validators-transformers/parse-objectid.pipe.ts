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

import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  PipeTransform,
} from '@nestjs/common';
import { Types } from 'mongoose';

/**
 *
 * @param value Any value; 24 character hex strings are treated as valid IDs, other values are rejected.
 * @returns An ObjectId instance representing the provided ID.
 * @throws BadRequestException if the provided value is not valid.
 */
export function parseObjectId(value: unknown): Types.ObjectId {
  if (value instanceof Types.ObjectId) {
    return value;
  } else if (typeof value === 'string' && value.length === 24) {
    // There is an ObjectId.isValid() method but it just does try { new ObjectID } anyway.
    // There is also mongoose.isValidObjectId() which just wraps ObjectId.isValid().
    // new ObjectId() happily does things we don't want to allow from external sources:
    // (a) 12 character string is interpreted as plain bytes.
    // (b) number is interpreted as a _timestamp in seconds_ and used to _generate a new ObjectId.
    // (c) it can take a Buffer, an ObjectId, a random thing that "looks like" an ObjectId
    //     (something that has a 'toHexString' method).
    try {
      return new Types.ObjectId(value);
    } catch (e) {
      // fall through to failure case below.
    }
  }
  throw new BadRequestException(`value ${value} is not a valid ID`);
}

/**
 * ParseObjectIdPipe can be used in an `@Param` or `@Query` decorator to validate that
 * the input is a hex ObjectId string and convert it to a bson ObjectId instance.
 *
 * Where possible, it also checks that the _expected_ type (based on decorator metadata)
 * is ObjectId and raises an InternalServerErrorException if it's not.
 *
 * @example handler(@Param('id', ParseObjectIdPipe) theId: ObjectId) {}
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<unknown, Types.ObjectId> {
  transform(value: unknown, metadata: ArgumentMetadata): Types.ObjectId {
    const metatype = metadata.metatype ?? Types.ObjectId;
    if (metatype !== Types.ObjectId && metatype !== Object) {
      const metaname = metatype.name ?? 'unknown';
      throw new InternalServerErrorException(
        `Invalid parameter type annotation. ${metadata.type}:${metadata.data ?? 'unknown'}, metatype ${metaname}`,
      );
    }

    try {
      return parseObjectId(value);
    } catch (e) {
      const isParamOrQuery = metadata.type === 'query' || metadata.type === 'param';
      const paramName = (isParamOrQuery && metadata.data) || 'unknown';
      throw new BadRequestException(`Parameter ${paramName} with value ${value} is not a valid ID.`);
    }
  }
}
