import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const session = event.data.object

  if (event.type === 'checkout.session.completed') {
    const email = session.customer_email
    const priceId = session.line_items?.data[0]?.price?.id

    let tier = 'forge'
    if (priceId === process.env.PRICE_PRO) tier = 'pro'
    if (priceId === process.env.PRICE_ELITE) tier = 'elite'

    await supabase.from('users').upsert({
      email,
      tier,
      stripe_customer_id: session.customer,
      prompts_used: 0,
      lyrics_used: 0,
    }, { onConflict: 'email' })
  }

  if (event.type === 'customer.subscription.deleted') {
    const customerId = session.customer
    await supabase.from('users')
      .update({ tier: 'free' })
      .eq('stripe_customer_id', customerId)
  }

  res.status(200).json({ received: true })
}