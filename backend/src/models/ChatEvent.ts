import { Schema, model, type Document, type Types } from "mongoose";

export interface ChatEventDocument extends Document {
  restaurantId: Types.ObjectId;
  createdAt: Date;
}

const chatEventSchema = new Schema<ChatEventDocument>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
  },
  { timestamps: true },
);

chatEventSchema.index({ restaurantId: 1, createdAt: -1 });
chatEventSchema.index({ createdAt: -1 });

export const ChatEvent = model<ChatEventDocument>("ChatEvent", chatEventSchema);
