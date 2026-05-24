import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
});

const SHINY_PRICE = 500;

export async function createCheckoutSession(userId, pokemonId, pokemonName) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Shiny ${pokemonName}`,
            description: "Unlock shiny version of this Pokemon",
          },
          unit_amount: SHINY_PRICE,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL || "http://localhost:3001"}/?payment=success`,
    cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3001"}/?payment=cancelled`,
    metadata: {
      userId,
      pokemonId,
    },
  });
  
  return session;
}

export async function handleWebhook(body, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  const event = await stripe.webhooks.constructEvent(
    body,
    signature,
    webhookSecret
  );
  
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, pokemonId } = session.metadata;
    
    const { getDb } = await import("./db.js");
    const db = await getDb();
    
    await db.collection("userShiny").updateOne(
      { userId, pokemonId },
      { $set: { userId, pokemonId, unlocked: true, purchasedAt: new Date() } },
      { upsert: true }
    );
  }
  
  return event;
}
