import express from 'express'
import { Types } from 'mongoose'
import { Promotion } from '../models/Promotion'
import { authenticateOwner } from '../middleware/auth'

const router = express.Router()

// ── Public: get active promotions for a restaurant (guests check promo codes) ──
router.get('/restaurants/:restaurantId/promotions/active', async (req, res) => {
  try {
    const { restaurantId } = req.params
    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const promotions = await Promotion.find({
      restaurantId: new Types.ObjectId(restaurantId),
      active: true,
    }).lean()

    // Filter promotions that are currently time-active
    const active = promotions.filter((p) => {
      // Check day restriction
      if (p.activeDays && p.activeDays.length > 0 && !p.activeDays.includes(currentDay)) return false
      // Check time restriction
      if (p.activeFrom && p.activeTo) {
        if (currentTime < p.activeFrom || currentTime > p.activeTo) return false
      }
      return true
    })

    return res.json(active)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load promotions' })
  }
})

// ── Public: validate a coupon code ────────────────────────────────────────────
router.post('/restaurants/:restaurantId/promotions/validate', async (req, res) => {
  try {
    const { restaurantId } = req.params
    const { couponCode, cartTotal } = req.body as { couponCode?: string; cartTotal?: number }

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }
    if (!couponCode) return res.status(400).json({ message: 'Coupon code is required' })

    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const promo = await Promotion.findOne({
      restaurantId: new Types.ObjectId(restaurantId),
      active: true,
      couponCode: { $regex: new RegExp(`^${couponCode}$`, 'i') },
    }).lean()

    if (!promo) return res.status(404).json({ message: 'Invalid or expired coupon code' })

    // Check day restriction
    if (promo.activeDays && promo.activeDays.length > 0 && !promo.activeDays.includes(currentDay)) {
      return res.status(400).json({ message: 'Coupon is not valid today' })
    }
    // Check time restriction
    if (promo.activeFrom && promo.activeTo) {
      if (currentTime < promo.activeFrom || currentTime > promo.activeTo) {
        return res.status(400).json({ message: `Coupon is only valid ${promo.activeFrom}–${promo.activeTo}` })
      }
    }
    // Check minimum order
    if (promo.minOrderAmount && (cartTotal ?? 0) < promo.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount is ${promo.minOrderAmount} to use this coupon`,
      })
    }

    return res.json({
      valid: true,
      promotion: {
        _id: promo._id,
        title: promo.title,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      },
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to validate coupon' })
  }
})

// ── Owner: list all promotions ────────────────────────────────────────────────
router.get('/owner/promotions', authenticateOwner, async (req, res) => {
  try {
    const rid = req.ownerRestaurantId
    if (!rid) return res.status(403).json({ message: 'Forbidden' })

    const promotions = await Promotion.find({ restaurantId: new Types.ObjectId(rid) })
      .sort({ createdAt: -1 })
      .lean()
    return res.json(promotions)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load promotions' })
  }
})

// ── Owner: create promotion ───────────────────────────────────────────────────
router.post('/owner/promotions', authenticateOwner, async (req, res) => {
  try {
    const rid = req.ownerRestaurantId
    if (!rid) return res.status(403).json({ message: 'Forbidden' })

    const {
      title, description, discountType, discountValue,
      activeFrom, activeTo, activeDays, minOrderAmount, couponCode,
    } = req.body as {
      title?: string; description?: string; discountType?: string; discountValue?: number
      activeFrom?: string; activeTo?: string; activeDays?: number[]
      minOrderAmount?: number; couponCode?: string
    }

    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' })
    if (!discountType || !['percent', 'fixed'].includes(discountType)) {
      return res.status(400).json({ message: 'discountType must be percent or fixed' })
    }
    if (typeof discountValue !== 'number' || discountValue < 0) {
      return res.status(400).json({ message: 'discountValue must be a non-negative number' })
    }

    const createPayload: Parameters<typeof Promotion.create>[0] = {
      restaurantId: new Types.ObjectId(rid),
      title: title.trim(),
      discountType: discountType as 'percent' | 'fixed',
      discountValue,
      activeDays: activeDays ?? [],
      minOrderAmount: minOrderAmount ?? 0,
      active: true,
    }
    if (description?.trim()) createPayload.description = description.trim()
    if (activeFrom?.trim()) createPayload.activeFrom = activeFrom.trim()
    if (activeTo?.trim()) createPayload.activeTo = activeTo.trim()
    if (couponCode?.trim()) createPayload.couponCode = couponCode.trim()

    const promo = await Promotion.create(createPayload)

    return res.status(201).json(promo)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to create promotion' })
  }
})

// ── Owner: update promotion ───────────────────────────────────────────────────
router.patch('/owner/promotions/:promoId', authenticateOwner, async (req, res) => {
  try {
    const rid = req.ownerRestaurantId
    const promoId = req.params['promoId'] as string
    if (!rid || !promoId || !Types.ObjectId.isValid(promoId)) return res.status(400).json({ message: 'Invalid request' })

    const promo = await Promotion.findOneAndUpdate(
      { _id: new Types.ObjectId(promoId), restaurantId: new Types.ObjectId(rid) },
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    ).lean()

    if (!promo) return res.status(404).json({ message: 'Promotion not found' })
    return res.json(promo)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to update promotion' })
  }
})

// ── Owner: delete promotion ───────────────────────────────────────────────────
router.delete('/owner/promotions/:promoId', authenticateOwner, async (req, res) => {
  try {
    const rid = req.ownerRestaurantId
    const promoId = req.params['promoId'] as string
    if (!rid || !promoId || !Types.ObjectId.isValid(promoId)) return res.status(400).json({ message: 'Invalid request' })

    await Promotion.deleteOne({ _id: new Types.ObjectId(promoId), restaurantId: new Types.ObjectId(rid) })
    return res.json({ deleted: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to delete promotion' })
  }
})

export default router
