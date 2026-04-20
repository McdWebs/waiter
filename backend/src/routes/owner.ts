import express from 'express'
import { Types } from 'mongoose'
import { Order } from '../models/Order'
import { WaiterCall } from '../models/WaiterCall'
import { ChatEvent } from '../models/ChatEvent'
import { Restaurant } from '../models/Restaurant'
import { OrderItem } from '../models/OrderItem'
import { MenuItem } from '../models/MenuItem'
import { authenticateOwner } from '../middleware/auth'
import ExcelJS from 'exceljs'

const router = express.Router()

function getDateRanges() {
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return { startOfToday, startOfWeek, startOfMonth }
}

// ── Revenue helper using a single $facet pipeline ────────────────────────────
async function getRevenueFacets(rid: Types.ObjectId, startOfToday: Date, startOfWeek: Date, startOfMonth: Date) {
  const revenueBase = [
    {
      $lookup: {
        from: 'orderitems',
        localField: '_id',
        foreignField: 'orderId',
        as: 'items',
      },
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'menuitems',
        localField: 'items.menuItemId',
        foreignField: '_id',
        as: 'menuItem',
      },
    },
    { $unwind: '$menuItem' },
  ]

  const result = await Order.aggregate([
    { $match: { restaurantId: rid } },
    ...revenueBase,
    {
      $facet: {
        total: [
          { $group: { _id: null, v: { $sum: { $multiply: ['$items.quantity', '$menuItem.price'] } } } },
        ],
        today: [
          { $match: { createdAt: { $gte: startOfToday } } },
          { $group: { _id: null, v: { $sum: { $multiply: ['$items.quantity', '$menuItem.price'] } } } },
        ],
        week: [
          { $match: { createdAt: { $gte: startOfWeek } } },
          { $group: { _id: null, v: { $sum: { $multiply: ['$items.quantity', '$menuItem.price'] } } } },
        ],
        month: [
          { $match: { createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, v: { $sum: { $multiply: ['$items.quantity', '$menuItem.price'] } } } },
        ],
      },
    },
  ])

  const r = result[0] ?? {}
  return {
    totalRevenue: r.total?.[0]?.v ?? 0,
    revenueToday: r.today?.[0]?.v ?? 0,
    revenueThisWeek: r.week?.[0]?.v ?? 0,
    revenueThisMonth: r.month?.[0]?.v ?? 0,
  }
}

// ── GET /api/owner/stats ─────────────────────────────────────────────────────
router.get('/owner/stats', authenticateOwner, async (req, res) => {
  try {
    const ownerRestaurantId = req.ownerRestaurantId
    if (!ownerRestaurantId || !Types.ObjectId.isValid(ownerRestaurantId)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const rid = new Types.ObjectId(ownerRestaurantId)
    const { startOfToday, startOfWeek, startOfMonth } = getDateRanges()

    // Run all counts + revenue facet in parallel (single DB round-trip for revenue)
    const [
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      totalOrders,
      waiterCallsHandled,
      waiterCallsHandledThisWeek,
      chatSessionsTotal,
      chatSessionsThisWeek,
      avgWaiterResult,
      restaurant,
      revenueFacets,
    ] = await Promise.all([
      Order.countDocuments({ restaurantId: rid, createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ restaurantId: rid, createdAt: { $gte: startOfWeek } }),
      Order.countDocuments({ restaurantId: rid, createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({ restaurantId: rid }),
      WaiterCall.countDocuments({ restaurantId: rid, status: 'handled' }),
      WaiterCall.countDocuments({ restaurantId: rid, status: 'handled', handledAt: { $gte: startOfWeek } }),
      ChatEvent.countDocuments({ restaurantId: rid }),
      ChatEvent.countDocuments({ restaurantId: rid, createdAt: { $gte: startOfWeek } }),
      WaiterCall.aggregate([
        { $match: { restaurantId: rid, status: 'handled', handledAt: { $exists: true, $ne: null } } },
        { $project: { minutes: { $divide: [{ $subtract: ['$handledAt', '$createdAt'] }, 60 * 1000] } } },
        { $group: { _id: null, avgMinutes: { $avg: '$minutes' } } },
      ]),
      Restaurant.findById(ownerRestaurantId).select({ currency: 1 }).lean(),
      getRevenueFacets(rid, startOfToday, startOfWeek, startOfMonth),
    ])

    const { totalRevenue, revenueToday, revenueThisWeek, revenueThisMonth } = revenueFacets
    const avgOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : null
    const avgWaiterResponseMinutes =
      avgWaiterResult[0]?.avgMinutes != null
        ? Math.round(avgWaiterResult[0].avgMinutes * 10) / 10
        : null

    return res.json({
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      totalOrders,
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      totalRevenue,
      avgOrderValue,
      waiterCallsHandled,
      waiterCallsHandledThisWeek,
      avgWaiterResponseMinutes,
      chatSessionsTotal,
      chatSessionsThisWeek,
      currency: restaurant?.currency ?? 'USD',
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load stats' })
  }
})

// ── GET /api/owner/orders/export  → Excel file ──────────────────────────────
router.get('/owner/orders/export', authenticateOwner, async (req, res) => {
  try {
    const ownerRestaurantId = req.ownerRestaurantId
    if (!ownerRestaurantId || !Types.ObjectId.isValid(ownerRestaurantId)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { from, to } = req.query as { from?: string; to?: string }
    const rid = new Types.ObjectId(ownerRestaurantId)

    const match: Record<string, unknown> = { restaurantId: rid }
    if (from || to) {
      const createdAt: Record<string, Date> = {}
      if (from && !Number.isNaN(Date.parse(from))) createdAt.$gte = new Date(from)
      if (to && !Number.isNaN(Date.parse(to))) createdAt.$lte = new Date(to)
      if (Object.keys(createdAt).length > 0) match.createdAt = createdAt
    }

    const orders = await Order.find(match).sort({ createdAt: -1 }).lean()
    const orderIds = orders.map((o) => o._id)
    const orderItems = await OrderItem.find({ orderId: { $in: orderIds } })
      .populate<{ menuItemId: { name: string; price: number } }>('menuItemId', 'name price')
      .lean()

    const restaurant = await Restaurant.findById(ownerRestaurantId).select({ name: 1, currency: 1 }).lean()
    const currency = restaurant?.currency ?? 'USD'

    // Build workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BotAi'
    workbook.created = new Date()

    const ws = workbook.addWorksheet('Orders')
    ws.columns = [
      { header: 'Order ID', key: 'orderId', width: 26 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Table', key: 'table', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Item', key: 'item', width: 30 },
      { header: 'Qty', key: 'qty', width: 6 },
      { header: `Price (${currency})`, key: 'price', width: 14 },
      { header: `Total (${currency})`, key: 'total', width: 14 },
    ]

    // Style header row
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    }
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    for (const order of orders) {
      const items = orderItems.filter((oi) => oi.orderId.toString() === order._id.toString())
      if (items.length === 0) {
        ws.addRow({
          orderId: order._id.toString(),
          date: order.createdAt.toISOString().replace('T', ' ').slice(0, 19),
          table: order.tableNumber ?? '—',
          status: order.status,
          item: '—',
          qty: '',
          price: '',
          total: '',
        })
      } else {
        items.forEach((oi, idx) => {
          const mi = oi.menuItemId as { name: string; price: number }
          ws.addRow({
            orderId: idx === 0 ? order._id.toString() : '',
            date: idx === 0 ? order.createdAt.toISOString().replace('T', ' ').slice(0, 19) : '',
            table: idx === 0 ? (order.tableNumber ?? '—') : '',
            status: idx === 0 ? order.status : '',
            item: mi?.name ?? '?',
            qty: oi.quantity,
            price: mi?.price ?? 0,
            total: (mi?.price ?? 0) * oi.quantity,
          })
        })
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.xlsx"`)
    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to export orders' })
  }
})

export default router
