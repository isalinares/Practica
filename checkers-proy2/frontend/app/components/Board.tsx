import { useState, useCallback } from 'react'

const BOARD_SIZE = 8
const EMPTY = 0
const RED = 1
const BLACK = 2
const RED_KING = 3
const BLACK_KING = 4

interface SkinColors {
  primary: string
  secondary: string
  accent: string
  piecePrimary?: string
  pieceSecondary?: string
}

interface BoardProps {
  board: number[][]
  onMove: (from: [number, number], to: [number, number]) => void
  legalMoves: Array<{ from: [number, number]; to: [number, number] }>
  disabled: boolean
  playerColor: 'red' | 'black'
  skin?: SkinColors
}

function getLegalTargets(moves: Array<{ from: [number, number]; to: [number, number] }>, from: [number, number]): [number, number][] {
  return moves.filter(m => m.from[0] === from[0] && m.from[1] === from[1]).map(m => m.to)
}

export function Board({ board, onMove, legalMoves, disabled, playerColor, skin }: BoardProps) {
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [hovered, setHovered] = useState<[number, number] | null>(null)

  const isPlayable = !disabled

  const defaultSkin: SkinColors = {
    primary: '#4a0e2e',
    secondary: '#faf6f0',
    accent: '#b76e79',
    piecePrimary: '#f43f5e',
    pieceSecondary: '#faf6f0',
  }

  const currentSkin = skin || defaultSkin

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!isPlayable) return

    const piece = board[row][col]

    if (selected) {
      const targets = getLegalTargets(legalMoves, selected)
      const isTarget = targets.some(t => t[0] === row && t[1] === col)

      if (isTarget) {
        onMove(selected, [row, col])
        setSelected(null)
        return
      }

      if (piece !== EMPTY) {
        const pieceColor = piece === RED || piece === RED_KING ? 'red' : 'black'
        if (pieceColor === playerColor) {
          setSelected([row, col])
          return
        }
      }

      setSelected(null)
      return
    }

    if (piece !== EMPTY) {
      const pieceColor = piece === RED || piece === RED_KING ? 'red' : 'black'
      if (pieceColor === playerColor) {
        const hasMove = legalMoves.some(m => m.from[0] === row && m.from[1] === col)
        if (hasMove) {
          setSelected([row, col])
        }
      }
    }
  }, [selected, legalMoves, isPlayable, board, playerColor, onMove])

  const isSelected = (r: number, c: number) => selected && selected[0] === r && selected[1] === c
  const isLegalTarget = (r: number, c: number) => {
    if (!selected) return false
    return getLegalTargets(legalMoves, selected).some(t => t[0] === r && t[1] === c)
  }
  const isLastMove = (r: number, c: number) => false

  function renderPiece(piece: number) {
    const isRed = piece === RED || piece === RED_KING
    const isKing = piece === RED_KING || piece === BLACK_KING

    const pieceColor = isRed ? currentSkin.piecePrimary : currentSkin.pieceSecondary

    return (
      <div
        className={`relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-lg
          ${isKing ? 'ring-2 ring-rosegold/60 ring-offset-1 ring-offset-warmblack/50' : ''}
        `}
        style={{ backgroundColor: pieceColor }}
      >
        {isKing && (
          <span className={`text-xs md:text-sm ${isRed ? 'text-white/80' : 'text-rosegold'}`}>♛</span>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="rounded-2xl overflow-hidden border-2 shadow-2xl shadow-black/40" style={{ borderColor: currentSkin.accent + '30' }}>
        <div className="grid grid-cols-8">
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => {
            const row = Math.floor(i / BOARD_SIZE)
            const col = i % BOARD_SIZE
            const isDark = (row + col) % 2 === 1
            const piece = board[row][col]
            const sel = isSelected(row, col)
            const target = isLegalTarget(row, col)
            const hover = hovered && hovered[0] === row && hovered[1] === col

            const squareColor = isDark ? currentSkin.accent + '60' : currentSkin.secondary + '20'

            return (
              <div
                key={i}
                className={`
                  relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center
                  cursor-pointer transition-all duration-200
                  ${sel ? 'ring-2 ring-rose-400 ring-inset' : ''}
                  ${target ? 'bg-rose-500/20' : ''}
                  ${hover && piece !== EMPTY ? 'brightness-110' : ''}
                `}
                style={{ backgroundColor: squareColor }}
                onClick={() => handleSquareClick(row, col)}
                onMouseEnter={() => setHovered([row, col])}
                onMouseLeave={() => setHovered(null)}
              >
                {target && (
                  <div className="w-4 h-4 rounded-full bg-rose-300/40 animate-pulse-glow" />
                )}
                {piece !== EMPTY && renderPiece(piece)}
                {sel && (
                  <div className="absolute inset-0 rounded-none border-2 border-rose-400/50" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="absolute -left-8 top-0 flex flex-col justify-around h-full text-cream/15 text-xs font-body">
        {Array.from({ length: BOARD_SIZE }).map((_, i) => (
          <span key={i}>{8 - i}</span>
        ))}
      </div>
      <div className="absolute -bottom-6 left-0 w-full flex justify-around text-cream/15 text-xs font-body">
        {['a','b','c','d','e','f','g','h'].map(l => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  )
}
