import { createRoute, Link, useSearch } from '@tanstack/react-router'
import { rootRoute } from '../__root'
import { Board } from '../../components/Board'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

export const gameIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game/$id',
  validateSearch: (search: Record<string, unknown>) => ({
    skinId: (search.skinId as string) || '',
  }),
  component: GamePage,
})

const EMPTY = 0
const RED = 1
const BLACK = 2
const RED_KING = 3
const BLACK_KING = 4

function createInitialBoard(): number[][] {
  const board: number[][] = Array.from({ length: 8 }, () => Array(8).fill(EMPTY))
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) board[r][c] = BLACK
        else if (r > 4) board[r][c] = RED
      }
    }
  }
  return board
}

interface LegalMove {
  from: [number, number]
  to: [number, number]
}

function findAllCaptures(board: number[][], player: 'red' | 'black'): LegalMove[] {
  const captures: LegalMove[] = []
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (p === EMPTY) continue
      const isRed = p === RED || p === RED_KING
      if ((player === 'red' && !isRed) || (player === 'black' && isRed)) continue

      const dirs = (p === RED_KING || p === BLACK_KING)
        ? [[-1,-1],[-1,1],[1,-1],[1,1]] as [number, number][]
        : isRed ? [[-1,-1],[-1,1]] as [number, number][] : [[1,-1],[1,1]] as [number, number][]

      for (const [dr, dc] of dirs) {
        const mr = r + dr, mc = c + dc
        const lr = r + dr * 2, lc = c + dc * 2
        if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue
        const mid = board[mr][mc]
        if (mid === EMPTY || board[lr][lc] !== EMPTY) continue
        if (isRed && (mid === RED || mid === RED_KING)) continue
        if (!isRed && (mid === BLACK || mid === BLACK_KING)) continue
        captures.push({ from: [r, c], to: [lr, lc] })
      }
    }
  }
  return captures
}

function generateSimpleMoves(board: number[][], r: number, c: number): LegalMove[] {
  const p = board[r][c]
  if (p === EMPTY || p === RED_KING || p === BLACK_KING) return []
  const isRed = p === RED
  const dirs = isRed ? [[-1,-1],[-1,1]] as [number,number][] : [[1,-1],[1,1]] as [number,number][]
  const moves: LegalMove[] = []
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === EMPTY) {
      moves.push({ from: [r, c], to: [nr, nc] })
    }
  }
  return moves
}

function generateKingMoves(board: number[][], r: number, c: number): LegalMove[] {
  const moves: LegalMove[] = []
  const dirs: [number,number][] = [[-1,-1],[-1,1],[1,-1],[1,1]]
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === EMPTY) {
      moves.push({ from: [r, c], to: [nr, nc] })
    }
  }
  return moves
}

function generateLegalMoves(board: number[][], player: 'red' | 'black'): LegalMove[] {
  const captures = findAllCaptures(board, player)
  if (captures.length > 0) return captures

  const moves: LegalMove[] = []
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (p === EMPTY) continue
      const isRed = p === RED || p === RED_KING
      if ((player === 'red' && !isRed) || (player === 'black' && isRed)) continue

      if (p === RED_KING || p === BLACK_KING) {
        moves.push(...generateKingMoves(board, r, c))
      } else {
        moves.push(...generateSimpleMoves(board, r, c))
      }
    }
  }
  return moves
}

function applyMove(board: number[][], from: [number, number], to: [number, number]): number[][] | null {
  const [fr, fc] = from; const [tr, tc] = to
  const piece = board[fr][fc]
  if (piece === EMPTY || board[tr][tc] !== EMPTY) return null

  const dr = tr - fr, dc = tc - fc
  const isRed = piece === RED || piece === RED_KING
  const isKing = piece === RED_KING || piece === BLACK_KING

  if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
    if (!isKing && ((isRed && dr !== -1) || (!isRed && dr !== 1))) return null
    const nb = board.map(r => [...r])
    nb[tr][tc] = piece
    nb[fr][fc] = EMPTY
    if (tr === 0 && isRed) nb[tr][tc] = RED_KING
    if (tr === 7 && piece === BLACK) nb[tr][tc] = BLACK_KING
    return nb
  }

  if (Math.abs(dr) === 2 && Math.abs(dc) === 2) {
    const mr = fr + dr / 2, mc = fc + dc / 2
    const mid = board[mr][mc]
    if (mid === EMPTY) return null
    if (isRed && (mid === RED || mid === RED_KING)) return null
    if (!isRed && (mid === BLACK || mid === BLACK_KING)) return null

    const nb = board.map(r => [...r])
    nb[tr][tc] = piece
    nb[fr][fc] = EMPTY
    nb[mr][mc] = EMPTY
    if (tr === 0 && isRed) nb[tr][tc] = RED_KING
    if (tr === 7 && piece === BLACK) nb[tr][tc] = BLACK_KING
    return nb
  }

  return null
}

function checkGameOver(board: number[][]): string {
  let hasRed = false, hasBlack = false
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (p === RED || p === RED_KING) hasRed = true
      if (p === BLACK || p === BLACK_KING) hasBlack = true
    }
  }
  if (!hasRed) return 'black-wins'
  if (!hasBlack) return 'red-wins'
  return 'playing'
}

interface SkinColors {
  primary: string
  secondary: string
  accent: string
  piecePrimary?: string
  pieceSecondary?: string
}

function GamePage() {
  const { id } = gameIdRoute.useParams()
  const { skinId } = gameIdRoute.useSearch()
  const [board, setBoard] = useState<number[][]>(createInitialBoard)
  const [turn, setTurn] = useState<'red' | 'black'>('red')
  const [playerColor] = useState<'red' | 'black'>('red')
  const [status, setStatus] = useState<string>('playing')
  const [moveCount, setMoveCount] = useState(0)
  const [thinking, setThinking] = useState(false)
  const [skin, setSkin] = useState<SkinColors | undefined>(undefined)

  useEffect(() => {
    if (skinId) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      fetch(`${API_URL}/api/skins`)
        .then(res => res.json())
        .then(data => {
          const found = data.skins?.find((s: any) => s._id === skinId)
          if (found) setSkin(found.colors)
        })
        .catch(err => console.error('Error loading skin:', err))
    }
  }, [skinId])

  const legalMoves = status === 'playing' && turn === playerColor
    ? generateLegalMoves(board, playerColor)
    : []

  const handlePlayerMove = useCallback((from: [number, number], to: [number, number]) => {
    if (thinking || status !== 'playing') return

    const newBoard = applyMove(board, from, to)
    if (!newBoard) return

    setBoard(newBoard)
    setMoveCount(m => m + 1)
    setTurn('black')

    const gs = checkGameOver(newBoard)
    if (gs !== 'playing') {
      setStatus(gs)
      return
    }

    setThinking(true)
  }, [board, thinking, status])

  useEffect(() => {
    if (turn !== 'black' || status !== 'playing') return

    const timer = setTimeout(async () => {
      try {
        const IA_URL = 'http://localhost:3001'
        const res = await fetch(`${IA_URL}/api/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ board, player: 'black', algorithm: 'minimax' }),
        })
        if (res.ok) {
          const data = await res.json()
          const newBoard = applyMove(board, data.from, data.to)
          if (newBoard) {
            setBoard(newBoard)
            const gs = checkGameOver(newBoard)
            if (gs !== 'playing') setStatus(gs)
          }
        }
      } catch (e) {
        console.error('AI move failed:', e)
      }
      setTurn('red')
      setThinking(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [turn, status])

  const statusMessage = () => {
    if (status === 'red-wins') return '¡Has ganado!'
    if (status === 'black-wins') return 'La IA ha ganado'
    if (thinking) return 'Pensando...'
    return turn === playerColor ? 'Tu turno' : 'Turno de la IA'
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="flex flex-col lg:flex-row items-center gap-10 animate-fade-in">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${thinking ? 'bg-rosegold animate-pulse-glow' : turn === playerColor ? 'bg-rose-400' : 'bg-cream/30'}`} />
              <span className={`font-body italic text-sm ${
                thinking ? 'text-rosegold-light' : turn === playerColor ? 'text-rose-200' : 'text-cream/40'
              }`}>
                {statusMessage()}
              </span>
            </div>
            <span className="text-cream/30 text-sm font-body">
              {moveCount} movimientos
            </span>
          </div>

          <Board
            board={board}
            onMove={handlePlayerMove}
            legalMoves={legalMoves}
            disabled={thinking || status !== 'playing' || turn !== playerColor}
            playerColor={playerColor}
            skin={skin}
          />
        </div>

        <div className="w-full max-w-xs space-y-6">
          <div className="bg-cream/5 border border-cream/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-cream text-sm tracking-widest uppercase text-center">
              Partida
            </h3>
            <div className="space-y-2 text-sm font-body">
              <div className="flex justify-between text-cream/60">
                <span>Tú</span>
                <span className="text-cream/80">{playerColor === 'red' ? 'Rojas' : 'Blancas'}</span>
              </div>
              <div className="flex justify-between text-cream/60">
                <span>IA</span>
                <span className="text-cream/80">{playerColor === 'red' ? 'Blancas' : 'Rojas'}</span>
              </div>
              <div className="h-px bg-cream/10 my-3" />
              <div className="flex justify-between text-cream/60">
                <span>Movimientos</span>
                <span className="text-cream/80">{moveCount}</span>
              </div>
            </div>
          </div>

          {status !== 'playing' && (
            <div className="bg-rose-500/10 border border-rose-400/20 rounded-2xl p-6 text-center space-y-4 animate-fade-in">
              <p className="font-display text-rose-200 text-lg">
                {statusMessage()}
              </p>
              <p className="text-cream/40 text-sm font-body italic">
                {moveCount} movimientos en total
              </p>
              <div className="flex gap-3">
                <Link
                  to="/game"
                  className="flex-1 px-4 py-2.5 bg-rose-500/10 border border-rose-400/20 rounded-xl
                             text-rose-200 text-sm font-display tracking-wider uppercase
                             hover:bg-rose-500/20 transition-all duration-300 text-center"
                >
                  Revancha
                </Link>
                <Link
                  to="/ranking"
                  className="flex-1 px-4 py-2.5 border border-cream/10 rounded-xl
                             text-cream/40 text-sm font-display tracking-wider uppercase
                             hover:border-cream/20 hover:text-cream/60 transition-all duration-300 text-center"
                >
                  Ranking
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
