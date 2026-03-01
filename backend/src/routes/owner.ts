import express from 'express'
import { Types } from 'mongoose'
import { Order } from '../models/Order'
import { WaiterCall } from '../models/WaiterCall'
import { ChatEvent } from '../models/ChatEvent'
import { Restaurant } from '../models/Restaurant'
import { authenticateOwner } from '../middleware/auth'

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

router.get('/owner/stats', authenticateOwner, async (req, res) => {
  try {
    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId || !Types.ObjectId.isValid(ownerRestaurantId)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const rid = new Types.ObjectId(ownerRestaurantId)
    const { startOfToday, startOfWeek, startOfMonth } = getDateRanges()

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
      restaurant,
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
      Order.aggregate([
        { $match: { restaurantId: rid } },
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
        {
          $group: {
            _id: null,
            total: {
              $sum: { $multiply: ['$items.quantity', '$menuItem.price'] },
            },
          },
        },
      ]),
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
      Restaurant.findById(ownerRestaurantId).select({ currency: 1 }).lean(),
    ])

    const totalRevenue = revenueResult[0]?.total ?? 0
    const totalOrders = orderCountResult
    const avgOrderValue =
      totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : null
    const avgWaiterResponseMinutes =
      avgWaiterResult[0]?.avgMinutes != null
        ? Math.round(avgWaiterResult[0].avgMinutes * 10) / 10
        : null

    const revenueTodayResult = await Order.aggregate([
      { $match: { restaurantId: rid, createdAt: { $gte: startOfToday } } },
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
      {
        $group: {
          _id: null,
          total: {
            $sum: { $multiply: ['$items.quantity', '$menuItem.price'] },
          },
        },
      },
    ])
    const revenueThisWeekResult = await Order.aggregate([
      { $match: { restaurantId: rid, createdAt: { $gte: startOfWeek } } },
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
      {
        $group: {
          _id: null,
          total: {
            $sum: { $multiply: ['$items.quantity', '$menuItem.price'] },
          },
        },
      },
    ])
    const revenueThisMonthResult = await Order.aggregate([
      { $match: { restaurantId: rid, createdAt: { $gte: startOfMonth } } },
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
      {
        $group: {
          _id: null,
          total: {
            $sum: { $multiply: ['$items.quantity', '$menuItem.price'] },
          },
        },
      },
    ])

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
