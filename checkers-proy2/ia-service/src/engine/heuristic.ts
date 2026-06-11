import { Board, Player, Piece } from './types'
import { EMPTY, RED, BLACK, RED_KING, BLACK_KING } from './types'
import { isRed, isBlack, isKing, opponent, pieceCounts } from './board'
import { findAllCaptures } from './capture'

const CENTER_SQUARES: [number, number][] = [
  [3, 3], [3, 4], [4, 3], [4, 4],
]

const CENTER_EXTENDED: [number, number][] = [
  [2, 2], [2, 3], [2, 4], [2, 5],
  [3, 2], [3, 5],
  [4, 2], [4, 5],
  [5, 2], [5, 3], [5, 4], [5, 5],
]

function belongsToPlayer(piece: Piece, player: Player): boolean {
  if (player === 'red') return isRed(piece)
  return isBlack(piece)
}

export function evaluate(board: Board, player: Player): number {
  let score = 0
  const enemy = opponent(player)
  const counts = pieceCounts(board)

  const myPieces = player === 'red' ? counts.red : counts.black
  const myKings = player === 'red' ? counts.redKings : counts.blackKings
  const enemyPieces = player === 'red' ? counts.black : counts.red
  const enemyKings = player === 'red' ? counts.blackKings : counts.redKings

  score += (myPieces - enemyPieces) * 10
  score += (myKings - enemyKings) * 15

  const enemyCaptures = findAllCaptures(board, enemy)
  const threatCount = enemyCaptures.length
  score -= threatCount * 8

  let myCenterControl = 0
  let enemyCenterControl = 0

  for (const [r, c] of CENTER_SQUARES) {
    const p = board[r][c]
    if (p === EMPTY) continue
    if (belongsToPlayer(p, player)) myCenterControl += 3
    else enemyCenterControl += 3
  }

  for (const [r, c] of CENTER_EXTENDED) {
    const p = board[r][c]
    if (p === EMPTY) continue
    if (belongsToPlayer(p, player)) myCenterControl += 1
    else enemyCenterControl += 1
  }

  score += myCenterControl - enemyCenterControl

  let myBackRowDefense = 0
  const backRow = player === 'red' ? 7 : 0
  for (let c = 0; c < 8; c++) {
    const p = board[backRow][c]
    if (p !== EMPTY && belongsToPlayer(p, player)) {
      myBackRowDefense += 2
    }
  }
  score += myBackRowDefense

  if (myPieces + myKings === 0) score -= 1000
  if (enemyPieces + enemyKings === 0) score += 1000

  return score
}
