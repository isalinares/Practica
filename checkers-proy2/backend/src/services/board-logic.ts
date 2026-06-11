const EMPTY = 0
const RED = 1
const BLACK = 2
const RED_KING = 3
const BLACK_KING = 4

export function createInitialBoard(): number[][] {
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

export function applyMove(board: number[][], from: [number, number], to: [number, number]): number[][] | null {
  const [fr, fc] = from
  const [tr, tc] = to

  if (fr < 0 || fr > 7 || fc < 0 || fc > 7 || tr < 0 || tr > 7 || tc < 0 || tc > 7) return null

  const piece = board[fr][fc]
  if (piece === EMPTY) return null
  if (board[tr][tc] !== EMPTY) return null

  const dr = tr - fr
  const dc = tc - fc
  const isKing = piece === RED_KING || piece === BLACK_KING
  const isRed = piece === RED || piece === RED_KING

  if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
    if (!isKing) {
      if (isRed && dr !== -1) return null
      if (!isRed && dr !== 1) return null
    }
    const newBoard = board.map(row => [...row])
    newBoard[tr][tc] = piece
    newBoard[fr][fc] = EMPTY
    if (tr === 0 && isRed) newBoard[tr][tc] = RED_KING
    if (tr === 7 && !isRed) newBoard[tr][tc] = BLACK_KING
    return newBoard
  }

  if (Math.abs(dr) === 2 && Math.abs(dc) === 2) {
    const mr = fr + dr / 2
    const mc = fc + dc / 2
    const mid = board[mr][mc]
    if (mid === EMPTY) return null
    if (isRed && (mid === RED || mid === RED_KING)) return null
    if (!isRed && (mid === BLACK || mid === BLACK_KING)) return null

    const newBoard = board.map(row => [...row])
    newBoard[tr][tc] = piece
    newBoard[fr][fc] = EMPTY
    newBoard[mr][mc] = EMPTY
    if (tr === 0 && isRed) newBoard[tr][tc] = RED_KING
    if (tr === 7 && !isRed) newBoard[tr][tc] = BLACK_KING
    return newBoard
  }

  return null
}

export function checkGameOver(board: number[][], turn: 'red' | 'black'): string {
  let hasRed = false
  let hasBlack = false
  let redCanMove = false
  let blackCanMove = false

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (p === RED || p === RED_KING) {
        hasRed = true
        if (!redCanMove && hasAnyMove(board, r, c)) redCanMove = true
      }
      if (p === BLACK || p === BLACK_KING) {
        hasBlack = true
        if (!blackCanMove && hasAnyMove(board, r, c)) blackCanMove = true
      }
    }
  }

  if (!hasRed || (turn === 'red' && !redCanMove)) return 'black-wins'
  if (!hasBlack || (turn === 'black' && !blackCanMove)) return 'red-wins'
  return 'playing'
}

function hasAnyMove(board: number[][], r: number, c: number): boolean {
  const piece = board[r][c]
  const isKing = piece === RED_KING || piece === BLACK_KING
  const isRed = piece === RED || piece === RED_KING

  const dirs = isKing ? [[-1,-1],[-1,1],[1,-1],[1,1]] : isRed ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]]

  for (const [dr, dc] of dirs) {
    const nr = r + dr
    const nc = c + dc
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === EMPTY) return true
  }

  for (const [dr, dc] of dirs) {
    const nr = r + dr * 2
    const nc = c + dc * 2
    const mr = r + dr
    const mc = c + dc
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === EMPTY) {
      const mid = board[mr][mc]
      if (mid !== EMPTY) {
        if (isRed && (mid === BLACK || mid === BLACK_KING)) return true
        if (!isRed && (mid === RED || mid === RED_KING)) return true
      }
    }
  }

  return false
}
