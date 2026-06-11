import { Schema, model } from 'mongoose'

const MoveSchema = new Schema({
  from: { type: [Number], required: true },
  to: { type: [Number], required: true },
  captured: { type: [Number], default: null },
  player: { type: String, enum: ['red', 'black'], required: true },
  moveNumber: { type: Number, required: true },
}, { _id: false })

const GameSchema = new Schema({
  playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  board: { type: [[Number]], required: true },
  currentTurn: { type: String, enum: ['red', 'black'], default: 'red' },
  status: {
    type: String,
    enum: ['playing', 'red-wins', 'black-wins', 'draw'],
    default: 'playing',
  },
  playerColor: { type: String, enum: ['red', 'black'], default: 'red' },
  moveCount: { type: Number, default: 0 },
  moves: [MoveSchema],
}, { timestamps: true })

export const Game = model('Game', GameSchema)
