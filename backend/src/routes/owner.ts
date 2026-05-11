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

/**
 * Compute start-of-today, start-of-week, and start-of-month as UTC timestamps
 * that correspond to midnight in the restaurant's local timezone.
 *
 * Uses the "shadow date" technique: create a JS Date from the wall-clock time
 * in the target timezone, then subtract the UTC offset to get the true UTC
 * moment.  Works correctly for all fixed offsets and for DST in the vast
 * majority of cases (DST transitions at exactly midnight are extremely rare).
 */
function getDateRangesForTimezone(timezone: string) {
  const safeTimezone = (() => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone })
      return timezone
    } catch {
      return 'UTC'
    }
  })()

  const now = new Date()

  // Get the current wall-clock time in the target timezone as a plain Date
  const localNow = new Date(now.toLocaleString('en-US', { timeZone: safeTimezone }))

  // UTC offset in ms (positive = timezone is ahead of UTC, e.g. UTC+3 → +10800000)
  const utcNow = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzOffsetMs = localNow.getTime() - utcNow.getTime()

  // Start of today
  const localToday = new Date(localNow)
  localToday.setHours(0, 0, 0, 0)
  const startOfToday = new Date(localToday.getTime() - tzOffsetMs)

  // Start of week (Sunday)
  const localWeekStart = new Date(localNow)
  localWeekStart.setDate(localNow.getDate() - localNow.getDay())
  localWeekStart.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(localWeekStart.getTime() - tzOffsetMs)

  // Start of month
  const localMonthStart = new Date(localNow.getFullYear(), localNow.getMonth(), 1)
  const startOfMonth = new Date(localMonthStart.getTime() - tzOffsetMs)

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

    // Load restaurant first so we can use its timezone for date boundaries
    const restaurant = await Restaurant.findById(ownerRestaurantId).select({ currency: 1, timezone: 1 }).lean()
    const timezone = restaurant?.timezone ?? 'UTC'
    const { startOfToday, startOfWeek, startOfMonth } = getDateRangesForTimezone(timezone)

    /**
     * Revenue aggregation helper: joins orders → orderitems and sums
     * quantity * priceAtOrder (the snapshotted price, not the current menu price).
     * Falls back to joining menuitems.price for legacy rows that pre-date the snapshot.
     */
    function revenueAgg(matchExtra: Record<string, unknown>) {
      return Order.aggregate([
        { $match: { restaurantId: rid, ...matchExtra } },
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
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: [
                  '$items.quantity',
                  // Use snapshotted price when available, otherwise fall back to 0
                  // (legacy orders without snapshot are excluded from revenue to avoid
                  //  using stale current menu prices which could be misleading)
                  { $ifNull: ['$items.priceAtOrder', 0] },
                ],
              },
            },
          },
        },
      ])
    }

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
<<<<<<< HEAD
      revenueTodayResult,
      revenueThisWeekResult,
      revenueThisMonthResult,
=======
      restaurant,
      revenueFacets,
>>>>>>> chaim
    ] = await Promise.all([
      Order.countDocuments({ restaurantId: rid, createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ restaurantId: rid, createdAt: { $gte: startOfWeek } }),
      Order.countDocuments({ restaurantId: rid, createdAt: { $gte: startOfMonth } }),
<<<<<<< HEAD
      WaiterCall.countDocuments({ restaurantId: rid, status: 'handled' }),
      WaiterCall.countDocuments({
        restaurantId: rid,
        status: 'handled',
        handledAt: { $gte: startOfWeek },
      }),
      ChatEvent.countDocuments({ restaurantId: rid }),
      ChatEvent.countDocuments({
        restaurantId: rid,
        createdAt: { $gte: startOfWeek },
      }),
      revenueAgg({}),
=======
>>>>>>> chaim
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
<<<<<<< HEAD
      revenueAgg({ createdAt: { $gte: startOfToday } }),
      revenueAgg({ createdAt: { $gte: startOfWeek } }),
      revenueAgg({ createdAt: { $gte: startOfMonth } }),
=======
      Restaurant.findById(ownerRestaurantId).select({ currency: 1 }).lean(),
      getRevenueFacets(rid, startOfToday, startOfWeek, startOfMonth),
>>>>>>> chaim
    ])

    const { totalRevenue, revenueToday, revenueThisWeek, revenueThisMonth } = revenueFacets
    const avgOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : null
    const avgWaiterResponseMinutes =
      avgWaiterResult[0]?.avgMinutes != null
        ? Math.round(avgWaiterResult[0].avgMinutes * 10) / 10
        : null

<<<<<<< HEAD
    const revenueToday = revenueTodayResult[0]?.total ?? 0
    const revenueThisWeek = revenueThisWeekResult[0]?.total ?? 0
    const revenueThisMonth = revenueThisMonthResult[0]?.total ?? 0

=======
>>>>>>> chaim
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
