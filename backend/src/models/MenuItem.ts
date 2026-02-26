import { Schema, model, type Document, type Types } from 'mongoose'

export interface MenuItemDocument extends Document {
  categoryId: Types.ObjectId
  name: string
  description: string
  price: number
  allergens: string[]
  tags: string[]
  position?: number
  imageUrl?: string
  available?: boolean
}

const menuItemSchema = new Schema<MenuItemDocument>({
  categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  allergens: [{ type: String }],
  tags: [{ type: String }],
  position: { type: Number, default: 0 },
  imageUrl: { type: String },
  available: { type: Boolean, default: true },
})

export const MenuItem = model<MenuItemDocument>('MenuItem', menuItemSchema)
