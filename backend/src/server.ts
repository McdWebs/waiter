import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import path from 'path'
import { Server as SocketIOServer } from 'socket.io'
import { connectDb } from './config/db'
import menuRoutes from './routes/menu'
import orderRoutes from './routes/orders'
import tableRoutes from './routes/tables'
import chatRoutes from './routes/chat'
import authRoutes from './routes/auth'
import superAdminRoutes from './routes/superAdmin'
import feedbackRoutes from './routes/feedback'
import ownerRoutes from './routes/owner'
import { authenticateSuperAdmin } from './middleware/auth'
import { createRateLimiter } from './middleware/rateLimit'

const app = express()

app.use(express.json())
app.use(
  cors({
    // Allow all origins; browser will reflect the requesting origin.
    // If you want to restrict this later, replace `true` with an array or function.
    origin: true,
    credentials: true,
  })
)

// Serve uploaded images when S3 is not used
const uploadsDir = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(uploadsDir))

// Rate limiters for public (unauthenticated) endpoints that guests can reach.
// These protect against accidental loops and malicious spam without blocking
// legitimate heavy usage (a table might order several items in quick succession).
const orderLimiter = createRateLimiter({
  windowMs: 60_000,       // 1 minute window
  max: 20,                // max 20 order submissions per IP per minute
  message: 'Too many orders from this device, please wait a moment and try again',
})
const waiterCallLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: 'Too many waiter calls from this device, please wait a moment',
})
const menuLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,               // menu fetches are read-only; allow generous rate
  message: 'Too many requests, please slow down',
})
const authLimiter = createRateLimiter({
  windowMs: 15 * 60_000, // 15 minute window for auth endpoints
  max: 20,               // strict limit to resist brute-force
  message: 'Too many login attempts, please try again later',
})

// Auth limiter must be registered BEFORE the auth router so it runs first
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth/super-admin/login', authLimiter)

app.use('/api', authRoutes)
app.use('/api/super-admin', authenticateSuperAdmin, superAdminRoutes)
app.use('/api', feedbackRoutes)
app.use('/api', ownerRoutes)
app.use('/api', menuLimiter, menuRoutes)
app.use('/api', orderLimiter, orderRoutes)
app.use('/api', tableRoutes)
app.use('/api', chatRoutes)

const server = http.createServer(app)

export const io = new SocketIOServer(server, {
  cors: {
    origin: true,
    credentials: true,
  },
})

io.on('connection', (socket) => {
  socket.on('join-restaurant', (restaurantId: string) => {
    socket.join(restaurantId)
  })
})

const PORT = process.env.PORT ?? 4000

async function start() {
  await connectDb()

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${PORT}`)
  })
}

void start()

