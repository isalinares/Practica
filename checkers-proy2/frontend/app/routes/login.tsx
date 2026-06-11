import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { SignIn } from '@clerk/clerk-react'

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
          <div className="flex justify-center">
            <SignIn
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-transparent shadow-none border-0',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'bg-rose-500/10 border border-rose-400/20 text-rose-200 hover:bg-rose-500/20',
                  formButtonPrimary: 'bg-rosegold hover:bg-rosegold/80 text-warmblack',
                  footerActionLink: 'text-rosegold-light hover:text-rose-300',
                  formFieldLabel: 'text-cream/60',
                  formFieldInput: 'bg-cream/5 border-cream/10 text-cream',
                }
              }}
              routing="hash"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
