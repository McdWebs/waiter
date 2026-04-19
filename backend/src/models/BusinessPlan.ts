import { Schema, model, type Document, type Types } from "mongoose";

interface BusinessPlanItem {
  menuItemId: Types.ObjectId;
  quantity: number;
}

export interface BusinessPlanDocument extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  description?: string;
  timeNote?: string;
  price: number;
  position?: number;
  active: boolean;
  items: BusinessPlanItem[];
}

const businessPlanItemSchema = new Schema<BusinessPlanItem>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false },
);

const businessPlanSchema = new Schema<BusinessPlanDocument>({
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  timeNote: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  position: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  items: { type: [businessPlanItemSchema], default: [] },
});

export const BusinessPlan = model<BusinessPlanDocument>(
  "BusinessPlan",
  businessPlanSchema,
);
