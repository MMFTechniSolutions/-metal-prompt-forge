import { useState, useRef, useEffect } from 'react'

const RED = '#ff2e2e'

export default function HelpChat() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([
    {
      role: 'assistant',
      content:
        "Salut ! 🤘 Je suis l'assistant de MetalPrompt. Je peux t'aider à forger ton premier prompt, comprendre les onglets, ou coller dans Suno. Qu'est-ce que tu veux faire ?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open, loading])

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    // garde-fou anti-abus : max 40 messages par session
    const used = msgs.filter((m) => m.role === 'user').length
    if (used >= 40) {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', content: 'Limite de la session atteinte 🤘 Recharge la page pour continuer.' },
      ])
      return
    }
    const next = [...msgs, { role: 'user', content: q }]
    setMsgs(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setMsgs((m) => [...m, { role: 'assistant', content: data.text || '...' }])
    } catch (e) {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', content: 'Oups, petite erreur. Réessaie, ou écris à mmftechnisolutions@gmail.com 🤘' },
      ])
    }
    setLoading(false)
  }

  const bubble = (role) => ({
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    background: role === 'user' ? RED : '#1c1c22',
    color: role === 'user' ? '#fff' : '#e0e0e0',
    padding: '9px 12px',
    borderRadius: '12px',
    maxWidth: '82%',
    fontSize: '0.82rem',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  })

  return (
    <div style={{ position: 'fixed', left: 18, bottom: 18, zIndex: 1200, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {open && (
        <div
          style={{
            width: 340,
            maxWidth: 'calc(100vw - 36px)',
            height: 470,
            maxHeight: 'calc(100vh - 120px)',
            background: '#0c0c0c',
            border: `1px solid ${RED}55`,
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 12px 40px #000a',
            marginBottom: 12,
          }}
        >
          <div style={{ background: '#111114', borderBottom: '1px solid #222', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px' }}>⚒️ Assistant MetalPrompt</div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {msgs.map((m, i) => (
              <div key={i} style={bubble(m.role)}>{m.content}</div>
            ))}
            {loading && <div style={bubble('assistant')}>…</div>}
            <div ref={endRef} />
          </div>
          <div style={{ borderTop: '1px solid #222', padding: '10px', display: 'flex', gap: '8px' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder="Pose ta question…"
              style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px', color: '#e0e0e0', fontSize: '0.82rem', outline: 'none' }}
            />
            <button onClick={send} disabled={loading} style={{ background: RED, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 800, padding: '0 14px', cursor: 'pointer' }}>➤</button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: RED,
          border: 'none',
          borderRadius: 999,
          color: '#fff',
          padding: '12px 18px',
          fontWeight: 800,
          fontSize: '0.85rem',
          cursor: 'pointer',
          boxShadow: '0 6px 20px #ff2e2e55',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {open ? 'Fermer' : '🤘 Besoin d’aide ?'}
      </button>
    </div>
  )
}
