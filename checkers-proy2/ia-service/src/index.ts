import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { findBestMove } from './engine/tree'
import { findMoveAStar } from './engine/astar'
import { generateAllLegalMoves, applyMoveOnBoard } from './engine/moves'
import { findBestMoveMockLLM } from './llm/mock-llm'
import type { Board, Player } from './engine/types'

const app = new Hono()

app.use('*', cors())
app.use('*', logger())

app.post('/api/move', async (c) => {
  const { board, player, difficulty = 3, algorithm = 'a-star' } = await c.req.json() as {
    board: Board
    player: Player
    difficulty?: number
    algorithm?: string
  }

  if (!board || !player) {
    return c.json({ error: 'board and player are required' }, 400)
  }

  const useLLM = Bun.env.LLM_MOCK === 'true'

  let move
  if (useLLM) {
    move = await findBestMoveMockLLM(board, player, difficulty)
  } else if (algorithm === 'minimax') {
    move = findBestMove(board, player, Math.min(difficulty + 3, 8))
  } else {
    move = findMoveAStar(board, player, difficulty + 4)
  }

  if (!move) {
    return c.json({ error: 'No legal moves available' }, 400)
  }

  return c.json({
    from: move.from,
    to: move.to,
    isCapture: move.isCapture,
    captured: move.captured || null,
    algorithm: useLLM ? 'llm' : algorithm,
  })
})

app.post('/api/legal-moves', async (c) => {
  const { board, player } = await c.req.json() as { board: Board; player: Player }
  const moves = generateAllLegalMoves(board, player)
  return c.json({ moves })
})

app.get('/api/health', (c) => c.json({ status: 'ok' }))

const port = parseInt(Bun.env.PORT || '3001')

Bun.serve({
  fetch: app.fetch,
  port,
})

console.log(`IA Service running on port ${port}`)
