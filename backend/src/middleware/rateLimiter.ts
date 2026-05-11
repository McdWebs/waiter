import { rateLimit } from 'express-rate-limit'

// General API: 300 req / 1 min per IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
})

// Chat endpoint: 30 req / 1 min per IP (each request = 1 OpenAI call = money)
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many chat messages, please slow down.' },
})
