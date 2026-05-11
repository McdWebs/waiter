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
import promotionRoutes from './routes/promotions'
import loyaltyRoutes from './routes/loyalty'
import { authenticateSuperAdmin } from './middleware/auth'
import { generalLimiter } from './middleware/rateLimiter'

const app = express()

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production set ALLOWED_ORIGINS="https://yourapp.com,https://www.yourapp.com"
// During development leave it unset to allow all origins.
const allowedOriginsEnv = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS
const corsOrigin: cors.CorsOptions['origin'] = allowedOriginsEnv
  ? allowedOriginsEnv.split(',').map((o) => o.trim())
  : true

app.use(express.json())
app.use(cors({ origin: corsOrigin, credentials: true }))

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api', generalLimiter)

// Serve uploaded images when S3 is not used
const uploadsDir = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(uploadsDir))

app.use('/api', authRoutes)
app.use('/api/super-admin', authenticateSuperAdmin, superAdminRoutes)
app.use('/api', feedbackRoutes)
app.use('/api', ownerRoutes)
app.use('/api', menuRoutes)
app.use('/api', orderRoutes)
app.use('/api', tableRoutes)
app.use('/api', chatRoutes)
app.use('/api', promotionRoutes)
app.use('/api', loyaltyRoutes)

const server = http.createServer(app)

export const io = new SocketIOServer(server, {
  cors: { origin: corsOrigin, credentials: true },
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
