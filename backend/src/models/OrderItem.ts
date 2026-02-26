import { Schema, model, type Document, type Types } from 'mongoose'

export interface OrderItemDocument extends Document {
  orderId: Types.ObjectId
  menuItemId: Types.ObjectId
  quantity: number
  notes?: string
}

const orderItemSchema = new Schema<OrderItemDocument>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String },
})

export const OrderItem = model<OrderItemDocument>('OrderItem', orderItemSchema)
