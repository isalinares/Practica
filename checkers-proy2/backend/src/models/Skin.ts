import { Schema, model } from 'mongoose'

const SkinSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['board', 'piece'], required: true },
  price: { type: Number, required: true },
  free: { type: Boolean, default: false },
  stripePriceId: { type: String, default: null },
  colors: {
    primary: { type: String, required: true },
    secondary: { type: String, required: true },
    accent: { type: String, required: true },
    piecePrimary: { type: String },
    pieceSecondary: { type: String },
  },
  preview: { type: String },
}, { timestamps: true })

export const Skin = model('Skin', SkinSchema)
