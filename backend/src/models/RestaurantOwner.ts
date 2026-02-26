import { Schema, model, type Document, type Types } from 'mongoose'

export interface RestaurantOwnerDocument extends Document {
  email: string
  passwordHash: string
  restaurantId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const restaurantOwnerSchema = new Schema<RestaurantOwnerDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
)

export const RestaurantOwner = model<RestaurantOwnerDocument>(
  'RestaurantOwner',
  restaurantOwnerSchema
)

