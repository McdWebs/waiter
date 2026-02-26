import express from 'express'
import { Types } from 'mongoose'
import { Table } from '../models/Table'

const router = express.Router()

router.get('/restaurants/:restaurantId/tables', async (req, res) => {
  try {
    const { restaurantId } = req.params
    const { status } = req.query as { status?: string }

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const match: Record<string, unknown> = {
      restaurantId: new Types.ObjectId(restaurantId),
    }

    if (status && ['active', 'inactive'].includes(status)) {
      match.status = status
    }

    const tables = await Table.find(match).sort({ name: 1 }).lean()

    return res.json(
      tables.map((table) => ({
        _id: table._id,
        restaurantId: table.restaurantId,
        name: table.name,
        number: table.number,
        status: table.status,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
      }))
    )
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to load tables' })
  }
})

router.post('/restaurants/:restaurantId/tables', async (req, res) => {
  try {
    const { restaurantId } = req.params
    const { number, name } = req.body as { number?: string; name?: string }

    if (!Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }

    const trimmedNumber = (number ?? '').trim()
    const trimmedName = (name ?? '').trim()

    if (!trimmedNumber) {
      return res.status(400).json({ message: 'Table number is required' })
    }

    const existing = await Table.findOne({
      restaurantId: new Types.ObjectId(restaurantId),
      number: trimmedNumber,
    }).lean()

    if (existing) {
      return res.status(409).json({ message: 'Table number already exists for this restaurant' })
    }

    const table = await Table.create({
      restaurantId: new Types.ObjectId(restaurantId),
      number: trimmedNumber,
      name: trimmedName || `Table ${trimmedNumber}`,
      status: 'active',
    })

    return res.status(201).json({
      _id: table._id,
      restaurantId: table.restaurantId,
      name: table.name,
      number: table.number,
      status: table.status,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to create table' })
  }
})

export default router

