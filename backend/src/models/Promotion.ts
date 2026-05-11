import { Schema, model, type Document, type Types } from 'mongoose'

export type DiscountType = 'percent' | 'fixed'

export interface PromotionDocument extends Document {
  restaurantId: Types.ObjectId
  title: string
  description?: string
  discountType: DiscountType
  discountValue: number
  /** Optional: only active during these hours (e.g. happy hour 14:00-16:00) */
  activeFrom?: string // "HH:mm"
  activeTo?: string   // "HH:mm"
  /** Optional: 0=Sun … 6=Sat, empty = all days */
  activeDays?: number[]
  /** Optional: minimum cart total to apply */
  minOrderAmount?: number
  /** Coupon code – if empty the promotion applies automatically */
  couponCode?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const promotionSchema = new Schema<PromotionDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    activeFrom: { type: String },
    activeTo: { type: String },
    activeDays: [{ type: Number }],
    minOrderAmount: { type: Number, default: 0 },
    couponCode: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

promotionSchema.index({ restaurantId: 1, active: 1 })

export const Promotion = model<PromotionDocument>('Promotion', promotionSchema)
