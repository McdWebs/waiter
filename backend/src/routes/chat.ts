import express from 'express'
import { Types } from 'mongoose'
import { menuChat } from '../services/menuAssistant'
import { ChatEvent } from '../models/ChatEvent'
import { chatLimiter } from '../middleware/rateLimiter'

const router = express.Router()

// Apply stricter rate limit specifically on /chat (each call costs money)
router.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { restaurantId, messages, cartSummary } = req.body as {
      restaurantId?: string
      messages?: { role: 'user' | 'assistant'; content: string }[]
      cartSummary?: string
    }

    if (!restaurantId || !Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId' })
    }
    if (!messages || messages.length === 0) {
      return res.status(400).json({ message: 'Messages are required' })
    }
    // Limit conversation history sent to OpenAI to last 20 messages (saves tokens)
    const trimmedMessages = messages.slice(-20)

    const { reply, suggestions } = await menuChat({ restaurantId, messages: trimmedMessages, cartSummary })

    await ChatEvent.create({ restaurantId: new Types.ObjectId(restaurantId) }).catch(() => {
      // Non-blocking: do not fail the request if logging fails
    })

    return res.json({ reply, suggestions })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    return res.status(500).json({ message: 'Failed to process chat' })
  }
})

export default router
