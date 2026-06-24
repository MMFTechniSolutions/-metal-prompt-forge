// Fonction serveur : génère les paroles via l'API Anthropic, côté serveur
// (l'appel direct depuis le navigateur est bloqué par CORS et exposerait la clé).

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

  const prompt = body.prompt
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt manquant' })
  }

  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API non configurée' })
  }

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
        max_tokens: 1200,
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
    return res.status(200).json({ text })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' })
  }
}
