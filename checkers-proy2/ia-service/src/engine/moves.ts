import { Board, Position, Move } from './types'
import { EMPTY, RED, BLACK, RED_KING, BLACK_KING } from './types'
import { cloneBoard, isRed, isKing, crownPiece, belongsToPlayer, opponent } from './board'
import { findAllCaptureChains, findAllCaptures } from './capture'

const DIRECTIONS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]]

export function generateSimpleMoves(board: Board, r: number, c: number): Move[] {
  const piece = board[r][c]
  if (piece === EMPTY || isKing(piece)) return []

  const moves: Move[] = []
  const isRedPiece = isRed(piece)
  const dirs = isRedPiece ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]

  for (const [dr, dc] of dirs) {
    const nr = r + dr
    const nc = c + dc
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === EMPTY) {
      moves.push({ from: [r, c], to: [nr, nc], isCapture: false })
    }
  }

  return moves
}

function generateKingMoves(board: Board, r: number, c: number): Move[] {
  const moves: Move[] = []

  for (const [dr, dc] of DIRECTIONS) {
    const nr = r + dr
    const nc = c + dc
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === EMPTY) {
      moves.push({ from: [r, c], to: [nr, nc], isCapture: false })
    }
  }

  return moves
}

function generateMovesForPiece(board: Board, r: number, c: number): Move[] {
  const piece = board[r][c]
  if (piece === EMPTY) return []

  if (isKing(piece)) return generateKingMoves(board, r, c)
  return generateSimpleMoves(board, r, c)
}

export function generateAllLegalMoves(board: Board, player: 'red' | 'black'): Move[] {
  const captureChains = findAllCaptureChains(board, player)

  if (captureChains.length > 0) {
    const firstMoves: Move[] = []
    const seen = new Set<string>()

    for (const chain of captureChains) {
      const first = chain.moves[0]
      const key = `${first.from[0]},${first.from[1]},${first.to[0]},${first.to[1]}`
      if (!seen.has(key)) {
        seen.add(key)
        firstMoves.push(first)
      }
    }

    return firstMoves
  }

  const moves: Move[] = []

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c]
      if (piece === EMPTY) continue
      if (!belongsToPlayer(piece, player)) continue

      const pieceMoves = generateMovesForPiece(board, r, c)
      moves.push(...pieceMoves)
    }
  }

  return moves
}

export function applyMoveOnBoard(board: Board, move: Move): Board | null {
  const [fr, fc] = move.from
  const [tr, tc] = move.to
  const piece = board[fr][fc]

  if (piece === EMPTY) return null
  if (board[tr][tc] !== EMPTY) return null

  const newBoard = cloneBoard(board)
  newBoard[fr][fc] = EMPTY
  newBoard[tr][tc] = piece

  if (move.captured) {
    const [cr, cc] = move.captured
    newBoard[cr][cc] = EMPTY
  }

  crownPiece(newBoard, tr, tc)
  return newBoard
}
