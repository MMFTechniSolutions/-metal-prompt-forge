// /api/suno.js — Résout un lien Suno (suno.com/s/xxx ou suno.com/song/<uuid>)
// en { id, title, image, audio, url } pour jouer la toune direct dans la galerie.
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export default async function handler(req, res) {
  const raw = String((req.query && req.query.url) || '').trim();
  let u;
  try { u = new URL(raw); } catch { return res.status(400).json({ error: 'bad_url' }); }
  const host = u.hostname.replace(/^www\./, '');
  if (host !== 'suno.com' && host !== 'app.suno.ai' && host !== 'suno.ai') {
    return res.status(400).json({ error: 'not_suno' });
  }
  try {
    const r = await fetch(u.toString(), { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 MetalPrompt' } });
    const html = await r.text();
    const meta = p => {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${p}["']`, 'i'));
      return m ? m[1] : '';
    };
    const canon = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || r.url || '';
    const id = ((canon.match(UUID) || r.url.match(UUID) || u.pathname.match(UUID) || [])[0] || '').toLowerCase();
    if (!id) return res.status(404).json({ error: 'not_found' });
    res.setHeader('Cache-Control', 's-maxage=86400');
    return res.status(200).json({
      id,
      title: meta('og:title'),
      image: meta('og:image'),
      audio: `https://cdn1.suno.ai/${id}.mp3`,
      url: `https://suno.com/song/${id}`,
    });
  } catch {
    return res.status(502).json({ error: 'fetch_failed' });
  }
}
