import { createRoute, Link } from '@tanstack/react-router'
import { rootRoute } from './__root'

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/3 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rosegold/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center px-4 space-y-8 animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-7xl md:text-8xl font-display italic text-cream leading-tight">
            Dames
          </h1>
          <p className="text-xl md:text-2xl font-body text-rosegold-light italic">
            el arte de la estrategia
          </p>
        </div>

        <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-rosegold/40 to-transparent" />

        <p className="text-cream/50 text-sm max-w-md mx-auto font-body tracking-wide">
          Un juego de damas donde cada movimiento es una declaración.
          Enfréntate a la inteligencia artificial en una partida clásica.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/game"
            className="group relative px-10 py-3.5 bg-rose-500/10 border border-rose-400/30 rounded-full
                       text-rose-200 font-display text-lg tracking-wide
                       hover:bg-rose-500/20 hover:border-rose-300/50 transition-all duration-500"
          >
            <span className="relative z-10">Nueva Partida</span>
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-500/0 via-rose-400/10 to-rose-500/0
                         opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer" />
          </Link>

          <Link
            to="/ranking"
            className="px-8 py-3.5 border border-cream/10 rounded-full text-cream/50 font-display text-sm tracking-widest uppercase
                       hover:border-cream/20 hover:text-cream/70 transition-all duration-500"
          >
            Ver Ranking
          </Link>
        </div>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-float">
        <div className="flex gap-3 text-cream/10 text-2xl">
          <span>♟</span>
          <span>♛</span>
          <span>♝</span>
        </div>
      </div>
    </div>
  )
}
