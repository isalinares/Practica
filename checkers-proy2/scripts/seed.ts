import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/checkers'

const SkinSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['board', 'piece'] },
  price: Number,
  free: Boolean,
  stripePriceId: String,
  colors: {
    primary: String,
    secondary: String,
    accent: String,
    piecePrimary: String,
    pieceSecondary: String,
  },
  preview: String,
})

const Skin = mongoose.model('Skin', SkinSchema)

const DEFAULT_SKINS = [
  {
    name: 'Clásico',
    type: 'board',
    price: 0,
    free: true,
    stripePriceId: null,
    colors: {
      primary: '#4a0e2e',
      secondary: '#faf6f0',
      accent: '#b76e79',
      piecePrimary: '#f43f5e',
      pieceSecondary: '#faf6f0',
    },
  },
  {
    name: 'Rosa',
    type: 'board',
    price: 0,
    free: true,
    stripePriceId: null,
    colors: {
      primary: '#2d1b29',
      secondary: '#fdf2f4',
      accent: '#d4a0a8',
      piecePrimary: '#fb7185',
      pieceSecondary: '#fecdd3',
    },
  },
  {
    name: 'Esmeralda',
    type: 'board',
    price: 4.99,
    free: false,
    stripePriceId: 'price_esmeralda',
    colors: {
      primary: '#0a1f1a',
      secondary: '#ecfdf5',
      accent: '#6ee7b7',
      piecePrimary: '#34d399',
      pieceSecondary: '#a7f3d0',
    },
  },
  {
    name: 'Zafiro',
    type: 'board',
    price: 4.99,
    free: false,
    stripePriceId: 'price_zafiro',
    colors: {
      primary: '#0a1628',
      secondary: '#eff6ff',
      accent: '#93c5fd',
      piecePrimary: '#60a5fa',
      pieceSecondary: '#bfdbfe',
    },
  },
  {
    name: 'Vintage',
    type: 'board',
    price: 2.99,
    free: false,
    stripePriceId: 'price_vintage',
    colors: {
      primary: '#2b1b0e',
      secondary: '#fef3c7',
      accent: '#d97706',
      piecePrimary: '#f59e0b',
      pieceSecondary: '#fde68a',
    },
  },
  {
    name: 'Noir',
    type: 'board',
    price: 2.99,
    free: false,
    stripePriceId: 'price_noir',
    colors: {
      primary: '#0a0a0a',
      secondary: '#fafafa',
      accent: '#525252',
      piecePrimary: '#fafafa',
      pieceSecondary: '#262626',
    },
  },
]

async function seed() {
  await mongoose.connect(MONGO_URI)

  await Skin.deleteMany({})
  await Skin.insertMany(DEFAULT_SKINS)

  console.log('Seeded skins successfully')

  await mongoose.disconnect()
}

seed().catch(console.error)
