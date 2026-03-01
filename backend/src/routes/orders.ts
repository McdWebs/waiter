import express from 'express'
import { Types } from 'mongoose'
import { Order } from '../models/Order'
import { OrderItem } from '../models/OrderItem'
import { MenuItem } from '../models/MenuItem'
import { Restaurant } from '../models/Restaurant'
import { WaiterCall } from '../models/WaiterCall'
import { io } from '../server'

const router = express.Router()

router.post('/orders', async (req, res) => {
  try {
    const { restaurantId, tableNumber, items, notes } = req.body as {
      restaurantId?: string
      tableNumber?: string
      notes?: string
      items?: { menuItemId?: string; quantity?: number; notes?: string }[]
    }

    if (!restaurantId || !Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const restaurant = await Restaurant.findById(restaurantId).select({ isSuspended: 1 }).lean()
    if (!restaurant || restaurant.isSuspended) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' })
    }

    // Ensure all items are currently available
    const menuItemIds = items
      .map((i) => i.menuItemId)
      .filter((id): id is string => typeof id === 'string' && Types.ObjectId.isValid(id))

    if (menuItemIds.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one valid item' })
    }

    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } })
      .select({ _id: 1, available: 1, name: 1 })
      .lean()

    const unavailableNames = new Set<string>()
    const availableMap = new Map<string, boolean | undefined>()
    for (const mi of menuItems) {
      availableMap.set(mi._id.toString(), mi.available)
      if (mi.available === false) {
        unavailableNames.add(mi.name)
      }
    }

    if (unavailableNames.size > 0) {
      return res.status(400).json({
        message: 'Some items are currently unavailable',
        unavailableItems: Array.from(unavailableNames),
      })
    }

    const order = await Order.create({
      restaurantId: new Types.ObjectId(restaurantId),
      status: 'new',
      ...(tableNumber ? { tableNumber } : {}),
      ...(notes ? { notes } : {}),
    })

    const orderItems = await OrderItem.insertMany(
      items.map((item) => ({
        orderId: order._id,
        menuItemId: item.menuItemId,
        quantity: item.quantity ?? 1,
        notes: item.notes ?? undefined,
      }))
    )

    const populatedItems = await OrderItem.find({ _id: { $in: orderItems.map((i) => i._id) } })
      .populate('menuItemId')
      .lean()

    const payload = {
      _id: order._id,
      restaurantId: order.restaurantId,
      status: order.status,
      createdAt: order.createdAt,
      tableNumber: order.tableNumber,
      notes: order.notes,
      items: populatedItems.map((oi) => ({
        _id: oi._id,
        quantity: oi.quantity,
        notes: oi.notes ?? undefined,
        menuItem: oi.menuItemId,
      })),
    }

    io.to(restaurantId.toString()).emit('order:new', payload)

    return res.status(201).json({ orderId: order._id, status: order.status })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to create order' })
  }
})

router.get('/restaurants/:restaurantId/orders', async (req, res) => {
  try {
    const { restaurantId } = req.params
    const { status, tableNumber, from, to, includeClosed } = req.query as {
      status?: string
      tableNumber?: string
      from?: string
      to?: string
      includeClosed?: string
    }

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const match: Record<string, unknown> = { restaurantId: new Types.ObjectId(restaurantId) }
    if (status && ['new', 'preparing', 'ready'].includes(status)) {
      match.status = status
    }
    if (tableNumber) {
      match.tableNumber = tableNumber
    }
    if (from || to) {
      const createdAt: Record<string, Date> = {}
      if (from && !Number.isNaN(Date.parse(from))) {
        createdAt.$gte = new Date(from)
      }
      if (to && !Number.isNaN(Date.parse(to))) {
        createdAt.$lte = new Date(to)
      }
      if (Object.keys(createdAt).length > 0) {
        match.createdAt = createdAt
      }
    }

    if (!includeClosed || includeClosed !== 'true') {
      match.closedAt = { $exists: false }
    }

    const orders = await Order.find(match).sort({ createdAt: -1 }).lean()
    const orderIds = orders.map((o) => o._id)

    const orderItems = await OrderItem.find({ orderId: { $in: orderIds } })
      .populate('menuItemId')
      .lean()

    const ordersWithItems = orders.map((order) => ({
      ...order,
      items: orderItems
        .filter((oi) => oi.orderId.toString() === order._id.toString())
        .map((oi) => ({
          _id: oi._id,
          quantity: oi.quantity,
          notes: oi.notes,
          menuItem: oi.menuItemId,
        })),
    }))

    return res.json(ordersWithItems)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load orders' })
  }
})

router.delete('/restaurants/:restaurantId/orders', async (req, res) => {
  try {
    const { restaurantId } = req.params
    const { tableNumber } = req.query as { tableNumber?: string }

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const match: Record<string, unknown> = {
      restaurantId: new Types.ObjectId(restaurantId),
    }

    if (tableNumber) {
      match.tableNumber = tableNumber
    } else {
      match.tableNumber = { $exists: false }
    }

    const result = await Order.updateMany(match, { $set: { closedAt: new Date() } })

    return res.json({ closedOrders: result.modifiedCount ?? 0 })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to clear table' })
  }
})

router.post('/restaurants/:restaurantId/waiter-calls', async (req, res) => {
  try {
    const { restaurantId } = req.params
    const { tableNumber, notes } = req.body as {
      tableNumber?: string
      notes?: string
    }

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const match: Record<string, unknown> = {
      restaurantId: new Types.ObjectId(restaurantId),
      status: 'open',
    }
    if (tableNumber) {
      match.tableNumber = tableNumber
    } else {
      match.tableNumber = { $exists: false }
    }

    const existing = await WaiterCall.findOne(match).lean()
    if (existing) {
      const existingPayload = {
        _id: existing._id,
        restaurantId: existing.restaurantId,
        tableNumber: existing.tableNumber,
        notes: existing.notes,
        status: existing.status,
        createdAt: existing.createdAt,
      }
      return res.status(200).json(existingPayload)
    }

    const call = await WaiterCall.create({
      restaurantId: new Types.ObjectId(restaurantId),
      ...(tableNumber ? { tableNumber } : {}),
      ...(notes ? { notes } : {}),
      status: 'open',
    })

    const payload = {
      _id: call._id,
      restaurantId: call.restaurantId,
      tableNumber: call.tableNumber,
      notes: call.notes,
      status: call.status,
      createdAt: call.createdAt,
    }

    io.to(restaurantId.toString()).emit('waiter:call', payload)

    return res.status(201).json(payload)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to call waiter' })
  }
})

router.get('/restaurants/:restaurantId/waiter-calls', async (req, res) => {
  try {
    const { restaurantId } = req.params

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const calls = await WaiterCall.find({
      restaurantId: new Types.ObjectId(restaurantId),
      status: 'open',
    })
      .sort({ createdAt: -1 })
      .lean()

    return res.json(
      calls.map((call) => ({
        _id: call._id,
        restaurantId: call.restaurantId,
        tableNumber: call.tableNumber,
        notes: call.notes,
        status: call.status,
        createdAt: call.createdAt,
      }))
    )
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load waiter calls' })
  }
})

router.patch('/waiter-calls/:callId/handled', async (req, res) => {
  try {
    const { callId } = req.params

    if (!Types.ObjectId.isValid(callId)) {
      return res.status(400).json({ message: 'Invalid callId' })
    }

    const call = await WaiterCall.findByIdAndUpdate(
      callId,
      { status: 'handled', handledAt: new Date() },
      { new: true }
    ).lean()

    if (!call) {
      return res.status(404).json({ message: 'Waiter call not found' })
    }

    io.to(call.restaurantId.toString()).emit('waiter:call:handled', {
      callId: call._id,
    })

    return res.json({ callId: call._id, status: call.status })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to mark waiter call as handled' })
  }
})

router.patch('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params
    const { status } = req.body as { status?: string }

    if (!Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid orderId' })
    }
    if (!status || !['new', 'preparing', 'ready'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true }).lean()
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    io.to(order.restaurantId.toString()).emit('order:updated', {
      orderId: order._id,
      status: order.status,
    })

    return res.json({ orderId: order._id, status: order.status })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to update order status' })
  }
})

export default router

