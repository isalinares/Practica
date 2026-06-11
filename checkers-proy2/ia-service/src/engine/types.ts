export const EMPTY = 0
export const RED = 1
export const BLACK = 2
export const RED_KING = 3
export const BLACK_KING = 4

export type Piece = typeof EMPTY | typeof RED | typeof BLACK | typeof RED_KING | typeof BLACK_KING
export type Player = 'red' | 'black'
export type Board = Piece[][]
export type Position = [number, number]

export interface Move {
  from: Position
  to: Position
  captured?: Position
  isCapture: boolean
}

export interface CaptureChain {
  moves: Move[]
  finalBoard: Board
}
