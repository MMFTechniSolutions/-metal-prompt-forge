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

    // Quoi a été acheté ? On lit les metadata du Payment Link (copiées sur la session),
    // avec un plan B par ID de lien.
    const PACK_LINKS = {
      plink_1UVaugP7FMUYG6wCM6axWWlK: 10,
      plink_1UVauhP7FMUYG6wC8GDVyFIv: 30,
      plink_1UVauiP7FMUYG6wCMNFEsAKX: 50,   // ancien lien 20 $ (désactivé nov. 2026)
      plink_1UXAixP7FMUYG6wCKXp56SG8: 50,   // 50 crédits Studio à 15 $ (nov. 2026)
    }
    const LIFETIME_LINK = 'plink_1UVZw2P7FMUYG6wCvOZ7yJcS'
    const md = session.metadata || {}
    const packPrompts =
      md.kind === 'pack' ? parseInt(md.prompts, 10) || 0 : PACK_LINKS[session.payment_link] || 0

    if (email && packPrompts > 0) {
      // Crédits Studio : on AJOUTE des crédits, on ne touche pas au tier.
      const { data: u } = await supabase
        .from('users').select('prompt_credits').eq('email', email).maybeSingle()
      const credits = (u?.prompt_credits || 0) + packPrompts
      await supabase.from('users').upsert(
        { email, prompt_credits: credits, ...(session.customer ? { stripe_customer_id: session.customer } : {}) },
        { onConflict: 'email' }
      )
    } else if (email) {
      // Abonnement Forge Plus ou offre À VIE → accès complet (tier 'pro')
      // Forge Pro (5,99 $, nov. 2026) = Forge Plus + connecteur MCP → tier 'forge_pro'
      // Reconnu par la metadata du Payment Link (tier=forge_pro) ou par son ID (env FORGE_PRO_LINK).
      const isForgePro = md.tier === 'forge_pro' ||
        (process.env.FORGE_PRO_LINK && session.payment_link === process.env.FORGE_PRO_LINK)
      const tier = isForgePro ? 'forge_pro' : 'pro'
      const lifetime =
        session.mode === 'payment' && (md.kind === 'lifetime' || session.payment_link === LIFETIME_LINK)
      await supabase.from('users').upsert(
        {
          email,
          tier,
          ...(session.customer ? { stripe_customer_id: session.customer } : {}),
          ...(lifetime ? { lifetime: true, tier_expires_at: null } : {}),
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
    // Passage Forge Plus → Forge Pro : le client peut avoir encore un autre abonnement actif.
    // Dans ce cas on ne le remet PAS en gratuit quand l'ancien se termine.
    try {
      const still = await stripe.subscriptions.list({ customer: subscription.customer, status: 'active', limit: 1 })
      if (still.data.length) return res.status(200).json({ received: true, kept: true })
    } catch { /* en cas d'erreur Stripe : comportement d'avant */ }
    await supabase
      .from('users')
      .update({ tier: 'free' })
      .eq('stripe_customer_id', subscription.customer)
      .eq('lifetime', false)   // un membre à vie garde son accès même s'il annule un ancien abonnement
  }

  res.status(200).json({ received: true })
}
