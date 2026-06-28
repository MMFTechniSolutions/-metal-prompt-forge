# MetalPrompt — Encyclopédie → Recette (données de calibration)
*Extrait de l'étude musicologique de francois. Source pour calibrer /api/forge (BPM, tuning, temps de mesure, gamme/mode→tags, voix, production). Sous-genres + fusions à venir.*

## Table de calibration par genre
| Genre | Tuning | BPM | Temps mesure | Gamme / Mode | Voix | Production |
|---|---|---|---|---|---|---|
| Heavy metal trad | E standard | 110-150 | 4/4 | mineur / blues | clean puissant aigu | disto lampe vintage |
| Thrash | E standard | 180-240 | 4/4 | downpicking rapide, chromatique | raspy / shout | scooped mids, double kick 16th |
| Doom | bas (C/B) | 50-80 | 4/4 lent, 6/8 | triton, bluesy/psyché | clean profond / solennel | guitares épaisses, lourd |
| Power | standard | 140-180 | 4/4 galopant | mineur harmonique | clean très aigu | double kick continu, bombastique |
| Neoclassical | standard | 160-200 | 4/4 | mineur harmonique, arpèges dim7, pedal point, sweep | clean aigu | virtuose, contrepoint clavecin/cordes |
| Death (Floride) | D/C standard ou + bas | 200-260 | 4/4 | phrygien dominant + chromatique | death growls gutturaux | massif percussif, trigger kick, EQ agressif |
| Tech death | D/C bas | 160-230 | impair + 4/4 | dissonant, complexe | growls gutturaux | clair, précis |
| Black | sec, sans basses | 140-220 | 4/4 | tremolo, accords ouverts dissonants chromatiques | shrieks suraigus déchirés | lo-fi, abrasif, mur monochrome |
| Symphonic black | standard | 140-200 | 4/4 | tremolo + orchestral | shrieks théâtraux | cinématique, orchestre |
| Atmospheric/DSBM | standard/Drop D | 100-200 | 4/4 | tremolo atmosphérique | shrieks lointains | reverb, froid |
| Grindcore | Eb / C standard | 200-300 | 4/4 microsongs | ultra-rapide bourdonnant | pig squeals + cris stridents | chaos, brut |
| Goregrind | C bas | 200-280 | 4/4 | brutal | gurglements pitch-shift | organique, death-like |
| Cybergrind | C bas | 220-300+ | 4/4 prog. | grind + électronique dure | growls + cris | boîte à rythme inhumaine, samples num. |
| Deathgrind | C/D bas | 200-280 | 4/4 | grind + death précis | gutturaux + cris | clair, moins compressé |
| Gothic | bas | 60-140 | 4/4 couplet-refrain | mineur, mélancolique | Belle & la Bête (soprano + growls) | acoustique épuré ↔ saturé, cordes dramatiques |
| Symphonic | standard | 140-200 | 4/4 | leitmotivs classiques | soprano lyrique | orchestre complet + double kick |
| Sludge | C standard / Drop B-A | 60-110 (+ d-beat) | 4/4 traînant | triton, bas, derrière le temps | hurlé/aboyé détresse | larsen, ampli poussé, sale |
| Nu-metal | 7 cordes bas | 90-130 | 4/4 bounce | groove syncopé | rappé/cris/chuchoté/mélodique | platines, samples, textures indus |
| Funk metal | bas | 100-140 | 4/4 syncopé | groove funk | mélodique | basse slap, riffs thrash |
| Rap metal | bas | 90-130 | 4/4 syncopé | groove | rap scandé agressif | riffs lourds + flow |
| Djent | Drop A/G/F# (7-9 cordes multiscale) | 120-160 | 7/8, 17/16 sur 4/4 | seconde mineure + triton | clean+harsh moderne, parlé-chanté | noise-gate ultra, EQ creux 400Hz, cut <100Hz, mids aigus, palm-mute claquant |
| Drone | C/B/A ou + bas | quasi a-rythmique | stase | pedal point, quinte/seconde mineure | murmures/rituel noyés | room mics, octave fuzz, AUCUNE compression |
| Post-metal | Drop D/C/B | lent narratif | 4/4 long-form | cadence I-♭VI, accords 9e/11e | cris occasionnels + longs instru | dynamique (épuré ↔ crescendo massif) |
| Post-black / Blackgaze | standard / Drop D-C | mid | 4/4 | modes consonants (ionien/mixolydien/dorien), add9/maj7/sus2 | shrieks lointains noyés reverb + clean éthéré | mur de son, reverb algo, delays stéréo |
| Metalcore / Deathcore | Drop C/B/A | 100-180 | 4/4 (breakdowns) | éolien/phrygien, cassures dissonantes | cris saturés aigus + death growls | édition millimétrée, comp forte kick/snare, guitares doublées pan 100% |

## Notes techniques transversales (production)
- **Death/Black recording** : tempo map obligatoire >230 BPM ; trigger kick (piézo→sample) mixé au signal réel ; couverture isolante grosse caisse ; gate strict caisse claire ; toms accordés lâches (mat/court) ; cymbales ride doublées.
- **Djent mix** : cut guitare <100 Hz, creux 300-500 Hz, accent mids aigus (attaque médiator) ; noise-gate hyper réactif ; thumping + selective picking.
- **Black metal** : disto aigrelette « blizzard », sec, sans basses, lo-fi multipiste.
- **Drone** : pas de pulsation, accords tenus minutes, fuzz/octave fuzz, room mics.

## À VENIR (francois prépare)
- Détail des **sous-genres** (ramifications)
- Les **fusions** (hybrides) + dominance pour Cover

## Plan d'intégration (quand doc complet)
1. genreProfile → BPM exacts par sous-genre
2. Mapping genre → **tuning** par défaut (Drop A pour djent, D/C pour death…)
3. Mapping genre → **temps de mesure** (djent 7/8-17/16, doom 6/8, gothic 4/4…)
4. Gamme/mode → **tags** (phrygien dominant, triton, add9, harmonic minor…)
5. Voix par genre (Belle & Bête, gurgle pitch-shift, shrieks reverb…)
6. Production par genre (scooped mids thrash, gate djent, lo-fi black, room mics drone…)
7. **Fusions** → noms d'hybrides + dominance/cover
