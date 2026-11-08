// Page de consentement OAuth (nov. 2026) — https://metalprompt.com/oauth/consent?authorization_id=...
// Supabase Auth (serveur OAuth 2.1) envoie ici l'utilisateur quand Claude (ou un autre client MCP)
// demande l'accès au connecteur MetalPrompt. On affiche qui demande l'accès, puis Autoriser / Refuser.
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const BG = '#0C0D0F', ORANGE = '#FF6A2B'
const fr = (navigator.language || 'fr').toLowerCase().startsWith('fr')
const L = (a, b) => (fr ? a : b)

export default function OAuthConsent({ user, onRequestAuth }) {
  const id = new URLSearchParams(window.location.search).get('authorization_id')
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Garde l'autorisation pendant le login (Google renvoie sur l'accueil) — main.jsx nous ramène ici après
  useEffect(() => { if (id && !user) { try { sessionStorage.setItem('mp_oauth_auth_id', id) } catch {} } }, [id, user])

  useEffect(() => {
    if (!id || !user) return
    supabase.auth.oauth.getAuthorizationDetails(id).then(({ data, error }) => {
      if (error) return setError(error.message)
      if (data && !data.authorization_id && data.redirect_url) return window.location.assign(data.redirect_url)   // déjà autorisé
      setDetails(data)
    })
  }, [id, user])

  // Appli installée (PWA) : Android la rouvre sur la dernière page. Un vieux lien expiré → retour à l'accueil tout seul (8 nov. 2026)
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => window.location.replace('/'), 4000)
    return () => clearTimeout(t)
  }, [error])

  const decide = async (approve) => {
    setBusy(true)
    const fn = approve ? supabase.auth.oauth.approveAuthorization : supabase.auth.oauth.denyAuthorization
    const { data, error } = await fn.call(supabase.auth.oauth, id, { skipBrowserRedirect: true })
    if (error) { setError(error.message); setBusy(false); return }
    if (data?.redirect_url) window.location.assign(data.redirect_url)
  }

  const box = { maxWidth: 420, margin: '12vh auto', padding: '28px 24px', background: '#15171a', border: `1px solid ${ORANGE}44`, borderRadius: 12, color: '#eee', fontFamily: 'inherit', textAlign: 'center' }
  const btn = (main) => ({ flex: 1, padding: '11px', borderRadius: 8, border: main ? 'none' : '1px solid #444', background: main ? ORANGE : 'transparent', color: main ? '#000' : '#ccc', fontWeight: 800, cursor: busy ? 'wait' : 'pointer', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' })

  let content
  if (!id) content = <p>{L('Lien d’autorisation invalide.', 'Invalid authorization link.')}</p>
  else if (!user) content = (<>
    <p>{L('Connecte-toi à ton compte MetalPrompt pour continuer.', 'Sign in to your MetalPrompt account to continue.')}</p>
    <button style={{ ...btn(true), flex: 'none', width: '100%' }} onClick={onRequestAuth}>{L('Se connecter', 'Sign in')}</button>
  </>)
  else if (error) content = (<>
    <p style={{ color: '#ff8080' }}>{L('Ce lien de connexion est expiré ou déjà utilisé. Relance la connexion depuis Claude si tu en as besoin.', 'This sign-in link has expired or was already used. Restart the connection from Claude if needed.')}</p>
    <button style={{ ...btn(true), flex: 'none', width: '100%', marginTop: 12 }} onClick={() => window.location.replace('/')}>{L('Retour à MetalPrompt', 'Back to MetalPrompt')}</button>
  </>)
  else if (!details) content = <p>⚙️</p>
  else content = (<>
    <p style={{ fontSize: '1.05rem' }}><b>{details.client?.name || details.client?.client_name || L('Une application', 'An app')}</b> {L('veut se connecter à ton compte MetalPrompt.', 'wants to connect to your MetalPrompt account.')}</p>
    <p style={{ fontSize: '0.8rem', color: '#999', lineHeight: 1.6 }}>
      {L('Elle pourra forger des prompts, des riffs et des paroles en ton nom (plan Forge Pro). Elle ne voit pas ton mot de passe.', 'It will be able to forge prompts, riffs and lyrics on your behalf (Forge Pro plan). It never sees your password.')}
      <br />{L('Compte : ', 'Account: ')}{details.user?.email || user.email}
    </p>
    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
      <button disabled={busy} style={btn(false)} onClick={() => decide(false)}>{L('Refuser', 'Deny')}</button>
      <button disabled={busy} style={btn(true)} onClick={() => decide(true)}>{L('Autoriser', 'Allow')}</button>
    </div>
  </>)

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '0 16px' }}>
      <div style={box}>
        <div style={{ color: ORANGE, fontWeight: 900, letterSpacing: 2, marginBottom: 14 }}>METALPROMPT</div>
        {content}
      </div>
    </div>
  )
}
