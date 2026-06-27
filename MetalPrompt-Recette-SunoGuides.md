# MetalPrompt — Synthèse des guides Suno → upgrades de la recette
*Extrait de 3 guides clés (Metal Prompt Guide, Suno v5 Tips, Meta-Tags Vérifiés). 100% sans noms de bands — uniquement formules, tags et valeurs vérifiées.*

---

## 1. Plages de BPM vérifiées par sous-genre (→ calibrer l'auto-config genre)
| Sous-genre | BPM | Mots-clés cœur |
|---|---|---|
| Doom | 50-80 | riffs lents blues, distorsion vintage, voix profonde |
| Sludge | 60-100 | riffs lents épais, cris agressifs, production abrasive |
| Slam | 80-120 | gutturaux ultra-bas, breakdowns half-time, low-end max |
| Gothic | 70-100 | baryton/duo H-F, orgue/synth, mid-tempo romantique sombre |
| Groove | 90-130 | riffs syncopés mid-tempo, growls, pinch harmonics, bounce |
| Nu-metal | 90-130 | voix chant↔scream, riffs down-tuned bouncy, rythmes hip-hop |
| Deathcore | 100-180 | growls+shrieks, breakdowns écrasants, blast beats, mix poli moderne |
| Industrial | 110-140 | beats électro, batterie mécanique, voix robotiques |
| Djent | 120-160 | chugs 8-cordes polyrythmiques, syncopé, production digitale propre |
| Metalcore | 130-170 | growls↔chant clair, riffs mélodiques, breakdowns, solos |
| Melodic death | 140-180 | growls + hooks mélodiques, leads harmonisés |
| Thrash | 140-200 | tempo rapide, solos shred, palm-mute, double kick serré |
| Power | 140-180 | voix claires aiguës, double kick, refrains anthemiques |
| Black | 140-220 | shrieks aigus, tremolo, blast beats, prod lo-fi crue |
| Symphonic black | 140-200 | growls théâtraux, orchestral, tremolo, cinématique |
| Death | 150-220 | growls gutturaux, blast beats, tremolo down-tuned |
| Tech death | 160-230 | signatures complexes, riffs précis rapides, prod propre |
| Grindcore | 200-300 | blast ultra-rapides, screams aigus, morceaux courts |

## 2. Formule de Style Prompt (→ structurer buildPrompt)
`[Sous-genre] + [éléments soniques clés] + [type de voix] + [feel de prod/mix] + [mood]`
- **Garder court** : ≤ 2 phrases, 4-7 tags ciblés (mieux que des murs de texte).
- **v5 : ancrer le vibe au DÉBUT et à la FIN** du prompt (répéter le genre/mood en fin verrouille le rendu).
- **≤ 2 genres** + 1 mood + instruments optionnels. Empiler 3-4 genres = instable.

## 3. Tags structurels & metal (→ champ Lyrics, pas Style)
**Structure** : [Intro] [Instrumental Intro] [Verse 1/2] [Pre-Chorus] [Chorus] [Post-Chorus] [Bridge] [Final Chorus] [Outro] [Instrumental Outro] [Tag] [Coda]
**Metal (vérifiés)** : **[Breakdown]** (LE plus puissant), [Blast Beat], [Guitar Solo], [Build], [Drop], [Break], [Hook], [Interlude], [Instrumental]
**Dynamique/rythme (vérifiés)** : [Half-Time], [Double-Time], [Stop-Time], [Crescendo], [Diminuendo], [Key Change], [Drop to Half-Time]
> Astuce : `[Chorus | Half-Time]` ou `[Verse | 80s]` = combiner tag de section + modifieur.

## 4. Cues vocaux (→ entre parenthèses, AVANT la ligne, dans Lyrics)
**Extrêmes** : (guttural growl) (low false-chord) (tunnel throat guttural) (blackened shriek) (pig squeal) (fried scream) (gang shout) (chant) (spoken word) (whisper) (heavy breathing)
**Clairs/mixtes** : (clean vocal) (falsetto) (gritty tenor) (deep baritone) (powerful belt) (raspy)
**Layering** (climax seulement) : empiler `(guttural growl) + (blackened shriek)` sur une ligne.

## 5. Tricks de formatage des paroles (→ génération de paroles)
- `...` = pause/note tenue ("Don't... let... me... go")
- `-` = staccato percussif ("WIRE - ME - UP")
- **MAJUSCULES** = intensité/cri (breakdowns seulement)
- Répétition = chant/slam ("HOLLOW - HOLLOW - HOLLOW")
- Ligne vide entre sections = respiration
- **6-12 syllabes/ligne**, lignes courtes, langage direct, comptes de syllabes similaires.

## 6. Bibliothèque de mots-clés vérifiés (→ enrichir les tags)
**Guitare** : chugging riffs, tremolo picking, down-tuned (Drop D/A/G#), high gain, 8/7-string, pinch harmonics, dissonant riffs, harmonized solos, djent-style chugs, syncopated riffs
**Drums** : blast beats, double kick, half-time, syncopated, ghost-note, polyrhythmic, tribal
**Prod/Mix** : modern polished mix, raw production, aggressive mix, atmospheric, very loud drums and guitars, clean digital production, **scooped mids, tight bass, forward kick and snare**
**Mood** : violent/aggressive, dark/haunting, epic/triumphant, nihilistic/bleak, groovy/bouncy, technical/precise, apocalyptic

## 7. Auto-correctifs (→ injecter selon le problème)
- Sonne rock générique → ajouter "very loud drums and guitars, aggressive mix, high gain" + nom de sous-genre précis
- Voix trop clean → forcer "guttural growling male vocals" + cue (guttural growl)
- Breakdown faible → tag [Breakdown] + "crushing breakdowns, heavy down-tuned riffs" + paroles COURTES en MAJ avec tirets
- Mix trop pop/brillant → "dark atmosphere, low-end focused, scooped mids, tight bass, forward kick and snare"
- Mauvais sous-genre → préciser ("modern deathcore, post-2015 production") + tuning explicite (Drop A, 7-string)

## 8. v5 — bonnes pratiques
- Anchor descripteurs début+fin · front-load les tags clés (3-5 premières lignes)
- Era tags vérifiés : [80s] [90s] [2000s] (influence la prod d'époque) → mapper sur nos ÉPOQUES
- Callbacks sur Extend : "continue with same vibe as chorus"
- Stems jusqu'à 12 (v5 Pro) → notre mode mastering multipiste est aligné
- API : PAS d'API Suno v5 officielle (confirme notre stratégie ElevenLabs pour la génération in-app)

---

## ➡️ Upgrades proposés pour MetalPrompt (par fichier)
1. **api/riff.js + api/forge (buildPrompt)** : adopter la formule §2, ancrer genre/mood en fin, limiter à ≤2 genres, ajouter auto-correctifs §7 selon les sliders (ex: heaviness élevé → "very loud, high gain, scooped mids").
2. **Auto-config genre (App.jsx genreProfile)** : recaler les **plages BPM** sur §1 (valeurs vérifiées).
3. **Bibliothèque vocale (VOCAL_ERAS)** : ajouter les cues §4 manquants (tunnel throat guttural, low false-chord, fried scream, gang shout, heavy breathing, powerful belt…).
4. **Structure / Paroles** : injecter les tags metal §3 ([Breakdown], [Blast Beat], [Build], [Drop]) + cues §4 sous chaque section, et appliquer les tricks §5 dans la génération de paroles.
5. **Tags guitare/drums/prod (GUITAR/DRUM/PROD)** : compléter avec le vocabulaire vérifié §6 (scooped mids, ghost-note, harmonized solos, etc.).
6. **Époques** : mapper la sélection d'époque sur un era tag Suno ([80s]/[90s]/[2000s]) dans le prompt.
