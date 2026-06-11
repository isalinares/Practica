import { createRoute, Link } from '@tanstack/react-router'
import { rootRoute } from './__root'

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-display italic text-cream">
            Bienvenida
          </h1>
          <p className="text-cream/40 font-body text-lg italic">
            inicia sesión para jugar
          </p>
          <div className="h-px w-20 mx-auto bg-gradient-to-r from-transparent via-rosegold/30 to-transparent" />
        </div>

        <div className="bg-cream/5 border border-cream/10 rounded-2xl p-8 space-y-6 backdrop-blur-sm">
          <div className="space-y-2">
            <p className="text-cream/60 text-sm tracking-widest uppercase">
              Próximamente
            </p>
            <p className="text-cream/30 text-sm font-body italic">
              El registro con Clerk estará disponible próximamente.
              Por ahora, puedes explorar el juego.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/game"
              className="block w-full text-center px-6 py-3 bg-rose-500/10 border border-rose-400/20 rounded-xl
                         text-rose-200 font-display text-sm tracking-widest uppercase
                         hover:bg-rose-500/20 transition-all duration-300"
            >
              Jugar como Invitado
            </Link>
            <Link
              to="/"
              className="block w-full text-center px-6 py-3 text-cream/40 text-sm tracking-widest uppercase
                         hover:text-cream/60 transition-all duration-300"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
