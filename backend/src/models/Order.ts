import { Schema, model, type Document, type Types } from 'mongoose'

export type OrderStatus = 'new' | 'preparing' | 'ready'

export interface OrderDocument extends Document {
  restaurantId: Types.ObjectId
  status: OrderStatus
  createdAt: Date
  updatedAt: Date
  tableNumber?: string
  notes?: string
  closedAt?: Date
}

const orderSchema = new Schema<OrderDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    status: { type: String, enum: ['new', 'preparing', 'ready'], default: 'new' },
    tableNumber: { type: String },
    notes: { type: String },
    closedAt: { type: Date },
  },
  { timestamps: true }
)

export const Order = model<OrderDocument>('Order', orderSchema)
