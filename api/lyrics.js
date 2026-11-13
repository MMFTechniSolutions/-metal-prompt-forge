// Fonction serveur : génère les paroles via l'API Anthropic, côté serveur
// (l'appel direct depuis le navigateur est bloqué par CORS et exposerait la clé).

import { phoneticize } from './_lib/phoneticize.js'
import { lyricCard } from './_lib/lyricCard.js'

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

// Limites de contenu (nov. 2026) : appliquées à TOUTES les paroles (site + MCP + bot).
// Test doom 1991 : le générateur avait glissé des médicaments « qu'il n'aura plus besoin après le matin ».
const CONTENT_LIMITS = `Content limits for every song you write. Dark metal themes are welcome: death, war, grief, horror, rage, despair, the occult.
But NEVER depict, hint at or romanticize suicide or self-harm, not even implied: no pills or medication lined up or "not needed after tonight", no overdose, no rope or noose, no wrists or blades turned on oneself, no goodbye notes, no character planning or choosing to end their own life.
If the theme leans that way, turn it toward survival, rage, defiance or loss instead.
Also never: sexual content involving minors, slurs against real groups, real people's names, band names, artist names or song titles.
NO REPRODUCTION OF EXISTING LYRICS (absolute): never reproduce, quote or closely paraphrase the lyrics of any existing song, not even one recognizable line, chorus or hook, and never use a real song title as a hook or chorus line.
If the theme, angle or keywords you are given contain a line or title from a real song, keep only the idea behind it and write entirely new words: do not reuse that wording anywhere in the lyrics.
Every line you write must be original.`

// Anti-reproduction (nov. 2026) : test MCP avec un angle = refrain connu → l'IA l'avait recopié tel quel comme refrain.
// Vérif serveur : aucune suite de 5 mots du texte fourni par l'utilisateur (angle, mots imposés) ne doit sortir mot pour mot.
const NGRAM = 5
const words = (t) => String(t || '').toLowerCase().replace(/\[[^\]]*\]/g, ' ').replace(/[^a-z0-9à-ÿ']+/g, ' ').split(' ').filter(Boolean)
function copiedRun(userText, out) {
  const u = words(userText)
  if (u.length < NGRAM) return ''
  const grams = new Set()
  for (let i = 0; i + NGRAM <= u.length; i++) grams.add(u.slice(i, i + NGRAM).join(' '))
  const o = words(out)
  for (let i = 0; i + NGRAM <= o.length; i++) {
    const g = o.slice(i, i + NGRAM).join(' ')
    if (grams.has(g)) return g
  }
  return ''
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

  // Carte de paroles pigée (thème, atmosphère, etc.) : aucun appel IA
  if (body.mode === 'card') return lyricCard(body, res)

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

  // Texte tapé par l'utilisateur (angle, mots imposés) : sert à la vérif anti-reproduction
  const userText = [].concat(body.userText || []).map(String).join('\n').slice(0, 2000)

  const ask = async (content) => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.LYRICS_MODEL || 'claude-sonnet-4-6', // A/B : LYRICS_MODEL=claude-sonnet-5-5 dans Vercel
        max_tokens: maxTokens,
        system: CONTENT_LIMITS,
        messages: [{ role: 'user', content }],
      }),
    })
    return { r, data: await r.json() }
  }

  try {
    let { r, data } = await ask(prompt)
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: data?.error?.message || 'Erreur API Anthropic' })
    }

    let text = data.content?.find((b) => b.type === 'text')?.text || ''

    // Recopie mot pour mot du texte de l'utilisateur → 1 reprise avec consigne, sinon on bloque
    let hit = copiedRun(userText, text)
    if (hit) {
      ;({ r, data } = await ask(prompt + `\n\nIMPORTANT: the user's angle or keywords may quote an existing song. Do NOT reuse their wording (for example "${hit}"). Keep only the idea and write every line in brand-new words.`))
      if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Erreur API Anthropic' })
      text = data.content?.find((b) => b.type === 'text')?.text || ''
      hit = copiedRun(userText, text)
      if (hit) {
        return res.status(422).json({ error: "Ton angle ressemble à des paroles existantes. Décris l'idée dans tes mots. / Your angle looks like existing lyrics — describe the idea in your own words." })
      }
    }
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
