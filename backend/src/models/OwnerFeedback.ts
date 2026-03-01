import { Schema, model, type Document, type Types } from 'mongoose'

export type FeedbackStatus = 'new' | 'read' | 'replied'

export interface OwnerFeedbackDocument extends Document {
  restaurantId: Types.ObjectId
  restaurantName: string
  ownerEmail: string
  type: 'feedback' | 'bug'
  message: string
  status: FeedbackStatus
  adminReply?: string
  adminRepliedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ownerFeedbackSchema = new Schema<OwnerFeedbackDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    restaurantName: { type: String, required: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    type: { type: String, enum: ['feedback', 'bug'], required: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['new', 'read', 'replied'],
      default: 'new',
    },
    adminReply: { type: String, trim: true },
    adminRepliedAt: { type: Date },
  },
  { timestamps: true }
)

ownerFeedbackSchema.index({ restaurantId: 1, createdAt: -1 })
ownerFeedbackSchema.index({ createdAt: -1 })

export const OwnerFeedback = model<OwnerFeedbackDocument>(
  'OwnerFeedback',
  ownerFeedbackSchema
)
