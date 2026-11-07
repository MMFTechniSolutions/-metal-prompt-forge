import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Auth from './Auth.jsx'
import { supabase } from './supabase.js'
import HelpChat from './HelpChat.jsx'
import OAuthConsent from './OAuthConsent.jsx'   // connecteur MCP (Forge Pro)
import BanqueEcoute from './BanqueEcoute.jsx'   // banque de grooves (propriétaire)
import { Analytics } from '@vercel/analytics/react'   // stats de visites Vercel (sans témoins)

function Root() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ background:"#0C0D0F", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"#FF6A2B", fontSize:"1.5rem" }}>⚙️</div>
    </div>
  )

  if (showAuth && !user) return <Auth onLogin={(u) => { setUser(u); setShowAuth(false) }} onClose={() => setShowAuth(false)} />
  // Connecteur MCP (bug 2026-11-07) : le login Google revient sur l'accueil et perdait l'autorisation → on y retourne
  if (user && window.location.pathname !== '/oauth/consent') {
    let pend = null; try { pend = sessionStorage.getItem('mp_oauth_auth_id') } catch {}
    if (pend) { try { sessionStorage.removeItem('mp_oauth_auth_id') } catch {}; window.location.replace('/oauth/consent?authorization_id=' + encodeURIComponent(pend)); return null }
  }
  if (window.location.pathname === '/banque') return <BanqueEcoute user={user} onRequestAuth={() => setShowAuth(true)} />
  if (window.location.pathname === '/oauth/consent') return <OAuthConsent user={user} onRequestAuth={() => setShowAuth(true)} />
  return <App user={user} onLogout={() => supabase.auth.signOut()} onRequestAuth={() => setShowAuth(true)} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
    <HelpChat />
    <Analytics />
  </StrictMode>
)