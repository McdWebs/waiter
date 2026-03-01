import express from 'express'
import { Types } from 'mongoose'
import { Restaurant } from '../models/Restaurant'
import { OwnerFeedback } from '../models/OwnerFeedback'
import { authenticateOwner } from '../middleware/auth'

const router = express.Router()

router.get('/restaurants/:restaurantId/feedback', authenticateOwner, async (req, res) => {
  try {
    const restaurantIdParam = req.params.restaurantId
    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined

    if (!ownerRestaurantId || ownerRestaurantId !== restaurantIdParam) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    if (!Types.ObjectId.isValid(restaurantIdParam)) {
      return res.status(400).json({ message: 'Invalid restaurant id' })
    }

    const items = await OwnerFeedback.find({
      restaurantId: new Types.ObjectId(restaurantIdParam),
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select({ message: 1, type: 1, status: 1, adminReply: 1, adminRepliedAt: 1, createdAt: 1 })
      .lean()

    return res.json({ items })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load feedback' })
  }
})

router.post('/restaurants/:restaurantId/feedback', authenticateOwner, async (req, res) => {
  try {
    const restaurantIdParam = req.params.restaurantId
    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    const ownerEmail = (req as any).ownerEmail as string | undefined

    if (!ownerRestaurantId || ownerRestaurantId !== restaurantIdParam) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    if (!ownerEmail) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (!Types.ObjectId.isValid(restaurantIdParam)) {
      return res.status(400).json({ message: 'Invalid restaurant id' })
    }

    const body = req.body as { type?: string; message?: string }
    const type = body.type === 'bug' ? 'bug' : 'feedback'
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!message) {
      return res.status(400).json({ message: 'Message is required' })
    }

    const restaurant = await Restaurant.findById(restaurantIdParam)
      .select({ name: 1 })
      .lean()
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    const feedback = await OwnerFeedback.create({
      restaurantId: new Types.ObjectId(restaurantIdParam),
      restaurantName: restaurant.name ?? 'Unknown',
      ownerEmail,
      type,
      message,
    })

    return res.status(201).json({
      _id: feedback._id,
      type: feedback.type,
      message: feedback.message,
      createdAt: feedback.createdAt,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to submit feedback' })
  }
})

export default router
