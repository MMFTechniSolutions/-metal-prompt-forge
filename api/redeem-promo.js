import { createClient } from '@supabase/supabase-js'

// Service key = accès serveur complet (contourne RLS). Mêmes variables que webhook.js.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, email } = req.body || {}
  if (!code || !email) return res.status(400).json({ ok: false, error: 'Code et email requis.' })

  const norm = String(code).trim().toUpperCase()
  const mail = String(email).trim().toLowerCase()

  try {
    // 1. Le code existe-t-il ?
    const { data: promo, error: pErr } = await supabase
      .from('promo_codes')
      .select('code,tier,days,redeemed_by,active')
      .eq('code', norm)
      .single()

    if (pErr || !promo) return res.status(404).json({ ok: false, error: 'Code introuvable.' })
    if (promo.active === false) return res.status(400).json({ ok: false, error: 'Ce code est désactivé.' })
    if (promo.redeemed_by) {
      // déjà utilisé — mais on laisse la même personne "revoir" son propre succès
      if (promo.redeemed_by.toLowerCase() !== mail)
        return res.status(400).json({ ok: false, error: 'Ce code a déjà été utilisé.' })
    }

    // 2. L'utilisateur a-t-il déjà un vrai abonnement payant (Stripe, sans date d'expiration) ?
    const { data: existing } = await supabase
      .from('users')
      .select('tier,tier_expires_at')
      .eq('email', mail)
      .single()

    if (existing && existing.tier && existing.tier !== 'free' && !existing.tier_expires_at) {
      return res.status(400).json({ ok: false, error: 'Tu as déjà un accès complet actif.' })
    }

    // 3. Calcul de l'expiration
    const days = Number(promo.days) || 30
    const grantTier = promo.tier || 'pro'
    // si un accès promo est encore actif, on prolonge à partir de la date la plus lointaine
    const base = existing?.tier_expires_at && new Date(existing.tier_expires_at).getTime() > Date.now()
      ? new Date(existing.tier_expires_at).getTime()
      : Date.now()
    const expires = new Date(base + days * 24 * 60 * 60 * 1000)

    // 4. Appliquer le tier à l'utilisateur (upsert par email)
    const { error: uErr } = await supabase.from('users').upsert(
      { email: mail, tier: grantTier, tier_expires_at: expires.toISOString() },
      { onConflict: 'email' }
    )
    if (uErr) return res.status(500).json({ ok: false, error: 'Erreur en appliquant le code.' })

    // 5. Marquer le code comme utilisé (usage unique)
    await supabase
      .from('promo_codes')
      .update({ redeemed_by: mail, redeemed_at: new Date().toISOString() })
      .eq('code', norm)

    const expStr = expires.toLocaleDateString('fr-CA')
    return res.status(200).json({ ok: true, tier: grantTier, expires: expStr })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Erreur serveur.' })
  }
}
