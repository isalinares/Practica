import { Hono } from 'hono'
import { User } from '../models/User'

const router = new Hono()

router.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')

  const users = await User.find({
    gamesPlayed: { $gt: 0 },
  })
    .sort({ bestMoves: 1, gamesWon: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select('username gamesPlayed gamesWon bestMoves totalMoves')

  const total = await User.countDocuments({ gamesPlayed: { $gt: 0 } })

  return c.json({
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
})

export default router
