import { Board, Player, Move } from './types'
import { opponent } from './board'
import { generateAllLegalMoves, applyMoveOnBoard } from './moves'
import { evaluate } from './heuristic'

export interface TreeNode {
  board: Board
  player: Player
  move: Move | null
  children: TreeNode[]
  score: number
  depth: number
  isMaximizing: boolean
}

export function buildTree(
  board: Board,
  player: Player,
  depth: number = 0,
  maxDepth: number = 6
): TreeNode {
  const moves = generateAllLegalMoves(board, player)
  const isMaximizing = player === 'red'

  const node: TreeNode = {
    board,
    player,
    move: null,
    children: [],
    score: evaluate(board, player),
    depth,
    isMaximizing,
  }

  if (depth >= maxDepth || moves.length === 0) {
    return node
  }

  for (const move of moves) {
    const newBoard = applyMoveOnBoard(board, move)
    if (newBoard) {
      const child = buildTree(newBoard, opponent(player), depth + 1, maxDepth)
      child.move = move
      node.children.push(child)
    }
  }

  return node
}

export function minimax(
  node: TreeNode,
  alpha: number = -Infinity,
  beta: number = Infinity,
): number {
  if (node.children.length === 0) {
    node.score = evaluate(node.board, node.player)
    return node.score
  }

  if (node.isMaximizing) {
    let maxScore = -Infinity
    for (const child of node.children) {
      const score = minimax(child, alpha, beta)
      maxScore = Math.max(maxScore, score)
      alpha = Math.max(alpha, score)
      if (beta <= alpha) break
    }
    node.score = maxScore
    return maxScore
  } else {
    let minScore = Infinity
    for (const child of node.children) {
      const score = minimax(child, alpha, beta)
      minScore = Math.min(minScore, score)
      beta = Math.min(beta, score)
      if (beta <= alpha) break
    }
    node.score = minScore
    return minScore
  }
}

export function findBestMove(board: Board, player: Player, maxDepth: number = 6): Move | null {
  const tree = buildTree(board, player, 0, maxDepth)

  if (tree.children.length === 0) return null

  minimax(tree)

  let bestChild = tree.children[0]

  for (const child of tree.children) {
    if (tree.isMaximizing) {
      if (child.score > bestChild.score) bestChild = child
    } else {
      if (child.score < bestChild.score) bestChild = child
    }
  }

  return bestChild.move
}
