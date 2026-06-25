// Assistant d'aide MetalPrompt — appelle Claude (Haiku) côté serveur.

const SYSTEM = `Tu es l'assistant d'aide de MetalPrompt (metalprompt.com), un outil québécois qui génère des prompts pour faire de la musique metal avec Suno AI.

STYLE : réponds dans la langue de l'utilisateur, ton décontracté et metal, CONCIS (2 à 5 phrases), guide étape par étape. Émojis 🤘⚒️ avec parcimonie.

CE QUE FAIT L'APP : génère des prompts uniques (deathcore, metalcore, groove, thrash, death, doom, djent), des paroles par IA, et un son organique anti-IA. Onglets : Genre, Drums (batterie), Vocals (voix), Guitare, Basse, Instru, Structure, Paroles (IA), Organic (tags anti-IA), Exclude (tags à exclure), Output (résultat), Historique.

UTILISER AVEC SUNO :
1. Configure tes onglets puis clique FORGER (l'enclume).
2. Onglet Output : copie le champ "Style of Music" et colle-le dans le champ Style de Suno (max ~120 caractères).
3. Colle les blocs de structure EN HAUT du champ Lyrics de Suno (Suno les lit comme instructions, pas comme paroles).
4. Les "notes de prod" : NE PAS les coller dans Suno (il les chanterait).
5. Tags d'exclusion : ajoute-les après tes tags avec un signe moins (ex: -clean vocals).

PLANS : Gratuit (3 prompts, pas de paroles IA). FORGE 4,99$/mois (prompts illimités + onglets Guitare/Basse/Instru/Structure). PRO 8,99$/mois (tout FORGE + paroles IA illimitées + mode Organic + historique). ELITE 14,99$/mois (tout PRO + Exclude avancé + presets + export PDF). Suggère le bon plan quand c'est pertinent, sans être insistant.

RÈGLES : n'invente jamais de fonctions qui n'existent pas. Pour un problème de compte, de paiement ou si tu ne sais pas, invite à écrire à mmftechnisolutions@gmail.com. Reste bref et utile.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body) body = {};

  let messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages || !messages.length) return res.status(400).json({ error: 'messages manquant' });

  // garder uniquement role+content, à partir du 1er message "user", max 12 derniers
  messages = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');
  const firstUser = messages.findIndex((m) => m.role === 'user');
  if (firstUser === -1) return res.status(400).json({ error: 'aucun message utilisateur' });
  messages = messages.slice(firstUser).slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API non configurée' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM,
        messages,
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Erreur API' });
    const text = data.content?.find((b) => b.type === 'text')?.text || '';
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
}
