import type { Board, Player, Move } from '../engine/types'
import { findBestMove } from '../engine/tree'
import { generateAllLegalMoves } from '../engine/moves'

interface LLMPrompt {
  board: Board
  player: Player
  legalMoves: Move[]
  history?: string[]
}

interface LLMResponse {
  move: Move
  reasoning: string
}

export async function queryLLM(prompt: LLMPrompt): Promise<LLMResponse> {
  const { board, player, legalMoves } = prompt

  if (legalMoves.length === 0) {
    throw new Error('No legal moves')
  }

  if (legalMoves.length === 1) {
    return { move: legalMoves[0], reasoning: 'Only legal move' }
  }

  const aiMove = findBestMove(board, player, 4)

  if (aiMove) {
    const valid = legalMoves.some(
      m => m.from[0] === aiMove.from[0] && m.from[1] === aiMove.from[1]
        && m.to[0] === aiMove.to[0] && m.to[1] === aiMove.to[1]
    )

    if (valid) {
      return {
        move: aiMove,
        reasoning: 'Evaluated using minimax search with alpha-beta pruning',
      }
    }
  }

  return {
    move: legalMoves[Math.floor(Math.random() * legalMoves.length)],
    reasoning: 'Random selection (fallback)',
  }
}

export async function findBestMoveMockLLM(
  board: Board,
  player: Player,
  difficulty: number = 3
): Promise<Move | null> {
  const legalMoves = generateAllLegalMoves(board, player)

  if (legalMoves.length === 0) return null

  const searchDepth = Math.min(difficulty + 2, 6)
  const aiMove = findBestMove(board, player, searchDepth)

  if (aiMove) {
    return aiMove
  }

  return legalMoves[Math.floor(Math.random() * legalMoves.length)]
}
