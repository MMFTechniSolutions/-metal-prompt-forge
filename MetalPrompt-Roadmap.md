# 🤘 MetalPrompt — Roadmap & Tableau de bord

_Dernière mise à jour : 26 juin 2026 (soir)_

> **Slogan : « La qualité, pas la quantité. »** — créer mieux avec moins (et éco-responsable).
> **Mission :** aider les musiciens à progresser ET ouvrir la création à ceux qui ne jouent pas.
> **Scope :** MUSIQUE seulement (images de band / merch = hors scope).

---

## 🎯 Modèle d'affaires (CONFIRMÉ)

| Tier | Prix | Annuel | Débloque |
|------|------|--------|----------|
| **Free** | 0 | — | Goût de la bibliothèque + export prompt |
| **Forge** | 4,99 $/mo | **29 $/an** | **Bibliothèque COMPLÈTE + SLIDERS d'intensité** + structure + BPM + mood |
| **Pro** | 8,99 $/mo | **59 $/an** | + **🎸 Riff Generator** + paroles IA + Organic + historique |
| **Elite** | 14,99 $/mo | **99 $/an** | + **🎚️ Mastering anti-IA** + exclude tags |
| **Elite+** | **59,99 $/mo** | — | + Idée express + Académie/masterclass + VIP |

- **Devise : USD recommandé.** Annuel ≈ moitié prix (max attraction + cash + rétention).

---

## 💳 Système de crédits (génération musicale) — À BÂTIR

- **Moteur : ElevenLabs « Eleven Music v2 » via API** (légal, données licenciées).
- ✅ **VALIDÉ aujourd'hui** : tes prompts MetalPrompt (styles globaux + sections nommées + include/exclude) **sortent du bon stock dans Eleven Music v2**.
- **Coût : facturé en crédits/minute.** ⚠️ Par défaut Eleven génère **4 versions (×4 le coût)**.
- **2 décisions avant de fixer les prix :**
  1. **Versions par génération** (1 = moins cher, 4 = plus de choix mais ×4)
  2. **Durée** (facturé /min)
- **Marge cible : 50 %** → vendre le crédit à ~2× ton coût réel.
- ❓ **BLOQUÉ SUR :** le ratio **crédits ElevenLabs → $** de ton plan (pour calculer le coût/chanson exact et ton prix de revente).
- **2 voies :** générer in-app (crédits, Eleven) OU exporter le prompt vers Suno (gratuit).
- ⚠️ Allumer quand ~30-50 abonnés payants (plan API a un minimum mensuel).

---

## ⚖️ Légal / Droits (ajusté dans le site)

- ✅ API resale autorisée · usage commercial sur plans payants · **aucun nom d'artiste** (on respecte déjà)
- 🚫 Piste 100 % IA = pas de copyright, pas de distribution Spotify telle quelle
- 🔥 **Le moat :** retravaillée en studio (mastering/riff/édition) → œuvre dérivée **distribuable** que l'user possède. **MetalPrompt = le pont légal.**
- ⚠️ **À valider :** confirmer avec ElevenLabs que le plan API permet de transmettre les droits commerciaux aux users.
- **Protection IP (à faire) :** doc 1 page daté + marque de commerce + avocat.

---

## ✅ Fait (à jour)

- **Mastering anti-IA** 🆕 : chaîne cut de boue 200-400Hz + tamer dureté 5-7kHz + saturation analogique + preset « 🤖 Nettoyage IA » + 5 presets
- **Ménage du code** 🆕 : retrait de 10 constantes mortes + 1 style inutilisé
- **Refonte UI complète** : Genres/Vocals/Drums/Guitare par époque (60-70→2020s) + punk, menus déroulants + recherche, tout repliable, bibliothèque enrichie (~80+ tags)
- **Forfaits** : modèle Forge/Pro/Elite + annuels + toggle mensuel/annuel + fix « Voir les plans »
- **Légal** : ElevenLabs + crédits + droits IA + slogan qualité/éco
- **Riff Generator** : import MIDI, vrais samples, 8 structures
- **Marketing** : 8 promos vidéo, descriptions Reel FR/EN, logo Google « MP »
- **SEO** : indexé ✅ (premières impressions Google : 3 imp / 1 clic / position 1)
- **Trafic** : début de visites réelles aujourd'hui 🔥

---

## ⏳ ON EN EST ICI — prochaines étapes

1. **Mastering : sliders visibles** (boue / dureté / chaleur) **+ recette côté serveur** (sauce secrète cachée comme forge.js/riff.js)
2. **Prompts béton** 🔥 — priorité #1, le cœur du produit
3. **Système de crédits** — dès que t'as le ratio crédits→$ ElevenLabs (compteur Supabase + recharges Stripe)
4. **Finir le re-tiering** Drums/Guitare en gratuit/Forge · gater sliders à Forge · Mastering tab → Elite
5. **Stripe** : créer les 3 produits annuels (USD) → me redonner les liens + mapping webhook
6. **Manifeste** (mention qualité/éco) · **Leçons** (cours → live) · **Galerie** (soumissions Suno, texte seulement)
7. **Distribution / conversion** — le vrai nerf (tunnel vue → essai → abonnement)

---

## 📊 Mesure (la vérité — le « Visitors » Vercel ment vers le bas)

Vrais indicateurs : **Edge Requests** (serveur, imbloquable) · **Supabase users** (inscriptions) · **Stripe** (abonnements) · **Google Search Console** (SEO).
