import express from 'express'
import { Types } from 'mongoose'
import { Restaurant } from '../models/Restaurant'
import { RestaurantOwner } from '../models/RestaurantOwner'
import { MenuCategory } from '../models/MenuCategory'
import { MenuItem } from '../models/MenuItem'
import { Table } from '../models/Table'
import { Order } from '../models/Order'
import { OrderItem } from '../models/OrderItem'
import { WaiterCall } from '../models/WaiterCall'
import { OwnerFeedback } from '../models/OwnerFeedback'

const router = express.Router()

router.get('/feedback', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || 50), 10)))
    const feedback = await OwnerFeedback.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
    return res.json({ items: feedback })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to list feedback' })
  }
})

router.patch('/feedback/:id', async (req, res) => {
  try {
    const id = String(req.params.id)
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid feedback id' })
    }
    const body = req.body as { status?: string; adminReply?: string }
    const update: Record<string, unknown> = {}
    if (body.status === 'read' || body.status === 'replied') {
      update.status = body.status
    }
    if (typeof body.adminReply === 'string') {
      const trimmed = body.adminReply.trim()
      update.adminReply = trimmed
      update.adminRepliedAt = new Date()
      update.status = 'replied'
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'Provide status and/or adminReply' })
    }
    const feedback = await OwnerFeedback.findByIdAndUpdate(id, update, { new: true }).lean()
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' })
    }
    return res.json(feedback)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to update feedback' })
  }
})

router.get('/restaurants', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10))
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || 50), 10)))
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {}
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ]
    }

    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Restaurant.countDocuments(filter),
    ])

    const ownerMap = new Map<string, { email: string }>()
    if (restaurants.length > 0) {
      const owners = await RestaurantOwner.find({
        restaurantId: { $in: restaurants.map((r) => r._id) },
      })
        .select({ restaurantId: 1, email: 1 })
        .lean()
      for (const o of owners) {
        ownerMap.set(o.restaurantId.toString(), { email: o.email })
      }
    }

    const items = restaurants.map((r) => ({
      restaurant: r,
      ownerEmail: ownerMap.get(r._id.toString())?.email ?? null,
    }))

    return res.json({ items, total, page, limit })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to list restaurants' })
  }
})

router.get('/restaurants/:id', async (req, res) => {
  try {
    const id = String(req.params.id)
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid restaurant id' })
    }

    const restaurant = await Restaurant.findById(id).lean()
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    const owner = await RestaurantOwner.findOne({ restaurantId: id })
      .select({ email: 1, createdAt: 1 })
      .lean()
    if (!owner) {
      return res.json({ restaurant, owner: null })
    }

    return res.json({
      restaurant,
      owner: { email: owner.email, createdAt: owner.createdAt },
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load restaurant' })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const [totalRestaurants, totalOrders, ordersToday, openWaiterCalls, totalFeedback] =
      await Promise.all([
        Restaurant.countDocuments(),
        Order.countDocuments(),
        Order.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
        WaiterCall.countDocuments({ status: 'open' }),
        OwnerFeedback.countDocuments(),
      ])

    return res.json({
      totalRestaurants,
      totalOrders,
      ordersToday,
      openWaiterCalls,
      totalFeedback,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load stats' })
  }
})

router.patch('/restaurants/:id', async (req, res) => {
  try {
    const id = String(req.params.id)
    const body = req.body as Record<string, unknown>

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid restaurant id' })
    }

    const update: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
    if (typeof body.slug === 'string' && body.slug.trim()) {
      update.slug = (body.slug as string).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    }
    if (typeof body.currency === 'string' && body.currency.trim())
      update.currency = (body.currency as string).trim().toUpperCase()
    if (typeof body.address === 'string') update.address = body.address.trim() || undefined
    if (typeof body.phone === 'string') update.phone = body.phone.trim() || undefined
    if (typeof body.contactEmail === 'string') update.contactEmail = body.contactEmail.trim() || undefined
    if (typeof body.description === 'string') update.description = body.description.trim() || undefined
    if (typeof body.restaurantType === 'string') update.restaurantType = body.restaurantType.trim() || undefined
    if (typeof body.timezone === 'string') update.timezone = body.timezone.trim() || undefined
    if (typeof body.openingHoursNote === 'string')
      update.openingHoursNote = body.openingHoursNote.trim() || undefined
    if (typeof body.taxRatePercent === 'number' && body.taxRatePercent >= 0)
      update.taxRatePercent = body.taxRatePercent
    if (typeof body.serviceChargePercent === 'number' && body.serviceChargePercent >= 0)
      update.serviceChargePercent = body.serviceChargePercent
    if (typeof body.allowOrders === 'boolean') update.allowOrders = body.allowOrders
    if (typeof body.orderLeadTimeMinutes === 'number' && body.orderLeadTimeMinutes >= 0)
      update.orderLeadTimeMinutes = body.orderLeadTimeMinutes
    if (typeof body.isSuspended === 'boolean') update.isSuspended = body.isSuspended
    if (typeof body.aiInstructions === 'string') {
      const trimmed = (body.aiInstructions as string).trim()
      if (trimmed) {
        update.aiInstructions = trimmed
      } else {
        ;(update as any).$unset = { ...((update as any).$unset || {}), aiInstructions: 1 }
      }
    }

    if (Object.keys(update).length === 0) {
      const restaurant = await Restaurant.findById(id).lean()
      if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' })
      return res.json(restaurant)
    }

    if (update.slug) {
      const existing = await Restaurant.findOne({ slug: update.slug as string, _id: { $ne: id } }).lean()
      if (existing) {
        return res.status(409).json({ message: 'Slug is already in use' })
      }
    }

    const restaurant = await Restaurant.findByIdAndUpdate(id, update, { new: true }).lean()
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }
    return res.json(restaurant)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to update restaurant' })
  }
})

router.delete('/restaurants/:id', async (req, res) => {
  try {
    const id = String(req.params.id)
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid restaurant id' })
    }

    const restaurant = await Restaurant.findById(id)
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    const rid = restaurant._id

    const categories = await MenuCategory.find({ restaurantId: rid }).select({ _id: 1 }).lean()
    const categoryIds = categories.map((c) => c._id)

    const orderIds = (await Order.find({ restaurantId: rid }).select({ _id: 1 }).lean()).map((o) => o._id)

    await OrderItem.deleteMany({ orderId: { $in: orderIds } })
    await Order.deleteMany({ restaurantId: rid })
    await WaiterCall.deleteMany({ restaurantId: rid })
    await Table.deleteMany({ restaurantId: rid })
    await MenuItem.deleteMany({ categoryId: { $in: categoryIds } })
    await MenuCategory.deleteMany({ restaurantId: rid })
    await RestaurantOwner.deleteOne({ restaurantId: rid })
    await OwnerFeedback.deleteMany({ restaurantId: rid })
    await Restaurant.findByIdAndDelete(rid)

    return res.status(204).send()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to delete restaurant' })
  }
})

export default router
