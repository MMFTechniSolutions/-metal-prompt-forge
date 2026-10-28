// Outils communs aux scripts « crédit promo » (profils + cache de groupes).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(DIR, '../..');
export const MODEL = process.env.BATCH_MODEL || 'claude-opus-5-5';
const APP = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');

function seg(start, end) { const i = APP.indexOf(start); const j = APP.indexOf(end, i + start.length); return APP.slice(i, j); }
const vals = s => [...new Set([...s.matchAll(/\{(?:g|v):"([^"]+)"/g)].map(m => m[1]))];
const strs = s => [...new Set([...s.slice(s.indexOf('[')).matchAll(/"([^"]+)"/g)].map(m => m[1]))];

export const APP_GENRES = vals(seg('const GENRE_FAMILIES', '];\n')).map(g => g.toLowerCase());
export const VOCAB = {
  drums: vals(seg('const DRUM_ERAS', 'const DRUM_NEW')),
  vocals: vals(seg('const VOCAL_ERAS', 'const VOCAL_NEW')),
  guitar: vals(seg('const GUITAR_ERAS', 'const GUITAR_NEW')),
  tuning: strs(seg('const TUNING', ';')),
  mood: strs(seg('const MOOD', ';')),
};

// Clé : variable du terminal, sinon .env.local (rempli par « vercel env pull .env.local »)
try { for (const l of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
let KEY = (process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '').trim();
// Pas de clé ? Le script la demande et la garde dans .env.local (exclu de git) pour les prochains scripts.
export async function needKey() {
  if (!KEY) {
    const rl = (await import('node:readline')).createInterface({ input: process.stdin, output: process.stdout });
    KEY = (await new Promise(r => rl.question('Colle ta clé Anthropic puis Entrée : ', r))).trim().replace(/^["']|["']$/g, '');
    rl.close();
    if (KEY) fs.appendFileSync(path.join(ROOT, '.env.local'), `\nANTHROPIC_API_KEY=${KEY}\n`);
  }
  if (!/^sk-ant-/.test(KEY)) { console.log('✖ Ça ressemble pas à une clé Anthropic (doit commencer par sk-ant-).'); process.exit(1); }
}

export const usage = { in: 0, out: 0, calls: 0 };
export async function claude(system, user, maxTokens = 8000) {
  for (let essai = 1; essai <= 4; essai++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) { console.log('✖ Anthropic', r.status, d?.error?.message); process.exit(1); }
    if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 4000 * essai)); continue; }
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${d?.error?.message}`);
    usage.calls++; usage.in += d.usage?.input_tokens || 0; usage.out += d.usage?.output_tokens || 0;
    const t = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('réponse sans JSON');
    return JSON.parse(m[0]);
  }
  throw new Error('Anthropic : trop de tentatives');
}

// Exécute fn sur chaque lot avec N appels en parallèle
export async function pool(items, n, fn) {
  let i = 0; const out = [];
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
export const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
export const save = (f, o) => fs.writeFileSync(path.join(DIR, f), JSON.stringify(o, null, 1));
export const load = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch { return d; } };
export const bilan = () => console.log(`\nAppels : ${usage.calls} | jetons entrée ${usage.in.toLocaleString()} | sortie ${usage.out.toLocaleString()} (coût exact : console Anthropic → Utilisation)`);
