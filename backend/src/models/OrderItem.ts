import { Schema, model, type Document, type Types } from "mongoose";

export interface OrderItemDocument extends Document {
  orderId: Types.ObjectId;
  menuItemId: Types.ObjectId;
  quantity: number;
  notes?: string;
  /** Price of the item at the time the order was placed. Stored so that later
   *  price changes to the menu item do not affect historical revenue data. */
  priceAtOrder: number;
  /** Item name at the time the order was placed, for the same reason. */
  nameAtOrder: string;
}

const orderItemSchema = new Schema<OrderItemDocument>({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String },
  priceAtOrder: { type: Number, required: true },
  nameAtOrder: { type: String, required: true },
});

export const OrderItem = model<OrderItemDocument>("OrderItem", orderItemSchema);
