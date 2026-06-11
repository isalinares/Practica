import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import '../global.css'

export const rootRoute = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen bg-warmblack flex flex-col">
      <nav className="border-b border-rose-800/20 bg-warmblack/80 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-display italic text-rosegold-light group-hover:text-rose-300 transition-colors">
              ♛
            </span>
            <span className="font-display text-xl tracking-wide text-cream group-hover:text-rose-100 transition-colors">
              Dames
            </span>
          </Link>

          <div className="flex items-center gap-8 text-sm tracking-widest uppercase">
            <Link to="/game" className="text-cream/60 hover:text-rose-300 transition-colors duration-300">
              Jugar
            </Link>
            <Link to="/ranking" className="text-cream/60 hover:text-rose-300 transition-colors duration-300">
              Ranking
            </Link>
            <Link to="/skins" className="text-cream/60 hover:text-rose-300 transition-colors duration-300">
              Skins
            </Link>
            <Link to="/login" className="px-4 py-1.5 border border-rosegold/40 rounded-full text-rosegold-light hover:bg-rosegold/10 transition-all duration-300">
              Ingresar
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      <footer className="border-t border-rose-800/10 py-6 text-center text-cream/30 text-xs tracking-widest uppercase">
        <span className="font-display text-sm italic">Dames</span> — un juego de damas con alma
      </footer>
    </div>
  )
}
