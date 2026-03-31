import { Schema, model, type Document, type Types } from 'mongoose'

export interface MenuCategoryDocument extends Document {
  restaurantId: Types.ObjectId
  name: string
  position?: number
}

const menuCategorySchema = new Schema<MenuCategoryDocument>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  position: { type: Number, default: 0 },
})

menuCategorySchema.index({ restaurantId: 1, position: 1 })

export const MenuCategory = model<MenuCategoryDocument>('MenuCategory', menuCategorySchema)
