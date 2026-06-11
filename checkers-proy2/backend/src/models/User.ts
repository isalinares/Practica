import { Schema, model } from 'mongoose'

const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  totalMoves: { type: Number, default: 0 },
  bestMoves: { type: Number, default: null },
  unlockedSkins: [{ type: Schema.Types.ObjectId, ref: 'Skin' }],
}, { timestamps: true })

UserSchema.index({ bestMoves: 1 })

export const User = model('User', UserSchema)
