import { Game } from '../models/Game'
import { User } from '../models/User'
import { getAiMove } from './ia-client'
import { createInitialBoard, applyMove, checkGameOver } from './board-logic'

export async function createGame(clerkId: string, playerColor: 'red' | 'black' = 'red') {
  let user = await User.findOne({ clerkId })
  if (!user) {
    user = await User.create({ clerkId, username: `player_${clerkId.slice(-6)}` })
  }

  const board = createInitialBoard()
  return Game.create({
    playerId: user._id,
    board,
    currentTurn: 'red',
    playerColor,
    status: 'playing' as const,
    moveCount: 0,
    moves: [],
  })
}

export async function makeMove(gameId: string, clerkId: string, from: [number, number], to: [number, number]) {
  const game = await Game.findById(gameId)
  if (!game) throw new Error('Game not found')
  if (game.status !== 'playing') throw new Error('Game is over')
  if (game.currentTurn !== game.playerColor) throw new Error('Not your turn')

  const boardData: number[][] = JSON.parse(JSON.stringify(game.board))

  const newBoard = applyMove(boardData, from, to)
  if (!newBoard) throw new Error('Invalid move')

  game.board = newBoard as any
  game.moveCount += 1
  game.moves.push({
    from,
    to,
    player: game.playerColor,
    moveNumber: game.moveCount,
  } as any)

  const status = checkGameOver(newBoard, 'black')
  if (status !== 'playing') {
    game.status = status as any
    await finalizeGame(game)
    return game
  }

  game.currentTurn = 'black'
  await game.save()

  try {
    const aiMove = await getAiMove(newBoard, 'black')
    const aiBoard = applyMove(newBoard, aiMove.from, aiMove.to)

    if (aiBoard) {
      game.board = aiBoard as any
      game.moveCount += 1
      game.moves.push({
        from: aiMove.from,
        to: aiMove.to,
        player: 'black',
        moveNumber: game.moveCount,
      } as any)

      const aiStatus = checkGameOver(aiBoard, 'red')
      if (aiStatus !== 'playing') {
        game.status = aiStatus as any
        await finalizeGame(game)
        return game
      }

      game.currentTurn = 'red'
    }
  } catch (e) {
    console.error('AI move failed, switching turn back:', e)
    game.currentTurn = 'red'
  }

  await game.save()
  return game
}

async function finalizeGame(game: any) {
  const won = game.status === `${game.playerColor}-wins`

  await User.findByIdAndUpdate(game.playerId, {
    $inc: {
      gamesPlayed: 1,
      gamesWon: won ? 1 : 0,
      totalMoves: game.moveCount,
    },
    $min: { bestMoves: won ? game.moveCount : Infinity },
  })

  await game.save()
}
