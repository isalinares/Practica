import type { Context, Next } from 'hono'
import { createClerkClient } from '@clerk/backend'

const clerkClient = createClerkClient({
  secretKey: Bun.env.CLERK_SECRET_KEY || '',
})

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
    const payload = await clerkClient.verifyToken(token)
    c.set('userId', payload.sub)
  } catch (err) {
    console.error('Auth error:', err)
    c.set('userId', 'guest')
  }

  await next()
}
