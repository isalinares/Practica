import { Board, Position, Move, CaptureChain } from './types'
import { EMPTY, RED, BLACK, RED_KING, BLACK_KING } from './types'
import { cloneBoard, isRed, isBlack, isKing, crownPiece, opponent } from './board'
import { generateSimpleMoves } from './moves'

const DIRECTIONS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]]

function getDirectionsForPiece(board: Board, r: number, c: number): [number, number][] {
  const piece = board[r][c]
  if (isKing(piece)) return DIRECTIONS

  if (isRed(piece)) return [[-1, -1], [-1, 1]]
  return [[1, -1], [1, 1]]
}

function canCaptureInDirection(
  board: Board, r: number, c: number, dr: number, dc: number
): { can: boolean; capturedR: number; capturedC: number; landR: number; landC: number } {
  const mr = r + dr
  const mc = c + dc
  const lr = r + dr * 2
  const lc = c + dc * 2

  if (lr < 0 || lr > 7 || lc < 0 || lc > 7) {
    return { can: false, capturedR: -1, capturedC: -1, landR: -1, landC: -1 }
  }

  const mid = board[mr][mc]
  const land = board[lr][lc]

  if (mid === EMPTY || land !== EMPTY) {
    return { can: false, capturedR: -1, capturedC: -1, landR: -1, landC: -1 }
  }

  return { can: true, capturedR: mr, capturedC: mc, landR: lr, landC: lc }
}

export function findCaptures(board: Board, r: number, c: number): Move[] {
  const piece = board[r][c]
  if (piece === EMPTY) return []

  const player = isRed(piece) ? 'red' : 'black'
  const enemy = opponent(player)
  const captures: Move[] = []

  for (const [dr, dc] of getDirectionsForPiece(board, r, c)) {
    const { can, capturedR, capturedC, landR, landC } = canCaptureInDirection(board, r, c, dr, dc)
    if (can) {
      const midPiece = board[capturedR][capturedC]
      if (isRed(piece) && isBlack(midPiece)) {
        captures.push({
          from: [r, c],
          to: [landR, landC],
          captured: [capturedR, capturedC],
          isCapture: true,
        })
      } else if (isBlack(piece) && isRed(midPiece)) {
        captures.push({
          from: [r, c],
          to: [landR, landC],
          captured: [capturedR, capturedC],
          isCapture: true,
        })
      }
    }
  }

  return captures
}

export function findAllCaptures(board: Board, player: 'red' | 'black'): Move[] {
  const all: Move[] = []

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c]
      if (piece === EMPTY) continue
      if (isRed(piece) && player !== 'red') continue
      if (isBlack(piece) && player !== 'black') continue

      all.push(...findCaptures(board, r, c))
    }
  }

  return all
}

function simulateCapture(board: Board, move: Move): Board {
  const newBoard = cloneBoard(board)
  const [fr, fc] = move.from
  const [tr, tc] = move.to
  const piece = newBoard[fr][fc]

  newBoard[fr][fc] = EMPTY
  newBoard[tr][tc] = piece

  if (move.captured) {
    const [cr, cc] = move.captured
    newBoard[cr][cc] = EMPTY
  }

  crownPiece(newBoard, tr, tc)
  return newBoard
}

function addUniqueMoves(moves: Move[], newMoves: Move[]): void {
  for (const nm of newMoves) {
    const exists = moves.some(m => m.from[0] === nm.from[0] && m.from[1] === nm.from[1] && m.to[0] === nm.to[0] && m.to[1] === nm.to[1])
    if (!exists) moves.push(nm)
  }
}

export function extendCaptureChains(board: Board, from: Position, chain: Move[], player: 'red' | 'black'): CaptureChain[] {
  const [r, c] = from
  const lastPos = chain.length > 0 ? chain[chain.length - 1].to : from
  const [lr, lc] = lastPos

  const nextCaptures = findCaptures(board, lr, lc)

  const piece = board[r][c]
  const capturedForward = chain.some(m => {
    if (!m.captured) return false
    const [cr] = m.captured
    const [fr] = m.from
    return isRed(piece) ? cr < fr : cr > fr
  })

  let validNext: Move[] = []

  for (const cap of nextCaptures) {
    const [cr] = cap.captured!

    if (chain.length === 0) {
      validNext.push(cap)
      continue
    }

    const [prevFR] = chain[0].from
    const isForward = isRed(piece) ? cr < prevFR : cr > prevFR

    if (capturedForward || isForward) {
      validNext.push(cap)
    }
  }

  if (validNext.length === 0) {
    const finalBoard = simulateCapture(board, chain[chain.length - 1])
    return [{ moves: chain, finalBoard }]
  }

  const results: CaptureChain[] = []

  for (const cap of validNext) {
    const simBoard = simulateCapture(board, cap)
    const newChain = [...chain, cap]
    const extended = extendCaptureChains(simBoard, from, newChain, player)

    if (extended.length > 0) {
      results.push(...extended)
    } else {
      const finalBoard = simulateCapture(board, cap)
      results.push({ moves: newChain, finalBoard })
    }
  }

  return results
}

export function findAllCaptureChains(board: Board, player: 'red' | 'black'): CaptureChain[] {
  const allCaptures = findAllCaptures(board, player)

  if (allCaptures.length > 0) {
    const chains: CaptureChain[] = []
    const seen = new Set<string>()

    for (const cap of allCaptures) {
      const key = `${cap.from[0]},${cap.from[1]}`
      if (seen.has(key)) continue
      seen.add(key)

      const simBoard = simulateCapture(board, cap)
      const extended = extendCaptureChains(simBoard, cap.from, [cap], player)

      if (extended.length > 0) {
        chains.push(...extended)
      } else {
        chains.push({ moves: [cap], finalBoard: simBoard })
      }
    }

    return chains
  }

  return []
}
