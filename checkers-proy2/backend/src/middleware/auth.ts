import type { Context, Next } from 'hono'
import { createClerkClient } from '@clerk/backend'

export async function authMiddleware(c: Context<{ Variables: { userId: string } }>, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    c.set('userId', 'guest')
    await next()
    return
  }

  const token = authHeader.slice(7)

  if (token === 'guest') {
    c.set('userId', 'guest')
    await next()
    return
  }

  try {
    const clerkClient = createClerkClient({
      secretKey: Bun.env.CLERK_SECRET_KEY || '',
    })
    const session = await clerkClient.sessions.verifyToken(token)
    c.set('userId', session.sub)
  } catch {
    c.set('userId', 'guest')
  }

  await next()
}
