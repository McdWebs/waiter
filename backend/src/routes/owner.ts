import express from 'express'
import { Types } from 'mongoose'
import { Order } from '../models/Order'
import { WaiterCall } from '../models/WaiterCall'
import { ChatEvent } from '../models/ChatEvent'
import { Restaurant } from '../models/Restaurant'
import { authenticateOwner } from '../middleware/auth'

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

router.get('/owner/stats', authenticateOwner, async (req, res) => {
  try {
    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
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

    const [
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      waiterCallsHandled,
      waiterCallsHandledThisWeek,
      chatSessionsTotal,
      chatSessionsThisWeek,
      revenueResult,
      orderCountResult,
      avgWaiterResult,
      revenueTodayResult,
      revenueThisWeekResult,
      revenueThisMonthResult,
    ] = await Promise.all([
      Order.countDocuments({ restaurantId: rid, createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ restaurantId: rid, createdAt: { $gte: startOfWeek } }),
      Order.countDocuments({ restaurantId: rid, createdAt: { $gte: startOfMonth } }),
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
      Order.countDocuments({ restaurantId: rid }),
      WaiterCall.aggregate([
        {
          $match: {
            restaurantId: rid,
            status: 'handled',
            handledAt: { $exists: true, $ne: null },
          },
        },
        {
          $project: {
            minutes: {
              $divide: [
                { $subtract: ['$handledAt', '$createdAt'] },
                60 * 1000,
              ],
            },
          },
        },
        { $group: { _id: null, avgMinutes: { $avg: '$minutes' } } },
      ]),
      revenueAgg({ createdAt: { $gte: startOfToday } }),
      revenueAgg({ createdAt: { $gte: startOfWeek } }),
      revenueAgg({ createdAt: { $gte: startOfMonth } }),
    ])

    const totalRevenue = revenueResult[0]?.total ?? 0
    const totalOrders = orderCountResult
    const avgOrderValue =
      totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : null
    const avgWaiterResponseMinutes =
      avgWaiterResult[0]?.avgMinutes != null
        ? Math.round(avgWaiterResult[0].avgMinutes * 10) / 10
        : null

    const revenueToday = revenueTodayResult[0]?.total ?? 0
    const revenueThisWeek = revenueThisWeekResult[0]?.total ?? 0
    const revenueThisMonth = revenueThisMonthResult[0]?.total ?? 0

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

export default router
