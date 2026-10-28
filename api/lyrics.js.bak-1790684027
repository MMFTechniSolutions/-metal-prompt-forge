// Fonction serveur : génère les paroles via l'API Anthropic, côté serveur
// (l'appel direct depuis le navigateur est bloqué par CORS et exposerait la clé).

import { phoneticize } from './_lib/phoneticize.js'

// Consignes d'écriture par intensité vocale (recette — validé 2026-07-04) :
// le générateur doit écrire POUR le style vocal, pas juste déformer après.
const STYLE_WRITING = {
  normal:
    "\n\nIMPORTANT - vocal style constraints: these lyrics are for harsh death metal growls. Favor hard consonants and short punchy syllables. Avoid long open-vowel melodic phrases and avoid words that only work sung clean.",
  extreme:
    "\n\nIMPORTANT - vocal style constraints: these lyrics are for grindcore. Write ultra-short fragments of 1-4 syllables, percussive words, almost no full sentences. Total length very short (under 60 words). Repetition as percussion is good.",
  stretched:
    "\n\nIMPORTANT - vocal style constraints: these lyrics are for black metal shrieks held over tremolo picking. Few words per line (4-6 max), long open vowels that can be sustained (fall, cold, moon, throne), evocative imagery. Leave room for the voice to stretch each word.",
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Récupère le corps (objet déjà parsé par Vercel, ou chaîne JSON)
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  if (!body) body = {}

  let prompt = body.prompt
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt manquant' })
  }

  // Le générateur voit le style vocal : consigne d'écriture selon l'intensité
  const intensity = body.phoneticIntensity
  if (STYLE_WRITING[intensity]) {
    prompt += STYLE_WRITING[intensity]
  }

  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API non configurée' })
  }

  // Plafond de génération : assez haut pour NE PAS tronquer les grosses structures
  // (jusqu'à ~18 blocs). La facturation se fait sur les tokens réellement produits,
  // donc un plafond élevé ne coûte pas plus cher — il évite juste la coupure.
  // Le client peut aussi envoyer body.maxTokens (borné 1200..8000).
  const maxTokens = Math.min(8000, Math.max(1200, parseInt(body.maxTokens) || 8000))

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await r.json()
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: data?.error?.message || 'Erreur API Anthropic' })
    }

    const text = data.content?.find((b) => b.type === 'text')?.text || ''
    // stop_reason peut valoir "max_tokens" si jamais c'était encore coupé (diagnostic).
    const truncated = data.stop_reason === 'max_tokens'

    // Déformation phonétique optionnelle (recette : vocaux harsh).
    // Le client passe phoneticIntensity depuis la réponse de /api/forge.
    if (['normal', 'extreme', 'stretched'].includes(intensity)) {
      return res.status(200).json({ text, textPhonetic: phoneticize(text, intensity), truncated })
    }
    return res.status(200).json({ text, truncated })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' })
  }
}
