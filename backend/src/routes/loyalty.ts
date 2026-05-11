import express from 'express'
import { Types } from 'mongoose'
import { LoyaltyCustomer } from '../models/LoyaltyCustomer'
import { Order } from '../models/Order'
import { OrderItem } from '../models/OrderItem'
import { MenuItem } from '../models/MenuItem'
import { authenticateOwner } from '../middleware/auth'

const router = express.Router()

// ── Public: identify / register loyalty customer ──────────────────────────────
// Called by the guest when they enter their phone number
router.post('/restaurants/:restaurantId/loyalty/identify', async (req, res) => {
  try {
    const { restaurantId } = req.params
    const { phone, name } = req.body as { phone?: string; name?: string }

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }
    if (!phone?.trim()) return res.status(400).json({ message: 'Phone number is required' })

    const normalizedPhone = phone.trim().replace(/\s+/g, '')

    const customer = await LoyaltyCustomer.findOneAndUpdate(
      { restaurantId: new Types.ObjectId(restaurantId), phone: normalizedPhone },
      {
        $setOnInsert: {
          restaurantId: new Types.ObjectId(restaurantId),
          phone: normalizedPhone,
          name: name?.trim() || undefined,
          visits: [],
          totalSpent: 0,
          visitCount: 0,
        },
      },
      { upsert: true, returnDocument: 'after', lean: true }
    )

    return res.json({
      _id: customer?._id,
      phone: normalizedPhone,
      name: customer?.name,
      visitCount: customer?.visitCount ?? 0,
      totalSpent: customer?.totalSpent ?? 0,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to identify customer' })
  }
})

// ── Public: record a visit after order is placed ──────────────────────────────
router.post('/restaurants/:restaurantId/loyalty/visit', async (req, res) => {
  try {
    const { restaurantId } = req.params
    const { phone, orderId } = req.body as { phone?: string; orderId?: string }

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }
    if (!phone?.trim()) return res.status(400).json({ message: 'Phone is required' })
    if (!orderId || !Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Valid orderId is required' })
    }

    // Calculate order total
    const orderItems = await OrderItem.find({ orderId: new Types.ObjectId(orderId) })
      .populate<{ menuItemId: { price: number } }>('menuItemId', 'price')
      .lean()
    const totalAmount = orderItems.reduce((sum, oi) => {
      return sum + ((oi.menuItemId as { price: number })?.price ?? 0) * oi.quantity
    }, 0)

    const normalizedPhone = phone.trim().replace(/\s+/g, '')
    const customer = await LoyaltyCustomer.findOneAndUpdate(
      { restaurantId: new Types.ObjectId(restaurantId), phone: normalizedPhone },
      {
        $push: {
          visits: {
            orderId: new Types.ObjectId(orderId),
            totalAmount,
            visitedAt: new Date(),
          },
        },
        $inc: { totalSpent: totalAmount, visitCount: 1 },
      },
      { returnDocument: 'after', lean: true }
    )

    if (!customer) return res.status(404).json({ message: 'Customer not found' })
    return res.json({ visitCount: customer.visitCount, totalSpent: customer.totalSpent })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to record visit' })
  }
})

// ── Owner: list all loyalty customers ────────────────────────────────────────
router.get('/owner/loyalty', authenticateOwner, async (req, res) => {
  try {
    const rid = req.ownerRestaurantId
    if (!rid) return res.status(403).json({ message: 'Forbidden' })

    const customers = await LoyaltyCustomer.find(
      { restaurantId: new Types.ObjectId(rid) },
      { visits: 0 } // omit visits array for performance on list view
    )
      .sort({ visitCount: -1 })
      .lean()

    return res.json(customers)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load loyalty customers' })
  }
})

// ── Owner: get single loyalty customer with visit history ────────────────────
router.get('/owner/loyalty/:customerId', authenticateOwner, async (req, res) => {
  try {
    const rid = req.ownerRestaurantId
    const customerId = req.params['customerId'] as string
    if (!rid || !customerId || !Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: 'Invalid request' })
    }

    const customer = await LoyaltyCustomer.findOne({
      _id: new Types.ObjectId(customerId),
      restaurantId: new Types.ObjectId(rid),
    }).lean()

    if (!customer) return res.status(404).json({ message: 'Customer not found' })
    return res.json(customer)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load customer' })
  }
})

export default router
