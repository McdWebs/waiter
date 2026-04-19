import { Schema, model, type Document, type Types } from "mongoose";

export interface TableMergeDocument extends Document {
  restaurantId: Types.ObjectId;
  tables: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tableMergeSchema = new Schema<TableMergeDocument>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    tables: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: string[]) => Array.isArray(arr) && arr.length >= 2,
        message: "At least two tables are required to merge",
      },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

tableMergeSchema.index({ restaurantId: 1, tables: 1 });

export const TableMerge = model<TableMergeDocument>(
  "TableMerge",
  tableMergeSchema,
);
