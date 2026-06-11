import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth'
import { createGame, makeMove } from '../services/game-service'
import { Game } from '../models/Game'

type Variables = { userId: string }

const router = new Hono<{ Variables: Variables }>()

router.use('*', authMiddleware)

router.post('/', zValidator('json', z.object({
  playerColor: z.enum(['red', 'black']).default('red'),
})), async (c) => {
  const clerkId = c.get('userId')
  const { playerColor } = c.req.valid('json')
  const game = await createGame(clerkId, playerColor)
  return c.json({ game }, 201)
})

router.post('/:id/move', zValidator('json', z.object({
  from: z.array(z.number()).length(2),
  to: z.array(z.number()).length(2),
})), async (c) => {
  const { id } = c.req.param()
  const clerkId = c.get('userId')
  const { from, to } = c.req.valid('json')

  try {
    const game = await makeMove(id, clerkId, from as [number, number], to as [number, number])
    return c.json({ game })
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

router.get('/:id', async (c) => {
  const { id } = c.req.param()
  const game = await Game.findById(id)
  if (!game) return c.json({ error: 'Game not found' }, 404)
  return c.json({ game })
})

export default router
