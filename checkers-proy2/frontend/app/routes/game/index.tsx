import { createRoute, useNavigate } from '@tanstack/react-router'
import { rootRoute } from '../__root'
import { useState } from 'react'

export const gameIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game',
  component: GameSetupPage,
})

function GameSetupPage() {
  const navigate = useNavigate()
  const [playerColor, setPlayerColor] = useState<'red' | 'black'>('red')

  const startGame = async () => {
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerColor }),
      })
      if (!res.ok) throw new Error('Failed to create game')
      const { game } = await res.json()
      navigate({ to: `/game/${game._id}` })
    } catch {
      const tempId = crypto.randomUUID?.() || `mock-${Date.now()}`
      navigate({ to: `/game/${tempId}` })
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-10 animate-fade-in">
        <div className="text-center space-y-3">
          <span className="text-5xl block text-rosegold-light animate-float">♛</span>
          <h1 className="text-4xl font-display italic text-cream">
            Nueva Partida
          </h1>
          <p className="text-cream/40 font-body text-lg italic">
            elige tu color y comienza
          </p>
          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-rosegold/30 to-transparent" />
        </div>

        <div className="bg-cream/5 border border-cream/10 rounded-2xl p-8 space-y-8 backdrop-blur-sm">
          <div className="space-y-4">
            <p className="text-cream/50 text-xs tracking-widest uppercase text-center">
              Tu color
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setPlayerColor('red')}
                className={`relative w-28 h-28 rounded-2xl border-2 transition-all duration-500 flex flex-col items-center justify-center gap-2 ${
                  playerColor === 'red'
                    ? 'border-rose-400/60 bg-rose-500/10 shadow-lg shadow-rose-500/10'
                    : 'border-cream/10 bg-cream/5 hover:border-cream/20'
                }`}
              >
                <span className={`w-10 h-10 rounded-full ${
                  playerColor === 'red' ? 'bg-rose-400 animate-pulse-glow' : 'bg-rose-400/30'
                }`} />
                <span className={`text-sm font-display tracking-wider ${
                  playerColor === 'red' ? 'text-rose-200' : 'text-cream/30'
                }`}>
                  Rojas
                </span>
              </button>

              <button
                onClick={() => setPlayerColor('black')}
                className={`relative w-28 h-28 rounded-2xl border-2 transition-all duration-500 flex flex-col items-center justify-center gap-2 ${
                  playerColor === 'black'
                    ? 'border-cream/30 bg-cream/10 shadow-lg shadow-cream/10'
                    : 'border-cream/10 bg-cream/5 hover:border-cream/20'
                }`}
              >
                <span className={`w-10 h-10 rounded-full ${
                  playerColor === 'black' ? 'bg-cream animate-pulse-glow' : 'bg-cream/20'
                }`} />
                <span className={`text-sm font-display tracking-wider ${
                  playerColor === 'black' ? 'text-cream' : 'text-cream/30'
                }`}>
                  Blancas
                </span>
              </button>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full px-8 py-4 bg-rose-500/10 border border-rose-400/30 rounded-xl
                       text-rose-200 font-display text-lg tracking-wide
                       hover:bg-rose-500/20 hover:border-rose-300/50 transition-all duration-500
                       active:scale-[0.98]"
          >
            Comenzar Partida
          </button>
        </div>
      </div>
    </div>
  )
}
