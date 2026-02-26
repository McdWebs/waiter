import { Schema, model, type Document, type Types } from 'mongoose'

export type TableStatus = 'active' | 'inactive'

export interface TableDocument extends Document {
  restaurantId: Types.ObjectId
  name: string
  number: string
  status: TableStatus
  createdAt: Date
  updatedAt: Date
}

const tableSchema = new Schema<TableDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true },
    number: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
)

tableSchema.index({ restaurantId: 1, number: 1 }, { unique: true })

export const Table = model<TableDocument>('Table', tableSchema)

