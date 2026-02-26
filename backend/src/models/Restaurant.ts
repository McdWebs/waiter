import { Schema, model, type Document } from 'mongoose'

export interface RestaurantDocument extends Document {
  name: string
  slug: string
  currency?: string
}

const restaurantSchema = new Schema<RestaurantDocument>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  currency: { type: String, default: 'USD' },
})

export const Restaurant = model<RestaurantDocument>('Restaurant', restaurantSchema)
