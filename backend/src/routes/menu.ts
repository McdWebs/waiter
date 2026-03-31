import express from 'express'
import { Types } from 'mongoose'
import { Restaurant } from '../models/Restaurant'
import { MenuCategory } from '../models/MenuCategory'
import { MenuItem } from '../models/MenuItem'
import { BusinessPlan } from '../models/BusinessPlan'
import { authenticateOwner } from '../middleware/auth'
import multer from 'multer'
import { uploadMenuItemImage, uploadRestaurantLogo } from '../services/s3Client'

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
})

router.get('/restaurants/:slug/menu', async (req, res) => {
  try {
    const { slug } = req.params
    const restaurant = await Restaurant.findOne({ slug }).lean()
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }
    if (restaurant.isSuspended) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    const categories = await MenuCategory.find({ restaurantId: restaurant._id })
      .sort({ position: 1, name: 1 })
      .lean()
    const items = await MenuItem.find({
      categoryId: { $in: categories.map((c) => c._id) },
    })
      .sort({ position: 1, name: 1 })
      .lean()

    const itemsForGuests = items.filter((item) => item.available !== false)

    const categoriesWithItems = categories.map((category) => ({
      ...category,
      items: itemsForGuests.filter((item) => item.categoryId.toString() === category._id.toString()),
    }))

    const businessPlansRaw = await BusinessPlan.find({
      restaurantId: restaurant._id,
      active: true,
    })
      .sort({ position: 1, name: 1 })
      .lean()

    const businessPlans = businessPlansRaw.map((plan) => {
      const planItems = (plan.items ?? []).map((entry) => {
        const mi = itemsForGuests.find(
          (it) => it._id.toString() === entry.menuItemId.toString()
        )
        if (!mi) return null
        return {
          _id: mi._id,
          name: mi.name,
          description: mi.description,
          price: mi.price,
          allergens: mi.allergens ?? [],
          tags: mi.tags ?? [],
          position: mi.position,
          imageUrl: mi.imageUrl,
          available: mi.available,
          quantity: entry.quantity && entry.quantity > 0 ? entry.quantity : 1,
        }
      }).filter((v) => v !== null) as {
        _id: typeof items[0]['_id']
        name: string
        description: string
        price: number
        allergens: string[]
        tags: string[]
        position?: number
        imageUrl?: string
        available?: boolean
        quantity: number
      }[]

      return {
        _id: plan._id,
        name: plan.name,
        description: plan.description,
        timeNote: plan.timeNote,
        price: plan.price,
        position: plan.position,
        items: planItems,
      }
    })

    return res.json({ restaurant, categories: categoriesWithItems, businessPlans })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load menu' })
  }
})

router.post('/restaurants', async (req, res) => {
  try {
    const { name, slug, currency } = req.body as {
      name?: string
      slug?: string
      currency?: string
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Restaurant name is required' })
    }

    const normalizedSlug =
      (slug && slug.trim()) ||
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    if (!normalizedSlug) {
      return res.status(400).json({ message: 'Valid slug is required' })
    }

    const existing = await Restaurant.findOne({ slug: normalizedSlug }).lean()
    if (existing) {
      return res.status(409).json({ message: 'Slug is already in use' })
    }

    const payload: { name: string; slug: string; currency?: string } = {
      name: name.trim(),
      slug: normalizedSlug,
    }

    if (typeof currency === 'string' && currency.trim()) {
      payload.currency = currency.trim().toUpperCase()
    }

    const restaurant = await Restaurant.create(payload)

    return res.status(201).json(restaurant)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to create restaurant' })
  }
})

router.get('/restaurants/:restaurantId/admin-menu', authenticateOwner, async (req, res) => {
  try {
    const restaurantIdParam = String(req.params.restaurantId)

    if (!Types.ObjectId.isValid(restaurantIdParam)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId || ownerRestaurantId !== restaurantIdParam) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const restaurant = await Restaurant.findById(restaurantIdParam).lean()
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    const categories = await MenuCategory.find({ restaurantId: restaurant._id })
      .sort({ position: 1, name: 1 })
      .lean()
    const items = await MenuItem.find({
      categoryId: { $in: categories.map((c) => c._id) },
    })
      .sort({ position: 1, name: 1 })
      .lean()

    const categoriesWithItems = categories.map((category) => ({
      ...category,
      items: items.filter((item) => item.categoryId.toString() === category._id.toString()),
    }))

    const businessPlansRaw = await BusinessPlan.find({
      restaurantId: restaurant._id,
    })
      .sort({ position: 1, name: 1 })
      .lean()

    const businessPlans = businessPlansRaw.map((plan) => {
      const planItems = (plan.items ?? []).map((entry) => {
        const mi = items.find((it) => it._id.toString() === entry.menuItemId.toString())
        if (!mi) return null
        return {
          _id: mi._id,
          name: mi.name,
          description: mi.description,
          price: mi.price,
          allergens: mi.allergens ?? [],
          tags: mi.tags ?? [],
          position: mi.position,
          imageUrl: mi.imageUrl,
          available: mi.available,
          quantity: entry.quantity && entry.quantity > 0 ? entry.quantity : 1,
        }
      }).filter((v) => v !== null)

      return {
        _id: plan._id,
        name: plan.name,
        description: plan.description,
        timeNote: plan.timeNote,
        price: plan.price,
        position: plan.position,
        active: plan.active,
        items: planItems,
      }
    })

    return res.json({ restaurant, categories: categoriesWithItems, businessPlans })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load admin menu' })
  }
})

router.patch('/restaurants/:restaurantId', authenticateOwner, async (req, res) => {
  try {
    const restaurantIdParam = String(req.params.restaurantId)
    const body = req.body as Record<string, unknown>

    if (!Types.ObjectId.isValid(restaurantIdParam)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId || ownerRestaurantId !== restaurantIdParam) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const update: Record<string, unknown> = {}
    let unset: Record<string, 1> | undefined
    if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
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
    if (typeof body.aiInstructions === 'string') {
      const trimmed = body.aiInstructions.trim()
      if (trimmed) {
        update.aiInstructions = trimmed
      } else {
        unset = { ...(unset ?? {}), aiInstructions: 1 }
      }
    }
    if (typeof body.printerEnabled === 'boolean') update.printerEnabled = body.printerEnabled
    if (typeof body.printerName === 'string') update.printerName = body.printerName.trim() || undefined
    if (typeof body.businessPlanEnabled === 'boolean')
      update.businessPlanEnabled = body.businessPlanEnabled
    if (typeof body.businessPlanTitle === 'string')
      update.businessPlanTitle = body.businessPlanTitle.trim() || undefined
    if (typeof body.businessPlanDescription === 'string')
      update.businessPlanDescription = body.businessPlanDescription.trim() || undefined
    if (typeof body.businessPlanTimeNote === 'string')
      update.businessPlanTimeNote = body.businessPlanTimeNote.trim() || undefined
    if (typeof body.businessPlanPrice === 'number' && body.businessPlanPrice >= 0)
      update.businessPlanPrice = body.businessPlanPrice
    if (typeof body.logoUrl === 'string') {
      const trimmed = body.logoUrl.trim()
      if (trimmed) {
        update.logoUrl = trimmed
      } else {
        unset = { ...(unset ?? {}), logoUrl: 1 }
      }
    }
    // Social / web presence links
    for (const field of ['websiteUrl', 'instagramUrl', 'facebookUrl'] as const) {
      if (typeof body[field] === 'string') {
        const trimmed = (body[field] as string).trim()
        if (trimmed) {
          update[field] = trimmed
        } else {
          unset = { ...(unset ?? {}), [field]: 1 }
        }
      }
    }

    // Build an explicit update operator document so that $set and $unset are
    // never mixed with plain field keys.  Mixing plain keys with $ operators
    // causes Mongoose to skip its auto-$set wrapping, which silently drops
    // any non-operator fields from the update.
    const updateOp: Record<string, unknown> = {}
    if (Object.keys(update).length > 0) {
      updateOp.$set = update
    }
    if (unset && Object.keys(unset).length > 0) {
      updateOp.$unset = unset
    }

    const restaurant = await Restaurant.findByIdAndUpdate(restaurantIdParam, updateOp, {
      returnDocument: 'after',
    }).lean()

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

router.post(
  '/restaurants/:restaurantId/logo',
  authenticateOwner,
  upload.single('logo'),
  async (req, res) => {
    try {
      const restaurantIdParam = String(req.params.restaurantId)

      if (!Types.ObjectId.isValid(restaurantIdParam)) {
        return res.status(400).json({ message: 'Invalid restaurantId' })
      }

      const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
      if (!ownerRestaurantId || ownerRestaurantId !== restaurantIdParam) {
        return res.status(403).json({ message: 'Forbidden' })
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Logo image is required' })
      }

      let logoUrl: string
      try {
        logoUrl = await uploadRestaurantLogo(req.file)
      } catch (err) {
        const message = (err as Error).message || 'Failed to upload logo'
        return res.status(400).json({ message })
      }

      const restaurant = await Restaurant.findByIdAndUpdate(
        restaurantIdParam,
        { logoUrl },
        { returnDocument: 'after' }
      ).lean()

      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' })
      }

      return res.json(restaurant)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      return res.status(500).json({ message: 'Failed to update restaurant logo' })
    }
  }
)

router.post('/restaurants/:restaurantId/categories', authenticateOwner, async (req, res) => {
  try {
    const restaurantIdParam = String(req.params.restaurantId)
    const { name } = req.body as { name?: string }

    if (!Types.ObjectId.isValid(restaurantIdParam)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }
    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId || ownerRestaurantId !== restaurantIdParam) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' })
    }

    const existing = await MenuCategory.find({ restaurantId: new Types.ObjectId(restaurantIdParam) })
      .sort({ position: -1 })
      .limit(1)
      .lean()
    const lastCategory = existing[0]
    const nextPosition =
      lastCategory && typeof lastCategory.position === 'number' ? lastCategory.position + 1 : 0

    const category = await MenuCategory.create({
      restaurantId: new Types.ObjectId(restaurantIdParam),
      name: name.trim(),
      position: nextPosition,
    })

    return res.status(201).json(category)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to create category' })
  }
})

router.get('/restaurants/:restaurantId/business-plans', authenticateOwner, async (req, res) => {
  try {
    const restaurantIdParam = String(req.params.restaurantId)

    if (!Types.ObjectId.isValid(restaurantIdParam)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId || ownerRestaurantId !== restaurantIdParam) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const plans = await BusinessPlan.find({
      restaurantId: new Types.ObjectId(restaurantIdParam),
    })
      .sort({ position: 1, name: 1 })
      .lean()

    return res.json(plans)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load business plans' })
  }
})

router.post('/restaurants/:restaurantId/business-plans', authenticateOwner, async (req, res) => {
  try {
    const restaurantIdParam = String(req.params.restaurantId)
    const body = req.body as {
      name?: string
      description?: string
      timeNote?: string
      price?: number
      items?: { menuItemId?: string; quantity?: number }[]
      active?: boolean
    }

    if (!Types.ObjectId.isValid(restaurantIdParam)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId || ownerRestaurantId !== restaurantIdParam) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const price = typeof body.price === 'number' ? body.price : NaN
    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ message: 'Price must be a non-negative number' })
    }

    const itemsInput = Array.isArray(body.items) ? body.items : []
    const items = itemsInput
      .map((entry) => {
        if (!entry?.menuItemId || !Types.ObjectId.isValid(entry.menuItemId)) return null
        const quantity =
          typeof entry.quantity === 'number' && entry.quantity > 0 ? entry.quantity : 1
        return {
          menuItemId: new Types.ObjectId(entry.menuItemId),
          quantity,
        }
      })
      .filter((v) => v !== null) as { menuItemId: Types.ObjectId; quantity: number }[]

    const existing = await BusinessPlan.find({
      restaurantId: new Types.ObjectId(restaurantIdParam),
    })
      .sort({ position: -1 })
      .limit(1)
      .lean()
    const last = existing[0]
    const nextPosition =
      last && typeof last.position === 'number' ? last.position + 1 : 0

    const description =
      typeof body.description === 'string' ? body.description.trim() : undefined
    const timeNote = typeof body.timeNote === 'string' ? body.timeNote.trim() : undefined

    const plan = await BusinessPlan.create({
      restaurantId: new Types.ObjectId(restaurantIdParam),
      name,
      price,
      position: nextPosition,
      active: body.active !== false,
      items,
      ...(description ? { description } : {}),
      ...(timeNote ? { timeNote } : {}),
    })

    return res.status(201).json(plan)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to create business plan' })
  }
})

router.patch('/business-plans/:businessPlanId', authenticateOwner, async (req, res) => {
  try {
    const planIdParam = String(req.params.businessPlanId)
    const body = req.body as {
      name?: string
      description?: string
      timeNote?: string
      price?: number
      position?: number
      active?: boolean
      items?: { menuItemId?: string; quantity?: number }[]
    }

    if (!Types.ObjectId.isValid(planIdParam)) {
      return res.status(400).json({ message: 'Invalid businessPlanId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId || !Types.ObjectId.isValid(ownerRestaurantId)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const ownerRestaurantObjectId = new Types.ObjectId(ownerRestaurantId)

    const existing = await BusinessPlan.findById(planIdParam).lean()
    if (!existing || existing.restaurantId.toString() !== ownerRestaurantObjectId.toString()) {
      return res.status(404).json({ message: 'Business plan not found' })
    }

    const update: Record<string, unknown> = {}

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim()
      if (!trimmed) {
        return res.status(400).json({ message: 'Name cannot be empty' })
      }
      update.name = trimmed
    }
    if (typeof body.description === 'string') {
      update.description = body.description.trim() || undefined
    }
    if (typeof body.timeNote === 'string') {
      update.timeNote = body.timeNote.trim() || undefined
    }
    if (typeof body.price === 'number') {
      if (body.price < 0) {
        return res.status(400).json({ message: 'Price must be a non-negative number' })
      }
      update.price = body.price
    }
    if (typeof body.position === 'number' && !Number.isNaN(body.position)) {
      update.position = body.position
    }
    if (typeof body.active === 'boolean') {
      update.active = body.active
    }
    if (Array.isArray(body.items)) {
      const items = body.items
        .map((entry) => {
          if (!entry?.menuItemId || !Types.ObjectId.isValid(entry.menuItemId)) return null
          const quantity =
            typeof entry.quantity === 'number' && entry.quantity > 0 ? entry.quantity : 1
          return {
            menuItemId: new Types.ObjectId(entry.menuItemId),
            quantity,
          }
        })
        .filter((v) => v !== null) as { menuItemId: Types.ObjectId; quantity: number }[]
      update.items = items
    }

    const plan = await BusinessPlan.findByIdAndUpdate(planIdParam, update, {
      returnDocument: 'after',
    }).lean()

    if (!plan) {
      return res.status(404).json({ message: 'Business plan not found' })
    }

    return res.json(plan)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to update business plan' })
  }
})

router.delete('/business-plans/:businessPlanId', authenticateOwner, async (req, res) => {
  try {
    const planIdParam = String(req.params.businessPlanId)

    if (!Types.ObjectId.isValid(planIdParam)) {
      return res.status(400).json({ message: 'Invalid businessPlanId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId || !Types.ObjectId.isValid(ownerRestaurantId)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const ownerRestaurantObjectId = new Types.ObjectId(ownerRestaurantId)

    const existing = await BusinessPlan.findById(planIdParam).lean()
    if (!existing || existing.restaurantId.toString() !== ownerRestaurantObjectId.toString()) {
      return res.status(404).json({ message: 'Business plan not found' })
    }

    await BusinessPlan.deleteOne({ _id: new Types.ObjectId(planIdParam) })

    return res.json({ success: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to delete business plan' })
  }
})

router.patch('/categories/:categoryId', authenticateOwner, async (req, res) => {
  try {
    const categoryIdParam = String(req.params.categoryId)
    const { name, position } = req.body as { name?: string; position?: number }

    if (!Types.ObjectId.isValid(categoryIdParam)) {
      return res.status(400).json({ message: 'Invalid categoryId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const ownerRestaurantObjectId = new Types.ObjectId(ownerRestaurantId)

    const update: Record<string, unknown> = {}
    if (typeof name === 'string') {
      update.name = name.trim()
    }
    if (typeof position === 'number' && !Number.isNaN(position)) {
      update.position = position
    }

    const category = await MenuCategory.findOneAndUpdate(
      {
        _id: new Types.ObjectId(categoryIdParam),
        restaurantId: ownerRestaurantObjectId,
      },
      update,
      {
        returnDocument: 'after',
      }
    ).lean()

    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }

    return res.json(category)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to update category' })
  }
})

router.delete('/categories/:categoryId', authenticateOwner, async (req, res) => {
  try {
    const categoryIdParam = String(req.params.categoryId)

    if (!Types.ObjectId.isValid(categoryIdParam)) {
      return res.status(400).json({ message: 'Invalid categoryId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const ownerRestaurantObjectId = new Types.ObjectId(ownerRestaurantId)

    const category = await MenuCategory.findOneAndDelete({
      _id: new Types.ObjectId(categoryIdParam),
      restaurantId: ownerRestaurantObjectId,
    }).lean()
    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }

    await MenuItem.deleteMany({ categoryId: category._id })

    return res.json({ success: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to delete category' })
  }
})

router.post(
  '/categories/:categoryId/items',
  authenticateOwner,
  upload.single('image'),
  async (req, res) => {
    try {
      const categoryIdParam = String(req.params.categoryId)
      const { name, description } = req.body as {
        name?: string
        description?: string
      }

      const price =
        typeof (req.body as any).price === 'string'
          ? Number((req.body as any).price)
          : (req.body as any).price

      const rawAllergens =
        typeof (req.body as any).allergens === 'string'
          ? ((req.body as any).allergens as string).split(',').map((a) => a.trim()).filter(Boolean)
          : ((req.body as any).allergens as string[] | undefined)

      const rawTags =
        typeof (req.body as any).tags === 'string'
          ? ((req.body as any).tags as string).split(',').map((t) => t.trim()).filter(Boolean)
          : ((req.body as any).tags as string[] | undefined)

      if (!Types.ObjectId.isValid(categoryIdParam)) {
        return res.status(400).json({ message: 'Invalid categoryId' })
      }
      const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
      if (!ownerRestaurantId) {
        return res.status(403).json({ message: 'Forbidden' })
      }
      const ownerRestaurantObjectId = new Types.ObjectId(ownerRestaurantId)
      if (!name || !name.trim() || !description || !description.trim()) {
        return res.status(400).json({ message: 'Name and description are required' })
      }
      if (typeof price !== 'number' || Number.isNaN(price) || price <= 0) {
        return res.status(400).json({ message: 'Price must be a positive number' })
      }

      const category = await MenuCategory.findOne({
        _id: new Types.ObjectId(categoryIdParam),
        restaurantId: ownerRestaurantObjectId,
      }).lean()
      if (!category) {
        return res.status(404).json({ message: 'Category not found' })
      }

      const existing = await MenuItem.find({ categoryId: new Types.ObjectId(categoryIdParam) })
        .sort({ position: -1 })
        .limit(1)
        .lean()
      const lastItem = existing[0]
      const nextPosition =
        lastItem && typeof lastItem.position === 'number' ? lastItem.position + 1 : 0

      let imageUrl: string | undefined
      if (req.file) {
        imageUrl = await uploadMenuItemImage(req.file)
      }

      const newItemData: {
        categoryId: Types.ObjectId
        name: string
        description: string
        price: number
        allergens: string[]
        tags: string[]
        position: number
        available: true
        imageUrl?: string
      } = {
        categoryId: new Types.ObjectId(categoryIdParam),
        name: name.trim(),
        description: description.trim(),
        price,
        allergens: rawAllergens ?? [],
        tags: rawTags ?? [],
        position: nextPosition,
        available: true,
      }

      if (imageUrl !== undefined) {
        newItemData.imageUrl = imageUrl
      }

      const item = await MenuItem.create(newItemData)

      return res.status(201).json(item)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      return res.status(500).json({ message: 'Failed to create item' })
    }
  }
)

router.patch('/items/:itemId', authenticateOwner, upload.single('image'), async (req, res) => {
  try {
    const itemIdParam = String(req.params.itemId)
    const body = req.body as any

    const name = typeof body.name === 'string' ? body.name : undefined
    const description = typeof body.description === 'string' ? body.description : undefined

    const priceRaw = body.price
    const price =
      typeof priceRaw === 'string'
        ? Number(priceRaw)
        : typeof priceRaw === 'number'
          ? priceRaw
          : undefined

    const positionRaw = body.position
    const position =
      typeof positionRaw === 'string'
        ? Number(positionRaw)
        : typeof positionRaw === 'number'
          ? positionRaw
          : undefined

    const rawAllergens =
      typeof body.allergens === 'string'
        ? (body.allergens as string).split(',').map((a) => a.trim()).filter(Boolean)
        : (body.allergens as string[] | undefined)

    const rawTags =
      typeof body.tags === 'string'
        ? (body.tags as string).split(',').map((t) => t.trim()).filter(Boolean)
        : (body.tags as string[] | undefined)

    const removeImageRaw = body.removeImage as string | undefined
    const availableRaw = body.available as string | boolean | undefined

    if (!Types.ObjectId.isValid(itemIdParam)) {
      return res.status(400).json({ message: 'Invalid itemId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const ownerRestaurantObjectId = new Types.ObjectId(ownerRestaurantId)

    const update: Record<string, unknown> = {}
    if (typeof name === 'string') update.name = name.trim()
    if (typeof description === 'string') update.description = description.trim()
    if (typeof price === 'number' && !Number.isNaN(price) && price > 0) update.price = price
    if (Array.isArray(rawAllergens)) update.allergens = rawAllergens
    if (Array.isArray(rawTags)) update.tags = rawTags
    if (typeof position === 'number' && !Number.isNaN(position)) update.position = position

    const item = await MenuItem.findById(itemIdParam).lean()
    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    const category = await MenuCategory.findOne({
      _id: item.categoryId,
      restaurantId: ownerRestaurantObjectId,
    }).lean()
    if (!category) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (removeImageRaw && ['true', '1', 'on'].includes(removeImageRaw.toLowerCase())) {
      update.imageUrl = null
    }

    if (req.file) {
      update.imageUrl = await uploadMenuItemImage(req.file)
    }

    if (typeof availableRaw === 'string') {
      const normalized = availableRaw.toLowerCase()
      if (['true', '1', 'on'].includes(normalized)) {
        update.available = true
      } else if (['false', '0', 'off'].includes(normalized)) {
        update.available = false
      }
    } else if (typeof availableRaw === 'boolean') {
      update.available = availableRaw
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(itemIdParam, update, {
      returnDocument: 'after',
    }).lean()
    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' })
    }

    return res.json(updatedItem)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to update item' })
  }
})

router.delete('/items/:itemId', authenticateOwner, async (req, res) => {
  try {
    const itemIdParam = String(req.params.itemId)

    if (!Types.ObjectId.isValid(itemIdParam)) {
      return res.status(400).json({ message: 'Invalid itemId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const ownerRestaurantObjectId = new Types.ObjectId(ownerRestaurantId)

    const item = await MenuItem.findById(itemIdParam).lean()
    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    const category = await MenuCategory.findOne({
      _id: item.categoryId,
      restaurantId: ownerRestaurantObjectId,
    }).lean()
    if (!category) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await MenuItem.deleteOne({ _id: new Types.ObjectId(itemIdParam) })

    return res.json({ success: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to delete item' })
  }
})

export default router

