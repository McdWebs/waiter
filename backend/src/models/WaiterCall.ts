import { Schema, model, type Document, type Types } from 'mongoose'

export type WaiterCallStatus = 'open' | 'handled'

export interface WaiterCallDocument extends Document {
  restaurantId: Types.ObjectId
  tableNumber?: string
  notes?: string
  status: WaiterCallStatus
  createdAt: Date
  updatedAt: Date
  handledAt?: Date
}

const waiterCallSchema = new Schema<WaiterCallDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    tableNumber: { type: String },
    notes: { type: String },
    status: { type: String, enum: ['open', 'handled'], default: 'open' },
    handledAt: { type: Date },
  },
  { timestamps: true }
)

export const WaiterCall = model<WaiterCallDocument>('WaiterCall', waiterCallSchema)

