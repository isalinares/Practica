import { Hono } from 'hono'
import { User } from '../models/User'

type Variables = { userId: string }

const router = new Hono<{ Variables: Variables }>()

router.post('/register', async (c) => {
  const { clerkId, username } = await c.req.json()

  const existing = await User.findOne({ clerkId })
  if (existing) {
    return c.json({ message: 'User already exists', user: existing }, 200)
  }

  const user = await User.create({ clerkId, username })
  return c.json({ user }, 201)
})

router.get('/me', async (c) => {
  const clerkId = c.get('userId')
  const user = await User.findOne({ clerkId }).populate('unlockedSkins')
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({ user })
})

export default router
