import { createRoute, useSearch } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

export const skinsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/skins',
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: (search.session_id as string) || '',
  }),
  component: SkinsPage,
})

interface Skin {
  _id: string
  name: string
  free: boolean
  price?: number
  colors: {
    primary: string
    secondary: string
    accent: string
    piecePrimary?: string
    pieceSecondary?: string
  }
}

function SkinsPage() {
  const { getToken, isSignedIn } = useAuth()
  const { session_id } = skinsRoute.useSearch()
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [skins, setSkins] = useState<Skin[]>([])
  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>([])

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  const loadUserSkins = async () => {
    if (!isSignedIn) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/skins/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.unlockedSkins) {
        setUnlockedSkinIds(data.unlockedSkins.map((s: any) => s._id))
      }
    } catch (err) {
      console.error('Error loading user skins:', err)
    }
  }

  useEffect(() => {
    fetch(`${API_URL}/api/skins`)
      .then(res => res.json())
      .then(data => setSkins(data.skins || []))
      .catch(err => console.error('Error loading skins:', err))
  }, [])

  useEffect(() => {
    loadUserSkins()
  }, [isSignedIn])

  useEffect(() => {
    if (session_id && isSignedIn) {
      (async () => {
        const token = await getToken()
        if (!token) return
        try {
          const res = await fetch(`${API_URL}/api/stripe/verify-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ sessionId: session_id }),
          })
          if (res.ok) {
            await loadUserSkins()
            window.history.replaceState({}, document.title, '/skins')
          }
        } catch (err) {
          console.error('Error verifying payment:', err)
        }
      })()
    }
  }, [session_id, isSignedIn])

  const handlePurchase = async (skin: Skin) => {
    if (skin.free) return

    if (!isSignedIn) {
      alert('Debes iniciar sesión para comprar skins')
      return
    }

    setBuyingId(skin._id)

    try {
      const token = await getToken()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ skinId: skin._id }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Error al procesar el pago')
        setBuyingId(null)
        return
      }

      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      alert('Error de conexión con el servicio de pagos')
    }

    setBuyingId(null)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-4xl space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-display italic text-cream">
            Skins
          </h1>
          <p className="text-cream/40 font-body text-lg italic">
            personaliza tu tablero
          </p>
          <div className="h-px w-20 mx-auto bg-gradient-to-r from-transparent via-rosegold/30 to-transparent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {skins.map((skin) => {
            const isOwned = skin.free || unlockedSkinIds.includes(skin._id)
            return (
              <div
                key={skin._id}
                className="bg-cream/5 border border-cream/10 rounded-2xl overflow-hidden backdrop-blur-sm
                           hover:border-cream/20 transition-all duration-500 group"
              >
                <div className="h-32 p-4 flex items-center justify-center" style={{ backgroundColor: skin.colors.primary }}>
                  <div className="grid grid-cols-4 gap-0.5 w-24 h-24" style={{ borderRadius: '4px', overflow: 'hidden' }}>
                    {Array.from({ length: 16 }).map((_, i) => {
                      const r = Math.floor(i / 4)
                      const c = i % 4
                      const isDark = (r + c) % 2 === 1
                      const isPiece = i < 4
                      return (
                        <div
                          key={i}
                          style={{ backgroundColor: isDark ? skin.colors.accent + '40' : skin.colors.secondary + '20' }}
                          className="flex items-center justify-center"
                        >
                          {isPiece && (
                            <div style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              backgroundColor: i < 2 ? skin.colors.piecePrimary : skin.colors.pieceSecondary,
                              opacity: 0.6,
                            }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-cream text-base">{skin.name}</h3>
                    <span className={`text-xs font-body ${skin.free ? 'text-rosegold-light' : 'text-rose-300'}`}>
                      {skin.free ? 'Gratis' : `$${skin.price}`}
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    {Object.values(skin.colors).filter(Boolean).map((color, i) => (
                      <div key={i} className="w-4 h-4 rounded-full border border-cream/10" style={{ backgroundColor: color as string }} />
                    ))}
                  </div>

                  <button
                    onClick={() => handlePurchase(skin)}
                    disabled={buyingId === skin._id || isOwned}
                    className={`w-full mt-2 px-4 py-2 rounded-xl text-sm tracking-wider font-display transition-all duration-300 ${
                      isOwned
                        ? 'bg-green-500/10 border border-green-400/20 text-green-200 cursor-default'
                        : skin.free
                          ? 'bg-rose-500/10 border border-rose-400/20 text-rose-200 hover:bg-rose-500/20'
                          : 'bg-cream/5 border border-cream/10 text-cream/40 hover:border-cream/20 hover:text-cream/60'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {buyingId === skin._id ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border border-rosegold/30 border-t-rosegold rounded-full animate-spin" />
                        Procesando...
                      </span>
                    ) : isOwned ? 'Desbloqueada' : skin.free ? 'Seleccionar' : 'Comprar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
