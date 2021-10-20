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

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { UserRoles } from './user-roles';

export type UserDocument = HydratedDocument<User>;

@Schema({
  collection: 'users',
})
export class User {
  @Prop()
  auth0Id?: string;

  @Prop()
  name?: string;

  @Prop({
    type: String,
    lowercase: true,
    unique: true,
    uniqueCaseInsensitive: true,
    required: true,
  })
  email: string;

  @Prop()
  phone_number?: string;

  @Prop({ type: String, default: UserRoles.USER, required: true })
  role: UserRoles;

  @Prop()
  provider?: string;

  // Using "new Date()" or "Date.now()" for setting default values, invokes the function at schema
  // creation time and thereby fixes the value at that time. So, all subsequent collection
  // creations use that value.
  // But if we use "Date.now" (note the lack of parantheses after now), it will be passed as
  // function to be invoked at collection creation time and hence get the current value.
  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({ required: true, default: Date.now })
  lastUpdated: Date;

  // Date when the user accepted the terms & conditions
  @Prop()
  terms?: Date;

  // Date when the user accepted the BCC terms & conditions
  @Prop()
  bccTerms?: Date;

  // Is it the first time the user is signing in?
  @Prop({ required: true, default: true })
  firstTime: boolean;

  // Virtual methods
  profile: Record<string, unknown>;

  token: Record<string, unknown>;

  // Type declaration only; the corresponding schema property is created by default by Mongoose.
  _id: Types.ObjectId;
}
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 });
UserSchema.index({ auth0Id: 1 });

/**
 * Virtuals
 */

// Public profile information
UserSchema.virtual('profile').get(function () {
  return {
    _id: this._id,
    auth0Id: this.auth0Id,
    name: this.name,
    role: this.role,
    email: this.email,
  };
});

// Non-sensitive info we'll be putting in the token
UserSchema.virtual('token').get(function () {
  return {
    _id: this._id,
    role: this.role,
  };
});

/**
 * Validations
 */

// Validate empty email
UserSchema.path('email').validate((email: string) => {
  return email.trim().length;
}, 'Email cannot be an empty string');

// Validate phone is not taken.
// We'are not adding {unique: true} annnotation to phone_number in the schema above, since uniqueness applies only if phone number is specified.
// If we add the annotation to the schema, it will allow only one user to be without the phone_number.
UserSchema.path('phone_number').validate(function (value: string) {
  // Try to match for phone_number only if its's not a blank string
  if (!value.trim().length) {
    return true;
  }
  const id = this.id;
  return this.constructor.findOne({ phone_number: value }).then((user: UserDocument) => {
    if (user) {
      return id === user.id;
    }
    return true;
  });
}, 'The specified phone number is already in use.');
