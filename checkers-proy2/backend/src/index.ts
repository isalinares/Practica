import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import mongoose from 'mongoose'
import authRoutes from './routes/auth'
import gameRoutes from './routes/game'
import rankingRoutes from './routes/ranking'
import skinRoutes from './routes/skins'
import stripeRoutes from './routes/stripe'
import { Skin } from './models/Skin'

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

app.post('/api/seed', async (c) => {
  const skins = [
    { name: 'Clásico', type: 'board', price: 0, free: true, colors: { primary: '#4a0e2e', secondary: '#faf6f0', accent: '#b76e79', piecePrimary: '#f43f5e', pieceSecondary: '#faf6f0' } },
    { name: 'Rosa', type: 'board', price: 0, free: true, colors: { primary: '#2d1b29', secondary: '#fdf2f4', accent: '#d4a0a8', piecePrimary: '#fb7185', pieceSecondary: '#fecdd3' } },
    { name: 'Esmeralda', type: 'board', price: 4.99, free: false, colors: { primary: '#0a1f1a', secondary: '#ecfdf5', accent: '#6ee7b7', piecePrimary: '#34d399', pieceSecondary: '#a7f3d0' } },
    { name: 'Zafiro', type: 'board', price: 4.99, free: false, colors: { primary: '#0a1628', secondary: '#eff6ff', accent: '#93c5fd', piecePrimary: '#60a5fa', pieceSecondary: '#bfdbfe' } },
    { name: 'Vintage', type: 'board', price: 2.99, free: false, colors: { primary: '#2b1b0e', secondary: '#fef3c7', accent: '#d97706', piecePrimary: '#f59e0b', pieceSecondary: '#fde68a' } },
    { name: 'Noir', type: 'board', price: 2.99, free: false, colors: { primary: '#0a0a0a', secondary: '#fafafa', accent: '#525252', piecePrimary: '#fafafa', pieceSecondary: '#262626' } },
  ]

  await Skin.deleteMany({})
  const created = await Skin.insertMany(skins)
  return c.json({ message: 'Seeded', count: created.length })
})

const port = parseInt(Bun.env.PORT || '4000')

mongoose.connect(Bun.env.MONGODB_URI || 'mongodb://localhost:27017/checkers')
  .then(() => {
    console.log('Connected to MongoDB')
    Bun.serve({
      fetch: app.fetch,
      port,
      hostname: '0.0.0.0',
    })
    console.log(`Backend running on http://0.0.0.0:${port}`)
  })
  .catch(err => {
    console.error('Startup error:', err)
    process.exit(1)
  })
