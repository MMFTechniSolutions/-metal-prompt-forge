# Forge Pro + connecteur MCP — ce qui reste à faire (François)

Branche `forge-pro-mcp`. Rien n'est en prod, rien dans Stripe live, migration pas appliquée.

## Ce qui est prêt (code)
- `api/_lib/mcp.js` : serveur MCP (3 outils : `forger_prompt`, `creer_riff`, `ecrire_paroles`), branché dans `/api/profile` → toujours 12 fonctions.
- `vercel.json` : `/mcp` et `/.well-known/oauth-protected-resource` → serveur MCP; `/oauth/consent` → page de consentement.
- `src/OAuthConsent.jsx` : page « Autoriser / Refuser » quand Claude demande l'accès.
- `supabase/migrations/20261106_forge_pro_mcp.sql` : table `mcp_usage` + fonction `mcp_bump` (limites par jour).
- `api/webhook.js` : tier `forge_pro` si le Payment Link a la metadata `tier=forge_pro` (ou env `FORGE_PRO_LINK`); un client qui garde un autre abonnement actif n'est plus remis en gratuit.
- `src/App.jsx` : `forge_pro` = même accès que Plus sur le site; carte « Forge Pro » dans les plans, **cachée tant que `STRIPE_FORGE_PRO` est vide**.
- Test local : `node scripts/test-mcp.mjs`

## Ordre pour mettre en ligne
1. **Supabase → Authentication → OAuth Server** : activer; Authorization Path = `/oauth/consent`; activer *Dynamic client registration*. Vérifier Site URL = `https://metalprompt.com`.
2. Appliquer la migration `20261106_forge_pro_mcp.sql` (je peux le faire sur ton go).
3. Merge + déployer. Tester : ton compte (propriétaire) → Claude → Paramètres → Connecteurs → Ajouter un connecteur personnalisé → `https://metalprompt.com/mcp`.
4. **Stripe** (en dernier) : produit « Forge Pro », 5,99 $ US/mois, Payment Link avec metadata `tier=forge_pro`. Coller le lien dans `STRIPE_FORGE_PRO` (src/App.jsx) → la carte apparaît.

## Limites par jour (abonné Forge Pro)
forger_prompt 100 · creer_riff 20 · ecrire_paroles 10 (variables `MCP_LIMIT_*` dans Vercel). Propriétaire = illimité.

## À savoir
- Mélodie pas encore dans le MCP : le générateur tourne dans le navigateur, faudrait le porter côté serveur.
- Passage Plus → Pro : le client prend un 2e abonnement; annuler le Plus à la main (ou passer par le portail Stripe) sinon il paie les deux.
- Si un client annule Forge Pro mais garde Forge Plus actif, il reste `forge_pro` (à corriger avec les price IDs une fois Stripe créé).
