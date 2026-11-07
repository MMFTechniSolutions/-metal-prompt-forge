// scripts/build-melody-bank.mjs — Banque de grooves + mélodies en fichiers locaux (bank/bank.json + bank/midi/*.mid)
// Usage : node scripts/build-melody-bank.mjs [nbParSection=2]
// En prod, la banque se remplit avec l'outil MCP propriétaire « remplir_banque » (table privée melody_bank).
import fs from 'node:fs';
import path from 'node:path';
import { generateBank, toMidi, STYLES, SECTIONS } from '../api/_lib/melodyBank.js';

const OUT = path.resolve('bank');
const PER = Number(process.argv[2] || 2);
const rows = await generateBank({ per: PER });
fs.mkdirSync(path.join(OUT, 'midi'), { recursive: true });
const bank = rows.map(r => ({ ...r, ...r.data, status: 'pending' }));
for (const e of bank) fs.writeFileSync(path.join(OUT, 'midi', e.id + '.mid'), toMidi(e));
fs.writeFileSync(path.join(OUT, 'bank.json'), JSON.stringify(bank));
console.log(`${bank.length} entrées · ${STYLES.length} styles · ${Object.keys(SECTIONS).length} sections × ${PER}`);
