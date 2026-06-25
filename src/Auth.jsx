import { useState } from "react";
import { supabase } from "./supabase";

const RED = "#ff2e2e";

export default function Auth({ onLogin, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handle = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Vérifie ton email pour confirmer ton compte !");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else onLogin(data.user);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  return (
    <div style={{ background:"#0a0a0a", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"#141414", border:`1px solid ${RED}33`, borderRadius:"12px", padding:"28px 24px", maxWidth:"380px", width:"100%" }}>
        
        <div style={{ textAlign:"center", marginBottom:"24px" }}>
          <div style={{ fontSize:"2rem", marginBottom:"8px" }}>⚰️</div>
          <div style={{ fontFamily:"sans-serif", fontSize:"1.4rem", fontWeight:900, color:RED, letterSpacing:"4px", textTransform:"uppercase" }}>
            Metal Prompt Forge
          </div>
          <div style={{ fontSize:"0.65rem", color:"#555", letterSpacing:"2px", marginTop:"4px" }}>
            {isSignup ? "CRÉER UN COMPTE" : "CONNEXION"}
          </div>
        </div>

        <input
          type="email"
          placeholder="ton@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width:"100%", background:"#111", border:"1px solid #222", borderRadius:"6px", padding:"12px", color:"#e0e0e0", fontSize:"0.85rem", marginBottom:"10px" }}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width:"100%", background:"#111", border:"1px solid #222", borderRadius:"6px", padding:"12px", color:"#e0e0e0", fontSize:"0.85rem", marginBottom:"16px" }}
        />

        {error && <div style={{ color:"#ff5555", fontSize:"0.75rem", marginBottom:"10px", textAlign:"center" }}>{error}</div>}
        {message && <div style={{ color:"#4caf50", fontSize:"0.75rem", marginBottom:"10px", textAlign:"center" }}>{message}</div>}

        <button onClick={handle} disabled={loading}
          style={{ width:"100%", padding:"13px", background:RED, border:"none", borderRadius:"8px", color:"#000", fontSize:"0.85rem", fontWeight:900, letterSpacing:"2px", textTransform:"uppercase", cursor:"pointer", marginBottom:"12px" }}>
          {loading ? "..." : isSignup ? "CRÉER MON COMPTE" : "SE CONNECTER"}
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:"10px", margin:"4px 0 12px" }}>
          <div style={{ flex:1, height:"1px", background:"#222" }} />
          <span style={{ fontSize:"0.65rem", color:"#555" }}>ou</span>
          <div style={{ flex:1, height:"1px", background:"#222" }} />
        </div>

        <button onClick={handleGoogle} disabled={loading}
          style={{ width:"100%", padding:"12px", background:"#fff", border:"none", borderRadius:"8px", color:"#1f1f1f", fontSize:"0.82rem", fontWeight:700, cursor:"pointer", marginBottom:"14px", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continuer avec Google
        </button>

        <div style={{ textAlign:"center", fontSize:"0.7rem", color:"#555" }}>
          {isSignup ? "Déjà un compte ? " : "Pas encore de compte ? "}
          <span onClick={() => setIsSignup(!isSignup)} style={{ color:RED, cursor:"pointer", fontWeight:700 }}>
            {isSignup ? "Se connecter" : "S'inscrire"}
          </span>
        </div>

        {onClose && (
          <div style={{ textAlign:"center", marginTop:"16px" }}>
            <span onClick={onClose} style={{ color:"#666", fontSize:"0.72rem", cursor:"pointer" }}>← Continuer sans compte</span>
          </div>
        )}
      </div>
    </div>
  );
}