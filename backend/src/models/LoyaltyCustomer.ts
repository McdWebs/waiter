import { Schema, model, type Document, type Types } from 'mongoose'

export interface LoyaltyVisit {
  orderId: Types.ObjectId
  totalAmount: number
  visitedAt: Date
}

export interface LoyaltyCustomerDocument extends Document {
  restaurantId: Types.ObjectId
  phone: string
  name?: string
  visits: LoyaltyVisit[]
  totalSpent: number
  visitCount: number
  createdAt: Date
  updatedAt: Date
}

const loyaltyVisitSchema = new Schema<LoyaltyVisit>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    totalAmount: { type: Number, required: true },
    visitedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const loyaltyCustomerSchema = new Schema<LoyaltyCustomerDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    phone: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    visits: [loyaltyVisitSchema],
    totalSpent: { type: Number, default: 0 },
    visitCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

loyaltyCustomerSchema.index({ restaurantId: 1, phone: 1 }, { unique: true })
loyaltyCustomerSchema.index({ restaurantId: 1, visitCount: -1 })

export const LoyaltyCustomer = model<LoyaltyCustomerDocument>('LoyaltyCustomer', loyaltyCustomerSchema)
