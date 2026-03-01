import { Schema, model, type Document } from 'mongoose'

export interface RestaurantDocument extends Document {
  name: string
  slug: string
  currency?: string
  address?: string
  phone?: string
  contactEmail?: string
  description?: string
  restaurantType?: string
  timezone?: string
  openingHoursNote?: string
  taxRatePercent?: number
  serviceChargePercent?: number
  allowOrders?: boolean
  orderLeadTimeMinutes?: number
  /** Custom instructions for the AI waiter (tone, what to emphasize, how to behave). */
  aiInstructions?: string
  /** When true, restaurant is disabled (no menu/orders); super-admin only. */
  isSuspended?: boolean
}

const restaurantSchema = new Schema<RestaurantDocument>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  currency: { type: String, default: 'USD' },
  address: { type: String },
  phone: { type: String },
  contactEmail: { type: String },
  description: { type: String },
  restaurantType: { type: String },
  timezone: { type: String, default: 'UTC' },
  openingHoursNote: { type: String },
  taxRatePercent: { type: Number },
  serviceChargePercent: { type: Number },
  allowOrders: { type: Boolean, default: true },
  orderLeadTimeMinutes: { type: Number, default: 15 },
  aiInstructions: { type: String },
  isSuspended: { type: Boolean, default: false },
})

export const Restaurant = model<RestaurantDocument>('Restaurant', restaurantSchema)
