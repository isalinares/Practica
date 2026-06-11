import { createRoute, useNavigate } from '@tanstack/react-router'
import { rootRoute } from '../__root'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

export const gameIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game',
  component: GameSetupPage,
})

interface Skin {
  _id: string
  name: string
  free: boolean
  colors: {
    primary: string
    secondary: string
    accent: string
    piecePrimary?: string
    pieceSecondary?: string
  }
}

function GameSetupPage() {
  const navigate = useNavigate()
  const { getToken, isSignedIn } = useAuth()
  const [playerColor, setPlayerColor] = useState<'red' | 'black'>('red')
  const [skins, setSkins] = useState<Skin[]>([])
  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>([])
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(null)

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    fetch(`${API_URL}/api/skins`)
      .then(res => res.json())
      .then(data => {
        const allSkins = data.skins || []
        setSkins(allSkins)
        const freeSkin = allSkins.find((s: Skin) => s.free)
        if (freeSkin) setSelectedSkinId(freeSkin._id)
      })
      .catch(err => console.error('Error loading skins:', err))
  }, [])

  useEffect(() => {
    if (isSignedIn) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      getToken().then(token => {
        if (token) {
          fetch(`${API_URL}/api/skins/user`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(data => {
              if (data.unlockedSkins) {
                setUnlockedSkinIds(data.unlockedSkins.map((s: any) => s._id))
              }
            })
            .catch(err => console.error('Error loading user skins:', err))
        }
      })
    }
  }, [isSignedIn, getToken])

  const availableSkins = skins.filter(s => s.free || unlockedSkinIds.includes(s._id))

  const startGame = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      const token = await getToken()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_URL}/api/games`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ playerColor, skinId: selectedSkinId }),
      })
      if (!res.ok) throw new Error('Failed to create game')
      const { game } = await res.json()
      navigate({ to: `/game/${game._id}`, search: { skinId: selectedSkinId } })
    } catch {
      const tempId = crypto.randomUUID?.() || `mock-${Date.now()}`
      navigate({ to: `/game/${tempId}`, search: { skinId: selectedSkinId } })
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

          {availableSkins.length > 0 && (
            <div className="space-y-4">
              <p className="text-cream/50 text-xs tracking-widest uppercase text-center">
                Skin del tablero
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                {availableSkins.map((skin) => (
                  <button
                    key={skin._id}
                    onClick={() => setSelectedSkinId(skin._id)}
                    className={`relative w-16 h-16 rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                      selectedSkinId === skin._id
                        ? 'border-rosegold/60 scale-110'
                        : 'border-cream/10 hover:border-cream/20'
                    }`}
                    style={{ backgroundColor: skin.colors.primary }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-0.5 w-8 h-8">
                        {Array.from({ length: 4 }).map((_, i) => {
                          const r = Math.floor(i / 2)
                          const c = i % 2
                          const isDark = (r + c) % 2 === 1
                          return (
                            <div
                              key={i}
                              style={{ backgroundColor: isDark ? skin.colors.accent : skin.colors.secondary }}
                              className="opacity-60"
                            />
                          )
                        })}
                      </div>
                    </div>
                    <span className="absolute bottom-0 left-0 right-0 text-[8px] text-cream/60 bg-black/50 py-0.5 text-center">
                      {skin.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
