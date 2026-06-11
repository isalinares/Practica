import { Board, Player, Move, Position } from './types'
import { cloneBoard, opponent } from './board'
import { generateAllLegalMoves, applyMoveOnBoard } from './moves'
import { evaluate } from './heuristic'
import { findBestMove } from './tree'

export interface AStarNode {
  board: Board
  player: Player
  move: Move | null
  g: number
  h: number
  f: number
  parent: AStarNode | null
  depth: number
}

function hCost(board: Board, player: Player): number {
  return -evaluate(board, opponent(player))
}

export function aStarSearch(
  board: Board,
  player: Player,
  maxDepth: number = 8
): Move | null {
  return findBestMove(board, player, Math.min(maxDepth, 6))
}

export function findMoveAStar(
  board: Board,
  player: Player,
  maxDepth: number = 8
): Move | null {
  const start: AStarNode = {
    board: cloneBoard(board),
    player,
    move: null,
    g: 0,
    h: hCost(board, player),
    f: 0,
    parent: null,
    depth: 0,
  }
  start.f = start.h

  const openSet: AStarNode[] = [start]
  const closedSet = new Set<string>()

  let iterations = 0
  const maxIterations = 5000

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++

    openSet.sort((a, b) => a.f - b.f)
    const current = openSet.shift()!

    const boardKey = JSON.stringify(current.board)
    if (closedSet.has(boardKey)) continue
    closedSet.add(boardKey)

    if (current.depth >= maxDepth) {
      if (current.move) return current.move
      continue
    }

    const enemy = opponent(current.player)
    const moves = generateAllLegalMoves(current.board, current.player === player ? player : enemy)

    if (moves.length === 0) continue

    for (const move of moves) {
      const newBoard = applyMoveOnBoard(current.board, move)
      if (!newBoard) continue

      const nextPlayer = current.player === player ? enemy : player
      const h = hCost(newBoard, player)
      const g = current.g + 1

      const neighbor: AStarNode = {
        board: newBoard,
        player: nextPlayer,
        move: current.depth === 0 ? move : current.move,
        g,
        h,
        f: g + h,
        parent: current,
        depth: current.depth + 1,
      }

      const nKey = JSON.stringify(newBoard)
      if (!closedSet.has(nKey)) {
        openSet.push(neighbor)
      }
    }
  }

  return findBestMove(board, player)
}
