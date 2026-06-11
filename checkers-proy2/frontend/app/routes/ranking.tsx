import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { useState, useEffect } from 'react'

export const rankingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ranking',
  component: RankingPage,
})

interface RankedUser {
  username: string
  gamesPlayed: number
  gamesWon: number
  bestMoves: number | null
  totalMoves: number
}

function RankingPage() {
  const [users, setUsers] = useState<RankedUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ranking')
      .then(r => r.json())
      .then(data => { setUsers(data.users || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-display italic text-cream">
            Ranking
          </h1>
          <p className="text-cream/40 font-body text-lg italic">
            las mejores estrategas
          </p>
          <div className="h-px w-20 mx-auto bg-gradient-to-r from-transparent via-rosegold/30 to-transparent" />
        </div>

        <div className="bg-cream/5 border border-cream/10 rounded-2xl overflow-hidden backdrop-blur-sm">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-rosegold/30 border-t-rosegold rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-cream/30 text-sm font-body italic">Cargando...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <span className="text-4xl block text-cream/20">♛</span>
              <p className="text-cream/30 font-body italic">
                Aún no hay partidas registradas
              </p>
              <p className="text-cream/20 text-sm font-body">
                Juega y aparecerás aquí
              </p>
            </div>
          ) : (
            <div className="divide-y divide-cream/5">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs tracking-widest uppercase text-cream/30 font-body">
                <span className="col-span-1">#</span>
                <span className="col-span-4">Jugadora</span>
                <span className="col-span-2 text-center">Jugadas</span>
                <span className="col-span-2 text-center">Ganadas</span>
                <span className="col-span-3 text-right">Mejor</span>
              </div>
              {users.map((user, i) => (
                <div key={i} className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors duration-300 ${
                  i === 0 ? 'bg-rosegold/5' : 'hover:bg-cream/5'
                }`}>
                  <span className={`col-span-1 font-display ${
                    i === 0 ? 'text-rosegold-light text-lg' : i < 3 ? 'text-cream/40' : 'text-cream/20'
                  }`}>
                    {i === 0 ? '♛' : i + 1}
                  </span>
                  <span className="col-span-4 text-cream/80 font-body text-sm">
                    {user.username}
                  </span>
                  <span className="col-span-2 text-center text-cream/40 text-sm font-body">
                    {user.gamesPlayed}
                  </span>
                  <span className="col-span-2 text-center text-cream/40 text-sm font-body">
                    {user.gamesWon}
                  </span>
                  <span className="col-span-3 text-right text-rosegold-light font-body text-sm">
                    {user.bestMoves ? `${user.bestMoves} mov` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
