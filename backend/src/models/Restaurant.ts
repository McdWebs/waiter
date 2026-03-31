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
  /** When true, order printing is enabled; kitchen can print orders. */
  printerEnabled?: boolean
  /** Optional label for the receipt/kitchen printer (for owner reference). */
  printerName?: string
  /** Optional logo image URL for guest menu & admin views. */
  logoUrl?: string
  /** Optional social / web presence links shown in the guest menu footer. */
  websiteUrl?: string
  instagramUrl?: string
  facebookUrl?: string
  /** Optional “business plan meal” (עסקית) configuration. */
  businessPlanEnabled?: boolean
  businessPlanTitle?: string
  businessPlanDescription?: string
  /** Display-only text for when the plan is available (e.g. days/hours). */
  businessPlanTimeNote?: string
  /** Flat price for the business plan meal. */
  businessPlanPrice?: number
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
  printerEnabled: { type: Boolean, default: false },
  printerName: { type: String, trim: true },
  logoUrl: { type: String },
  websiteUrl: { type: String, trim: true },
  instagramUrl: { type: String, trim: true },
  facebookUrl: { type: String, trim: true },
  businessPlanEnabled: { type: Boolean, default: false },
  businessPlanTitle: { type: String, trim: true },
  businessPlanDescription: { type: String, trim: true },
  businessPlanTimeNote: { type: String, trim: true },
  businessPlanPrice: { type: Number },
})

export const Restaurant = model<RestaurantDocument>('Restaurant', restaurantSchema)
