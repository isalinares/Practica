import { Board, Piece, Player } from './types'
import { EMPTY, RED, BLACK, RED_KING, BLACK_KING } from './types'

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(EMPTY))

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

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row])
}

export function isRed(piece: Piece): boolean {
  return piece === RED || piece === RED_KING
}

export function isBlack(piece: Piece): boolean {
  return piece === BLACK || piece === BLACK_KING
}

export function isKing(piece: Piece): boolean {
  return piece === RED_KING || piece === BLACK_KING
}

export function belongsToPlayer(piece: Piece, player: Player): boolean {
  if (player === 'red') return isRed(piece)
  return isBlack(piece)
}

export function crownPiece(board: Board, r: number, c: number): void {
  const piece = board[r][c]
  if (piece === RED && r === 0) board[r][c] = RED_KING
  else if (piece === BLACK && r === 7) board[r][c] = BLACK_KING
}

export function opponent(player: Player): Player {
  return player === 'red' ? 'black' : 'red'
}

export function pieceCounts(board: Board): { red: number; black: number; redKings: number; blackKings: number } {
  let red = 0, black = 0, redKings = 0, blackKings = 0

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (p === RED) red++
      else if (p === BLACK) black++
      else if (p === RED_KING) redKings++
      else if (p === BLACK_KING) blackKings++
    }
  }

  return { red, black, redKings, blackKings }
}
