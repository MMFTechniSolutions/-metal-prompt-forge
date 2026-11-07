// Page /banque (nov. 2026) — écoute et approbation des grooves de la banque serveur (propriétaire seulement).
// Joue chaque groove avec le vrai kit du site (public/drums.js, gtr.js, samples) : guitare, batterie, mélodie.
// 👍 = approuvé (pigé par la toune complète du MCP) · 👎 = rejeté (« pas de bouette »).
import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'

const BG = '#0C0D0F', ORANGE = '#FF6A2B'
const SEC = { intro: 'Intro', couplet: 'Couplet', refrain: 'Refrain', breakdown: 'Breakdown' }
const hz = p => 440 * Math.pow(2, (p - 69) / 12)

function loadScript(src) {
  return new Promise(r => { if (document.querySelector(`script[src="${src}"]`)) return r(); const s = document.createElement('script'); s.src = src; s.onload = r; s.onerror = r; document.head.appendChild(s) })
}

async function api(op, opts = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data && data.session && data.session.access_token
  const r = await fetch('/api/profile?op=' + op + (opts.qs || ''), { method: opts.body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Erreur ' + r.status)
  return j
}

export default function BanqueEcoute({ user, onRequestAuth }) {
  const [rows, setRows] = useState([]), [counts, setCounts] = useState({})
  const [status, setStatus] = useState('pending'), [style, setStyle] = useState('')
  const [err, setErr] = useState(''), [playing, setPlaying] = useState(null), [ready, setReady] = useState(false)
  const audio = useRef(null)

  const load = () => api('bank-list', { qs: '&status=' + status + (style ? '&style=' + style : '') }).then(j => { setRows(j.rows); setCounts(j.counts) }).catch(e => setErr(e.message))
  useEffect(() => { if (user) load() }, [user, status, style])
  useEffect(() => { Promise.all(['/samples.js', '/gtr.js', '/drums.js'].map(loadScript)).then(() => setReady(true)) }, [])

  const stop = () => { if (audio.current) { try { audio.current.close() } catch {} audio.current = null } setPlaying(null) }

  const play = async (e) => {
    stop()
    const ctx = new (window.AudioContext || window.webkitAudioContext)(); audio.current = ctx; setPlaying(e.id)
    const out = ctx.createGain(); out.gain.value = 0.8; out.connect(ctx.destination)
    try { if (window.MPDrums && !Object.keys(MPDrums.REC).length) await MPDrums.loadRec('/samples/drums/') } catch {}
    try { if (window.MPGtr && !MPGtr.DI.notes.length) await MPGtr.loadDI('/samples/guitar/', 84) } catch {}
    if (audio.current !== ctx) return
    const d = e.data, sd = 60 / e.bpm / 4, L = d.drums.kick.length, loops = 2, t0 = ctx.currentTime + 0.15
    const a = { kick: d.drums.kick, snare: d.drums.snare, hihat: d.drums.hihat, bars: e.mesures, L }
    const rig = window.MPGtr ? MPGtr.rig(ctx, out, 85) : null
    const dk = window.MPDrums ? MPDrums.kit(ctx) : null, din = dk ? MPDrums.bus(ctx, out) : null
    for (let lp = 0; lp < loops; lp++) {
      const o = t0 + lp * L * sd
      if (dk) for (let s = 0; s < L; s++) MPDrums.playStep(ctx, dk, din, a, s, o + s * sd)
      if (rig) for (const n of d.guitar) MPGtr.play(ctx, rig, hz(n.p), o + n.t * sd, n.d * sd * 0.95, n.d <= 2)
      let prev = null
      for (const n of d.melody) { if (window.MPGtr) MPGtr.lead(ctx, out, n.p, o + n.t * sd, n.d * sd, 'metal', prev); prev = n.p }
    }
    setTimeout(() => { if (audio.current === ctx) stop() }, (loops * L * sd + 1.5) * 1000)
  }

  const decide = async (e, st) => {
    try { await api('bank-set', { body: { id: e.id, status: st } }); stop(); setRows(r => r.filter(x => x.id !== e.id)); load() } catch (x) { setErr(x.message) }
  }

  const btn = (on, c = ORANGE) => ({ padding: '7px 12px', borderRadius: 8, border: `1px solid ${on ? c : '#333'}`, background: on ? c + '22' : 'transparent', color: on ? c : '#bbb', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' })
  const total = Object.values(counts).reduce((a, c) => ({ pending: a.pending + c.pending, approved: a.approved + c.approved, rejected: a.rejected + c.rejected }), { pending: 0, approved: 0, rejected: 0 })

  if (!user) return (<div style={{ background: BG, minHeight: '100vh', color: '#eee', padding: 40, textAlign: 'center' }}>
    <p>Connecte-toi pour ouvrir la banque.</p><button style={btn(true)} onClick={onRequestAuth}>Se connecter</button></div>)

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#eee', padding: '20px 16px 60px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ color: ORANGE, fontWeight: 900, letterSpacing: 2 }}>METALPROMPT · BANQUE DE GROOVES</div>
      <p style={{ color: '#999', fontSize: '0.85rem', margin: '6px 0 14px' }}>
        {total.pending} en attente · {total.approved} approuvés · {total.rejected} rejetés — 👍 = la toune complète peut le piger.
      </p>
      {err && <p style={{ color: '#ff8080' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {[['pending', 'En attente'], ['approved', 'Approuvés'], ['rejected', 'Rejetés']].map(([k, l]) => <button key={k} style={btn(status === k)} onClick={() => setStatus(k)}>{l}</button>)}
        <select value={style} onChange={e => setStyle(e.target.value)} style={{ background: '#15171a', color: '#eee', border: '1px solid #333', borderRadius: 8, padding: '6px 8px' }}>
          <option value="">Tous les styles</option>
          {Object.keys(counts).sort().map(s => <option key={s} value={s}>{s} ({counts[s].pending}/{counts[s].approved})</option>)}
        </select>
      </div>
      {!ready && <p>⚙️ chargement des sons…</p>}
      {rows.map(e => (
        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 8, background: '#15171a', border: `1px solid ${playing === e.id ? ORANGE : '#222'}`, borderRadius: 10 }}>
          <button style={{ ...btn(playing === e.id), minWidth: 44, fontSize: '1rem' }} onClick={() => playing === e.id ? stop() : play(e)}>{playing === e.id ? '■' : '▶'}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800 }}>{e.style} · {SEC[e.section] || e.section}</div>
            <div style={{ color: '#888', fontSize: '0.75rem' }}>{e.bpm} BPM · {e.accordage} · {e.mesures.map(n => n === 16 ? '4/4' : n + '/16').join(' ')} · {e.famille}</div>
          </div>
          {status !== 'approved' && <button style={btn(false, '#4caf50')} onClick={() => decide(e, 'approved')}>👍</button>}
          {status !== 'rejected' && <button style={btn(false, '#e53935')} onClick={() => decide(e, 'rejected')}>👎</button>}
          {status !== 'pending' && <button style={btn(false, '#999')} onClick={() => decide(e, 'pending')}>↺</button>}
        </div>
      ))}
      {!rows.length && <p style={{ color: '#777' }}>Rien ici.</p>}
    </div>
  )
}
