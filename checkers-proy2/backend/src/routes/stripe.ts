import { Hono } from 'hono'
import Stripe from 'stripe'
import { authMiddleware } from '../middleware/auth'
import { Skin } from '../models/Skin'
import { User } from '../models/User'

type Variables = { userId: string }

const router = new Hono<{ Variables: Variables }>()

function getStripe(): Stripe {
  const key = Bun.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(key)
}

router.post('/create-checkout', authMiddleware, async (c) => {
  const { skinId } = await c.req.json()
  const clerkId = c.get('userId')

  if (!skinId) return c.json({ error: 'skinId required' }, 400)

  const skin = await Skin.findById(skinId)
  if (!skin) return c.json({ error: 'Skin not found' }, 404)
  if (skin.free) return c.json({ error: 'Skin is free' }, 400)

  const user = await User.findOne({ clerkId })
  if (!user) return c.json({ error: 'User not found' }, 404)

  if (user.unlockedSkins.some((id: any) => id.toString() === skin._id.toString())) {
    return c.json({ error: 'Already owned' }, 400)
  }

  try {
    const stripe = getStripe()
    const origin = c.req.header('Origin') || 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: skin.name,
            description: `Skin ${skin.type === 'board' ? 'de tablero' : 'de ficha'} para Dames`,
          },
          unit_amount: Math.round(skin.price * 100),
        },
        quantity: 1,
      }],
      metadata: {
        skinId: skin._id.toString(),
        clerkUserId: clerkId,
      },
      success_url: `${origin}/skins?purchased=${skin._id}`,
      cancel_url: `${origin}/skins`,
    })

    return c.json({ url: session.url })
  } catch (e: any) {
    console.error('Stripe checkout error:', e)
    return c.json({ error: 'Payment service unavailable' }, 500)
  }
})

router.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature')
  const webhookSecret = Bun.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return c.json({ error: 'Missing signature or webhook secret' }, 400)
  }

  try {
    const stripe = getStripe()
    const body = await c.req.text()

    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      const { skinId, clerkUserId } = session.metadata || {}

      if (skinId && clerkUserId) {
        const user = await User.findOne({ clerkId: clerkUserId })
        if (user && !user.unlockedSkins.some((id: any) => id.toString() === skinId)) {
          user.unlockedSkins.push(skinId)
          await user.save()
          console.log(`Skin ${skinId} unlocked for user ${clerkUserId}`)
        }
      }
    }

    return c.json({ received: true })
  } catch (e: any) {
    console.error('Stripe webhook error:', e.message)
    return c.json({ error: 'Webhook error' }, 400)
  }
})

export default router
