# 🤘 MetalPrompt — Roadmap & Tableau de bord

_Dernière mise à jour : 30 juin 2026_
_Statut : **v1.1 en cours — bilingue EN/FR + variété rythmique livrées ; Lyria (génération in-app) en intégration.**_

> **Mission :** aider les musiciens à progresser ET ouvrir la création à ceux qui ne jouent pas.
> **Manifeste :** un outil POUR les musiciens, jamais contre. Brutal. Organique. Humain.
> **Scope :** musique seulement.

---

## 🎯 Modèle d'affaires (v1.0 — CONFIRMÉ)

**Un seul abonnement. Complément à Suno, pas cher.**

| Plan | Prix | Débloque |
|------|------|----------|
| **Essai gratuit** | 0 | Goût de l'outil |
| **MetalPrompt** | **4,99 $US/mois** ou **49,99 $US/an** (2 mois gratuits) | **TOUT le site** |

- Gating **binaire** : gratuit (essai) vs payant (tout débloqué). Webhook Stripe → tier `pro` pour tout paiement.
- Devise **USD**. Liens Stripe mensuel + annuel en place.

---

## ✅ v1.0 — LIVRÉ

**Forge (cœur)**
- Recette serveur depuis l'encyclopédie perso : `GENRE_DB` (modes, accordages, signatures rythmiques), `FUSIONS` (hybrides reconnus), scènes géographiques, exclude auto du non-metal.
- Moteur **10 émotions** (sliders) → colore son + paroles.
- **Mode sliders par défaut**, contrôles manuels en **mode avancé**.
- Structure auto (sections + tempos) injectée dans les **paroles** (cohérence Style ↔ Paroles).
- **3 prompts** : Principal + Cover (sous-genre) + Extend (rallonge) + modèle Suno recommandé.
- Prompt « full » **retiré de l'affichage ET du réseau** (anti-vol).

**Riff Generator**
- **Mode Automatique** (prompt → beat) + **mode Avancé** (contrôles).
- Le **prompt forgé se pré-remplit** automatiquement dans le Riff.
- 28 styles, 15 **scènes régionales** codifiées (spec MIDI : downpicking, blast triggés, polymétrie, harmonies jumelles, sweep néoclassique, tremolo humanisé…).
- Mélodies **32 notes** (A+B) + rythme guitare A/B + batterie variée → moins redondant.
- **Séquence en 4 clips** (intro/couplet/refrain/breakdown) : jouer chaque clip, jouer 1→2→3→4, export de la séquence complète.
- Export WAV (référence audio Suno) — beat MIDI 100% original (passe le filtre anti-copie).

**Mastering**
- Multitrack stems (mute/solo/pan + EQ 3 bandes), **sidechain kick→basse**, débruiteur (Dynamic EQ).
- Recette de master **côté serveur** (`/api/master`), presets par genre.
- Avertissement « étape finale — ne pas re-uploader dans Suno ».

**Apprentissage / communauté**
- **Tuto** : walkthrough complet (3 prompts, réglages Suno, Riff, Master, Custom Model).
- **Galerie / vitrine communautaire** : embeds Spotify/YouTube/SoundCloud auto-détectés, filtres par genre, badge IA, formulaire de soumission (Supabase, modération via statut `pending`). Soumettre exige un compte.
- **Masterclass** (marquée **À VENIR**) : parcours en modules (timeline), sessions **pré-enregistrées** (format de lancement) + direct (cohorte fixe / ouvert), recrutement **profs fondateurs (100% des revenus)**.

**Plateforme / conformité**
- **Manifeste** affiché aux nouveaux visiteurs.
- **Design épuré** : retrait des emojis « bébé », typo Bebas + rouge (fonctionnels gardés : ✅ ❌ 🔒 ⚠️).
- Mot « toune » → « chanson » (universel) ; « séquence » dans le Riff.
- Onglets réordonnés selon le workflow.
- **Cookies Loi 25** : bannière de consentement, GTM chargé seulement après accord.
- Téléchargements WAV qui ne changent plus de page (iframe).
- Légal + conditions revérifiés (abonnement, prix USD).
- SEO indexé.

---

## ✅ v1.1 — LIVRÉ (30 juin 2026)

**Bilingue EN/FR complet (bug « mal traduit » réglé)**
- App.jsx : catégories de genres par époque (4 listes) + 10 émotions branchées sur `L()` — affichage EN/FR cohérent.
- `master.html` (Mastering) : système i18n ajouté (langue via `?lang=`), ~40 chaînes traduites (statique + dynamique).
- `riff.html` (Riff Generator) : même système i18n, ~60 textes statiques + 20 chaînes dynamiques traduits.
- App.jsx passe maintenant `?lang=` aux iframes Master + Riff.

**Riff Generator — variété rythmique par style**
- `STYLE_META` dans `/api/riff` : temps de mesure fidèles au genre — 4/4 solide pour thrash/groove/deathcore ; 7/8, 5/4, 5/8, 9/8 pour djent/math/prog/techdeath/dissonant ; teinte 6/8 pour doom/sludge/black/power.
- Mouvement de batterie quand la mélodie monte + vrai switch de beat sur les styles techniques.
- Hasard par génération (deux générations du même style sonnent différemment).

**Génération in-app — Lyria 3 (Google/Gemini) — GROUNDWORK**
- `/api/lyria.js` : génération via Lyria 3, **auth Supabase + quota mensuel serveur par tier** (free=0, forge/pro=quota, elite=illimité).
- Nouvel onglet **AI Music** (payants seulement) : prompt, clip 30s / chanson complète, lecteur, téléchargement, quota restant.
- ⚠️ **Limite constatée** : Lyria penche vers le **chant clair** — growls/screams faibles. Meilleur pour instrumentaux + voix claires ; **Suno reste le choix pour l'extrême**.
- ⚠️ **À finir** : env vars Vercel (`GEMINI_API_KEY` + Supabase service) + SQL (colonnes `music_used` / `music_month`) + **optimiseur de prompt Lyria** (mode instrumental / voix) + push.

---

## 🔒 Sécurité — Audit du 28 juin

- ✅ **Recette 100% serveur** : `GENRE_DB`, `FUSIONS`, `SCENE_DB`, moteur d'émotions, patterns riff, `buildPrompt`, `genreProfile`/`randStructure`, recette mastering → tous dans `/api/*`. Le frontend ne contient aucune logique (juste les menus de choix).
- ✅ **Vraies clés secrètes** (Anthropic, Stripe secret, ElevenLabs) dans les variables Vercel (`process.env`) — **pas dans le dépôt**.
- ✅ Réponses API nettoyées : prompt détaillé du Riff retiré, `full` du Forge retiré, `/api/profile` ne renvoie que des valeurs concrètes.
- ⚠️ **À FAIRE (toi)** : le `.env` (seulement `VITE_SUPABASE_URL` + clé *anon* publique) était suivi par git. J'ai ajouté `.env` au `.gitignore` ; **détrack-le** :
  ```
  git rm --cached .env src/.env
  git add .gitignore
  git commit -m "Securite : ignore .env (cles hors depot)"
  git push
  ```
- ⚠️ **À CONFIRMER** : **RLS activé sur Supabase** (la clé anon est publique par design — RLS est ce qui protège les données). Vérifier aussi que le **repo GitHub est privé**.

---

## 🚀 Prochaines versions

### v1.1 — Stabilisation (cette semaine)
1. Déployer les derniers commits + **tester en prod** (le Riff/Forge ne tournent qu'en prod, pas en local).
2. **Détracker `.env`** + confirmer **RLS Supabase** + repo privé (voir Sécurité).
3. Promo v1.0 (le produit est prêt).
4. **Brancher l'onglet AI Music (Lyria)** : env vars Vercel + SQL Supabase (`music_used`/`music_month`) + optimiseur de prompt Lyria (instrumental/voix).
5. **Santé du repo git** : nettoyer le `.git/index.lock` récurrent + `git fsck` (warning « improper chunk offset »).

### v1.2 — Communauté & contenu
4. **Lancer la Masterclass** en **pré-enregistré** (le plus simple sans profs) : recruter 1-2 profs fondateurs, 1 parcours en modules.
5. **Mini-page admin Galerie** : approuver/refuser les soumissions d'un clic (au lieu de passer par Supabase) — file de modération.
6. **Enrichir l'encyclopédie** (nouvelles scènes / fusions au fil de tes recherches) → injectées dans la recette serveur.

### v2.0 — Génération in-app & modèle perso
6. **Génération musicale in-app** : quota serveur déjà en place. **Lyria 3 (Gemini)** = pay-as-you-go ~0,04 $/clip, 0,08 $/chanson, **pas de minimum mensuel** → bon point de départ (groundwork fait). **ElevenLabs** en option (min. mensuel du plan API). À finaliser : optimiseur de prompt Lyria + recharges Stripe + ratio crédits→$.
7. **Logging dataset interne** (prompt → résultat) côté serveur pour entraîner ton propre modèle (le `full` est déjà calculé serveur, prêt à logger).

---

## ⚖️ Légal / Droits

- API resale autorisée · usage commercial sur plan payant · **aucun nom de groupe** (respecté partout, y compris dans le parseur du Riff).
- Piste 100% IA = pas de copyright distribuable telle quelle.
- **Le moat légal** : retravaillée en studio (mastering/riff/édition) → œuvre dérivée distribuable que l'user possède. MetalPrompt = le pont.
- À valider : ElevenLabs permet-il de transmettre les droits commerciaux aux users (avant d'allumer les crédits).
- Protection IP (à faire) : doc 1 page daté + marque de commerce.

---

## 🛡️ Le moat (pourquoi c'est dur à copier)

Ton **encyclopédie musicologique** (genres + sous-genres + fusions + scènes géographiques + spec MIDI) encodée **entièrement côté serveur**. Le client n'envoie que des paramètres et reçoit le résultat fini. Personne ne voit la formule.

---

## 📊 Mesure (la vérité)

**Edge Requests** (Vercel, imbloquable) · **Supabase users** (inscriptions) · **Stripe** (abonnements) · **Google Search Console** (SEO). Le compteur « Visitors » de Vercel sous-estime (bloqueurs).
