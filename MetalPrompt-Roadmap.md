# 🤘 MetalPrompt — Roadmap & Tableau de bord

_Dernière mise à jour : 26 juin 2026_

> **Slogan : « La qualité, pas la quantité. »** — créer mieux avec moins (et éco-responsable).
> **Mission :** aider les musiciens à progresser ET ouvrir la création à ceux qui ne jouent pas.
> **Scope :** MUSIQUE seulement (images de band / merch = hors scope, ailleurs).

---

## 🎯 Modèle d'affaires (CONFIRMÉ)

**Échelle des forfaits — logique « fais goûter gratis, débloque par profondeur » :**

| Tier | Prix | Annuel | Débloque |
|------|------|--------|----------|
| **Free** | 0 | — | Goût de la bibliothèque (genres/voix/drums de base) + export prompt |
| **Forge** | 4,99 $/mo | **29 $/an** | **Bibliothèque COMPLÈTE + les SLIDERS d'intensité** + structure + BPM + mood |
| **Pro** | 8,99 $/mo | **59 $/an** | + **🎸 Riff Generator** + paroles IA + Organic + historique |
| **Elite** | 14,99 $/mo | **99 $/an** | + **🎚️ Module Mastering** + exclude tags |
| **Elite+** | **59,99 $/mo** | — | + Idée express + Académie/masterclass (à venir) + VIP |

- **Devise : USD recommandé** (public surtout US ; tes coûts sont en USD aussi). À confirmer au moment de créer les produits Stripe.
- **Annuel ≈ moitié prix** = max attraction. Vraie valeur = cash d'avance + rétention + moins de frais Stripe.

---

## 💳 Système de crédits (génération de musique)

- **Moteur : ElevenLabs « Eleven Music » via API** (légal — entraîné sur données licenciées, cleared commercial).
- **Coût : ~0,15 $/min** (~0,45 $/chanson de 3 min) = seul coût variable.
- **1 crédit = 1 chanson** (~3 min ; plus long = 2 crédits).
- **Marge cible : 50 %+** — vendre les crédits à ~2× le coût. Crédits inclus/tier + recharges à la pièce.
- **Crédits expirent par période** (pas de roulement) → protège la marge.
- **2 voies de génération :** (1) générer DANS MetalPrompt (crédits, ElevenLabs) · (2) exporter le prompt vers Suno (gratuit, l'user génère sur son compte).
- **Marge estimée à 1000 abonnés (mix) : ~3 700-5 000 $/mois.**

⚠️ **À allumer quand ~30-50 abonnés payants** (le plan API ElevenLabs a un minimum mensuel ~99 $). Avant ça → export Suno gratuit seulement.

---

## ⚖️ Légal / Droits (IMPORTANT — déjà ajusté dans le site)

**ElevenLabs — règles clés (reflétées dans les Conditions du site) :**
- ✅ API resale autorisée (bâtir une app et facturer les users = légit).
- ✅ Usage commercial sur plans payants, conservé après résiliation.
- 🚫 **Aucun nom d'artiste/groupe/chanson dans les prompts** → on respecte DÉJÀ (zéro nom de band dans toute l'app).
- 🚫 Piste 100 % IA = pas de copyright ; pas de revente « telle quelle » ; **pas de distribution directe sur Spotify/Apple**.
- 🔥 **Œuvre dérivée = le moat :** retravaillée en studio (mastering, instruments, édition) → devient une œuvre originale distribuable que l'user possède. **MetalPrompt = le pont légal** (génère → riff/mastering → original distribuable).

⚠️ **À valider :** confirmer avec ElevenLabs que le plan API permet de **transmettre les droits commerciaux aux users finaux**.

**Protection IP (à faire) :** document 1 page daté de l'écosystème (preuve d'antériorité) + marque de commerce « MetalPrompt » (OPIC ~300-500 $) + avocat IP. NDA avant de montrer à des gens.

---

## ✅ Fait aujourd'hui (26 juin) — DÉPLOYÉ

**Refonte UI (gros ménage)**
- Genres/Vocals/Drums/Guitare → **par époque** (Racines 60-70 → 2020s) + branche punk, **menus déroulants + recherche**
- Bibliothèque **enrichie** (~80+ tags), tout **repliable** (Instruments, Organic, Exclude, Paroles)
- Structure = chips compactes + feel par section en déroulants

**Forfaits**
- Modèle Forge=biblio/Pro=riff/Elite=mastering · annuels + toggle mensuel/annuel · fix « Voir les plans »

**Légal**
- Conditions ajustées : ElevenLabs, crédits, droits IA, scope musique, slogan qualité/éco

**Riff Generator** (sessions précédentes) : import MIDI, vrais samples, 8 structures
**Marketing** : 8 promos vidéo, descriptions Reel FR/EN, logo Google « MP »
**SEO** : indexé ✅ (premières impressions Google : 3 impressions / 1 clic / position 1)

---

## ⏳ Prochaines étapes (on repart ici)

1. **🧹 Ménage du code** (App.jsx) — retirer les consts inutilisées (GENRES_FREE/FORGE/PRO/ELITE, VOCALS_FREE/etc. remplacés par les structures par époque), nettoyer.
2. **Finir le re-tiering** Drums + Guitare en gratuit/Forge (genres + voix faits)
3. **Gater les sliders à Forge** · **Mastering → Elite** (tab)
4. **Stripe** : créer les 3 produits annuels (USD) → remplacer `YOUR_FORGE/PRO/ELITE_ANNUAL` + mapping webhook
5. **Prompts béton** 🔥 — la priorité #1 (c'est le cœur du produit)
6. **Système de crédits** — compteur Supabase + recharges Stripe + génération ElevenLabs
7. **Manifeste de marque** — y mettre la mention qualité/éco
8. **Onglet Leçons** — cours guit/basse/drum + masterclass → prestation live
9. **Galerie communautaire** — soumissions Suno (texte seulement, zéro audio hébergé)
10. **Distribution / conversion** — le vrai nerf : tunnel vue → essai → abonnement

---

## 📊 Mesure (la vérité)

Le compteur « Visitors » de Vercel **ment vers le bas** (bloqueurs de pub + script retiré). Vrais indicateurs :
- **Edge Requests** (côté serveur, imbloquable)
- **Supabase → users** (vraies inscriptions)
- **Stripe** (abonnements)
- **Google Search Console** (impressions/clics SEO)
