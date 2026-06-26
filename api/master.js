// /api/master.js — Recette de mastering MetalPrompt (calibrage secret côté serveur).
// Le client applique le traitement audio localement (Web Audio) ; seuls les PARAMÈTRES viennent d'ici.
// L'audio n'est JAMAIS envoyé au serveur (vie privée respectée).
export default function handler(req, res) {
  const presets = {
    metal:    { low: 3,   pres: 4,   air: 3,   mud: 2,   harsh: 1.5, sat: 2,   comp: { thr: -20, ratio: 3,   att: .005, rel: .15 }, loud: -9 },
    balanced: { low: 1.5, pres: 2.5, air: 2,   mud: 1.5, harsh: 1,   sat: 1.2, comp: { thr: -18, ratio: 2.5, att: .01,  rel: .2 },  loud: -11 },
    warm:     { low: 4,   pres: 1,   air: 0.5, mud: 2.5, harsh: 1,   sat: 3,   comp: { thr: -22, ratio: 3.5, att: .02,  rel: .25 }, loud: -12 },
    brutal:   { low: 5,   pres: 6,   air: 4,   mud: 1.5, harsh: 2,   sat: 2.5, comp: { thr: -24, ratio: 4,   att: .003, rel: .1 },  loud: -7 },
    ia:       { low: 2,   pres: 3,   air: 2.5, mud: 3,   harsh: 3,   sat: 2.5, comp: { thr: -20, ratio: 3,   att: .005, rel: .18 }, loud: -10 },
  };
  // calibration fine de la chaîne (fréquences/Q) — secret, modifiable sans redéployer le client
  const chain = {
    hpHz: 30, mudHz: 280, mudQ: 1.2, presHz: 3000, presQ: 1,
    harshHz: 5200, harshQ: 2.2, airHz: 10000, limThr: -1.0, outGain: 0.96,
  };
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({ presets, chain });
}
