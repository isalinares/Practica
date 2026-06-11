import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { useState } from 'react'

export const skinsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/skins',
  component: SkinsPage,
})

const SKINS = [
  {
    id: 'classic', name: 'Clásico', free: true,
    colors: { primary: '#4a0e2e', secondary: '#faf6f0', accent: '#b76e79', piecePrimary: '#f43f5e', pieceSecondary: '#faf6f0' },
  },
  {
    id: 'rose', name: 'Rosa', free: true,
    colors: { primary: '#2d1b29', secondary: '#fdf2f4', accent: '#d4a0a8', piecePrimary: '#fb7185', pieceSecondary: '#fecdd3' },
  },
  {
    id: 'emerald', name: 'Esmeralda', price: 4.99,
    colors: { primary: '#0a1f1a', secondary: '#ecfdf5', accent: '#6ee7b7', piecePrimary: '#34d399', pieceSecondary: '#a7f3d0' },
  },
  {
    id: 'sapphire', name: 'Zafiro', price: 4.99,
    colors: { primary: '#0a1628', secondary: '#eff6ff', accent: '#93c5fd', piecePrimary: '#60a5fa', pieceSecondary: '#bfdbfe' },
  },
  {
    id: 'vintage', name: 'Vintage', price: 2.99,
    colors: { primary: '#2b1b0e', secondary: '#fef3c7', accent: '#d97706', piecePrimary: '#f59e0b', pieceSecondary: '#fde68a' },
  },
  {
    id: 'noir', name: 'Noir', price: 2.99,
    colors: { primary: '#0a0a0a', secondary: '#fafafa', accent: '#525252', piecePrimary: '#fafafa', pieceSecondary: '#262626' },
  },
]

function SkinsPage() {
  const [buyingId, setBuyingId] = useState<string | null>(null)

  const handlePurchase = async (skin: typeof SKINS[0]) => {
    if (skin.free) return

    setBuyingId(skin.id)

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinId: skin.id }),
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
          {SKINS.map((skin) => (
            <div
              key={skin.id}
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
                  {Object.values(skin.colors).map((color, i) => (
                    <div key={i} className="w-4 h-4 rounded-full border border-cream/10" style={{ backgroundColor: color }} />
                  ))}
                </div>

                <button
                  onClick={() => handlePurchase(skin)}
                  disabled={buyingId === skin.id}
                  className={`w-full mt-2 px-4 py-2 rounded-xl text-sm tracking-wider font-display transition-all duration-300 ${
                    skin.free
                      ? 'bg-rose-500/10 border border-rose-400/20 text-rose-200 hover:bg-rose-500/20'
                      : 'bg-cream/5 border border-cream/10 text-cream/40 hover:border-cream/20 hover:text-cream/60'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {buyingId === skin.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border border-rosegold/30 border-t-rosegold rounded-full animate-spin" />
                      Procesando...
                    </span>
                  ) : skin.free ? 'Seleccionar' : 'Comprar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
