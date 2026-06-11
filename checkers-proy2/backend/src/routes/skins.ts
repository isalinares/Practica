import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { Skin } from '../models/Skin'
import { User } from '../models/User'

type Variables = { userId: string }

const router = new Hono<{ Variables: Variables }>()

router.get('/', async (c) => {
  const skins = await Skin.find()
  return c.json({ skins })
})

router.use('*', authMiddleware)

router.get('/user', async (c) => {
  const clerkId = c.get('userId')
  const user = await User.findOne({ clerkId }).populate('unlockedSkins')
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({ unlockedSkins: user.unlockedSkins })
})

router.post('/purchase/:skinId', async (c) => {
  const { skinId } = c.req.param()
  const clerkId = c.get('userId')

  const skin = await Skin.findById(skinId)
  if (!skin) return c.json({ error: 'Skin not found' }, 404)
  if (skin.free) return c.json({ error: 'Skin is free' }, 400)

  const user = await User.findOne({ clerkId })
  if (!user) return c.json({ error: 'User not found' }, 404)

  if (user.unlockedSkins.includes(skin._id)) {
    return c.json({ error: 'Already owned' }, 400)
  }

  user.unlockedSkins.push(skin._id)
  await user.save()

  return c.json({ message: 'Skin purchased', skin })
})

export default router
