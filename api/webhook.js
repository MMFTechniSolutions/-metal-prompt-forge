import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Stripe a besoin du corps BRUT pour vérifier la signature → on désactive le parseur de Vercel.
export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) =>
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    )
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  let event

  try {
    const rawBody = await readRawBody(req)
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Nouvel abonnement payé
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const email = session.customer_details?.email || session.customer_email

    // line_items n'est PAS inclus dans l'event → on le récupère explicitement.
    let priceId
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 1,
      })
      priceId = lineItems.data[0]?.price?.id
    } catch (e) {
      priceId = undefined
    }

    let tier = 'forge'
    if (priceId === process.env.PRICE_PRO) tier = 'pro'
    if (priceId === process.env.PRICE_ELITE) tier = 'elite'

    if (email) {
      await supabase.from('users').upsert(
        {
          email,
          tier,
          stripe_customer_id: session.customer,
          prompts_used: 0,
          lyrics_used: 0,
        },
        { onConflict: 'email' }
      )
    }
  }

  // Abonnement annulé / terminé → retour en gratuit
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    await supabase
      .from('users')
      .update({ tier: 'free' })
      .eq('stripe_customer_id', subscription.customer)
  }

  res.status(200).json({ received: true })
}
