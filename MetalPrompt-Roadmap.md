# 🤘 MetalPrompt — Roadmap & Tableau de bord

_Dernière mise à jour : 25 juin 2026 (soir)_

---

## ✅ Log du jour — 25 juin 2026

**Riff Generator**
- Import MIDI utilisateur (groove perso, reste 100% côté client = légal). Indicateur clair de priorité + bouton « ✕ Retirer », changer le style garde le groove importé.
- Batterie passée en **vrais samples rendus** (kick/snare/hihat) au lieu du synthé « piston ».
- **8 nouvelles structures** : Toune complète, Crescendo, Festival de Breakdowns, Assaut de Blasts, Doom, Gallop, Odyssée… (6 → 14 au total).

**App principale**
- Paroles **fusionnées sous chaque section** de structure (Output Étape 2, prêt à coller). Indice pour les non-abonnés.
- **12 nouveaux tags de genre** metalcore moderne (melodic metalcore, post-hardcore, electronicore, arena, synth, ambient, pop metalcore…) répartis Forge/Pro/Elite — **aucun nom de groupe**.
- Boutons **✓ Tout / ✕ Vider** sur toutes les cartes de tags (Exclude, Organic, Vocals, Drums, Lyrics, Structure).
- 🐛 **Fix écran noir** (TDZ : `step2Shown` utilisait `lyricsTxt` avant sa déclaration).

**Contenu / Marketing**
- **Pack MIDI original** « MetalPrompt Grooves Vol 1 » (20 grooves, à vendre).
- **8 promos vidéo** TikTok/Reels/Stories (EN+FR × 15s/22s) — versions simples + versions combo (beat → toune `dark.wav` → CTA). Username masqué.
- Descriptions de Reel **FR + EN**.
- **Logo Google** « MP » (MMF Techni-Solutions).

**SEO**
- Site **PAS encore indexé** par Google (`site:metalprompt.com` = 0 résultat). Technique OK (robots.txt ✅, sitemap.xml ✅).
- Fichier de vérification Search Console déployé et **confirmé en ligne**.
- ⚠️ Vérification « refusée » = cliquée trop tôt avant le déploiement → **reclic « Vérifier » demain** (propriété = Préfixe d'URL `https://metalprompt.com`).

**📊 Métrique clé du jour**
- Reel **EN-how-to = 2 704 vues / 53 likes** 🔥 mais **~0 visite / 0 user**.
- **Diagnostic : le trou est entre la vidéo et le site** (lien pas cliquable, URL pas assez mise en avant). Le contenu accroche — manque juste le pont vers le site.

---

## 🔥 Priorités — demain soir (grand ménage)

1. **Reclic « Vérifier » dans Search Console** → soumettre `sitemap.xml` → « Demander une indexation » (accueil + guide.html).
2. **Fermer le tunnel vue → site** (le vrai blocage) :
   - URL **géante à l'écran** dans les promos + « Google : MetalPrompt » bien gros.
   - Pousser **Instagram** (lien en bio marche tout de suite + sticker lien en Story).
   - Commentaire épinglé avec lien direct sur chaque post.
3. **Refaire 2-3 promos how-to** (le format qui a fait 2 704 vues) avec hooks variés.
4. **Post r/SunoAI** (trafic + backlink pour aider l'indexation).

---

## 🧹 Grand ménage (à trier demain)

- Vérifier que **tout est poussé/déployé** (beaucoup de changements aujourd'hui).
- Tester l'app en prod : écran noir réglé? boutons Tout/Vider OK? import MIDI OK? samples batterie OK?
- Nettoyer les fichiers de test / previews dans le dossier promo.

---

## ⏳ En attente (backlog)

- **Stripe Elite Plus** : créer le produit (2 prix mensuel/annuel) → remplacer `YOUR_ELITEPLUS_MONTHLY` / `YOUR_ELITEPLUS_ANNUAL` dans TIERS + mapping `PRICE_ELITEPLUS` dans le webhook.
- **Activer les codes promo** Stripe.
- **Remettre rzlajoie en Elite** (fin du mois).
- **Idée express** : bloqué sur les API Lyra / Gemini.
- **Pack MIDI Vol 1** : décider si on l'étend (40-60 grooves) + pochette + le vendre comme add-on.

---

## 🎯 Vision

> MetalPrompt, c'est plus qu'un prompteur — c'est **LA plateforme du metalhead**.
> Aider les musiciens à progresser **ET** ouvrir la création à ceux qui ne jouent pas.

**Angle unique vs la compétition** (HookGenius, Metal Forge…) : générateur de **riff + tab + export WAV + import MIDI**. Personne d'autre a ça.
