import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import mongoose from 'mongoose'
import authRoutes from './routes/auth'
import gameRoutes from './routes/game'
import rankingRoutes from './routes/ranking'
import skinRoutes from './routes/skins'
import stripeRoutes from './routes/stripe'

type Variables = {
  userId: string
}

const app = new Hono<{ Variables: Variables }>()

app.use('*', cors())
app.use('*', logger())

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.route('/api/auth', authRoutes)
app.route('/api/games', gameRoutes)
app.route('/api/ranking', rankingRoutes)
app.route('/api/skins', skinRoutes)
app.route('/api/stripe', stripeRoutes)

const port = parseInt(Bun.env.PORT || '4000')

async function start() {
  try {
    await mongoose.connect(Bun.env.MONGODB_URI || 'mongodb://localhost:27017/checkers')
    console.log('Connected to MongoDB')

    const server = Bun.serve({
      fetch: app.fetch,
      port,
      reusePort: true,
      hostname: '0.0.0.0',
    })

    console.log(`Backend running on http://localhost:${port}`)
  } catch (err) {
    console.error('Startup error:', err)
    process.exit(1)
  }
}

start()

export default app
