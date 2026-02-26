import express from 'express'
import { Types } from 'mongoose'
import { Restaurant } from '../models/Restaurant'
import { MenuCategory } from '../models/MenuCategory'
import { MenuItem } from '../models/MenuItem'
import { authenticateOwner } from '../middleware/auth'
import multer from 'multer'
import { uploadMenuItemImage } from '../services/s3Client'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

router.get('/restaurants/:slug/menu', async (req, res) => {
  try {
    const { slug } = req.params
    const restaurant = await Restaurant.findOne({ slug }).lean()
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

    return res.json({ restaurant, categories: categoriesWithItems })
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
    const { restaurantId } = req.params

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId || ownerRestaurantId !== restaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const restaurant = await Restaurant.findById(restaurantId).lean()
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

    return res.json({ restaurant, categories: categoriesWithItems })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load admin menu' })
  }
})

router.patch('/restaurants/:restaurantId', authenticateOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const { name, currency } = req.body as { name?: string; currency?: string }

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId || ownerRestaurantId !== restaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const update: Record<string, unknown> = {}
    if (typeof name === 'string' && name.trim()) update.name = name.trim()
    if (typeof currency === 'string' && currency.trim()) update.currency = currency.trim().toUpperCase()

    const restaurant = await Restaurant.findByIdAndUpdate(restaurantId, update, {
      new: true,
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

router.post('/restaurants/:restaurantId/categories', authenticateOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const { name } = req.body as { name?: string }

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }
    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId || ownerRestaurantId !== restaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' })
    }

    const existing = await MenuCategory.find({ restaurantId: new Types.ObjectId(restaurantId) })
      .sort({ position: -1 })
      .limit(1)
      .lean()
    const nextPosition = existing.length > 0 && typeof existing[0].position === 'number'
      ? existing[0].position + 1
      : 0

    const category = await MenuCategory.create({
      restaurantId: new Types.ObjectId(restaurantId),
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

router.patch('/categories/:categoryId', authenticateOwner, async (req, res) => {
  try {
    const { categoryId } = req.params
    const { name, position } = req.body as { name?: string; position?: number }

    if (!Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: 'Invalid categoryId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const update: Record<string, unknown> = {}
    if (typeof name === 'string') {
      update.name = name.trim()
    }
    if (typeof position === 'number' && !Number.isNaN(position)) {
      update.position = position
    }

    const category = await MenuCategory.findByIdAndUpdate(
      {
        _id: categoryId,
        restaurantId: ownerRestaurantId,
      },
      update,
      {
        new: true,
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
    const { categoryId } = req.params

    if (!Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: 'Invalid categoryId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const category = await MenuCategory.findOneAndDelete({
      _id: categoryId,
      restaurantId: ownerRestaurantId,
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
    const { categoryId } = req.params
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

    if (!Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: 'Invalid categoryId' })
    }
    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    if (!name || !name.trim() || !description || !description.trim()) {
      return res.status(400).json({ message: 'Name and description are required' })
    }
    if (typeof price !== 'number' || Number.isNaN(price) || price <= 0) {
      return res.status(400).json({ message: 'Price must be a positive number' })
    }

    const category = await MenuCategory.findOne({
      _id: categoryId,
      restaurantId: ownerRestaurantId,
    }).lean()
    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }

    const existing = await MenuItem.find({ categoryId: new Types.ObjectId(categoryId) })
      .sort({ position: -1 })
      .limit(1)
      .lean()
    const nextPosition = existing.length > 0 && typeof existing[0].position === 'number'
      ? existing[0].position + 1
      : 0

    let imageUrl: string | undefined
    if (req.file) {
      imageUrl = await uploadMenuItemImage(req.file)
    }

    const item = await MenuItem.create({
      categoryId: new Types.ObjectId(categoryId),
      name: name.trim(),
      description: description.trim(),
      price,
      allergens: rawAllergens ?? [],
      tags: rawTags ?? [],
      position: nextPosition,
      imageUrl,
      available: true,
    })

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
    const { itemId } = req.params
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

    if (!Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'Invalid itemId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const update: Record<string, unknown> = {}
    if (typeof name === 'string') update.name = name.trim()
    if (typeof description === 'string') update.description = description.trim()
    if (typeof price === 'number' && !Number.isNaN(price) && price > 0) update.price = price
    if (Array.isArray(rawAllergens)) update.allergens = rawAllergens
    if (Array.isArray(rawTags)) update.tags = rawTags
    if (typeof position === 'number' && !Number.isNaN(position)) update.position = position

    const item = await MenuItem.findById(itemId).lean()
    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    const category = await MenuCategory.findOne({
      _id: item.categoryId,
      restaurantId: ownerRestaurantId,
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

    const updatedItem = await MenuItem.findByIdAndUpdate(itemId, update, { new: true }).lean()
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
    const { itemId } = req.params

    if (!Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'Invalid itemId' })
    }

    const ownerRestaurantId = (req as any).ownerRestaurantId as string | undefined
    if (!ownerRestaurantId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const item = await MenuItem.findById(itemId).lean()
    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    const category = await MenuCategory.findOne({
      _id: item.categoryId,
      restaurantId: ownerRestaurantId,
    }).lean()
    if (!category) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await MenuItem.deleteOne({ _id: itemId })

    return res.json({ success: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to delete item' })
  }
})

export default router

