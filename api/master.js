// /api/master.js — Recette de mastering MetalPrompt (calibrage secret côté serveur).
// Le client applique le traitement audio localement (Web Audio) ; seuls les PARAMÈTRES viennent d'ici.
// L'audio n'est JAMAIS envoyé au serveur (vie privée respectée). Modifiable sans redéployer le client.
export default function handler(req, res) {
  const presets = {
    flat:     { low: 0,   pres: 0,   air: 0,   mud: 0,   harsh: 0,   sat: 0,   comp: { thr: -12, ratio: 1.5, att: .01,  rel: .2 },  loud: -11 },
    metal:    { low: 3,   pres: 4,   air: 3,   mud: 2,   harsh: 1.5, sat: 2,   comp: { thr: -20, ratio: 3,   att: .005, rel: .15 }, loud: -9 },
    balanced: { low: 1.5, pres: 2.5, air: 2,   mud: 1.5, harsh: 1,   sat: 1.2, comp: { thr: -18, ratio: 2.5, att: .01,  rel: .2 },  loud: -11 },
    warm:     { low: 4,   pres: 1,   air: 0.5, mud: 2.5, harsh: 1,   sat: 3,   comp: { thr: -22, ratio: 3.5, att: .02,  rel: .25 }, loud: -12 },
    brutal:   { low: 5,   pres: 6,   air: 4,   mud: 1.5, harsh: 2,   sat: 2.5, comp: { thr: -24, ratio: 4,   att: .003, rel: .1 },  loud: -7 },
    ia:       { low: 2,   pres: 3,   air: 2.5, mud: 3,   harsh: 3,   sat: 2.5, comp: { thr: -20, ratio: 3,   att: .005, rel: .18 }, loud: -10 },
  };
  // Calibration fine de la chaîne — TOUTE la recette est ici (fréquences, Q, limiteur, normalisation, EQ par piste).
  const chain = {
    // Pré-filtres + corrections anti-IA
    hpHz: 30, lowHz: 90, mudHz: 280, mudQ: 1.2,
    presHz: 3000, presQ: 1, harshHz: 5200, harshQ: 2.2, airHz: 10000,
    // Compression "glue"
    compKnee: 6,
    // Makeup gain : 10^((loud + ref)/div) — pousse vers la cible loudness
    makeupRef: 9, makeupDiv: 40,
    // Limiteur brickwall
    limThr: -1.0, limRatio: 20, limKnee: 0, limAtt: 0.001, limRel: 0.05,
    // Sortie + normalisation true-peak (anti-clip)
    outGain: 0.96, normPeak: 0.97,
    // Égaliseur master — 9 bandes
    eqFreqs: [50, 120, 250, 500, 900, 1800, 3500, 6500, 12000],
    // EQ 3 bandes PAR PISTE (stems)
    stem: { loHz: 120, midHz: 1000, midQ: 0.9, hiHz: 7000 },
    // Reverb (longueur IR générée) + saturation
    irSec: 0.5, satOversample: '4x',
  };
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({ presets, chain });
}
