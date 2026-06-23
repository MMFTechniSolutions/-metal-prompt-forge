import { useState } from "react";
import { supabase } from "./supabase";

const RED = "#ff2e2e";

export default function Auth({ onLogin }) {
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

        <div style={{ textAlign:"center", fontSize:"0.7rem", color:"#555" }}>
          {isSignup ? "Déjà un compte ? " : "Pas encore de compte ? "}
          <span onClick={() => setIsSignup(!isSignup)} style={{ color:RED, cursor:"pointer", fontWeight:700 }}>
            {isSignup ? "Se connecter" : "S'inscrire"}
          </span>
        </div>
      </div>
    </div>
  );
}