// node --test scripts/calendrier-dates.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePeriod, statusOf, concerns, normalizeProfileCode, daysUntil } from '../src/scripts/calendrier-dates.js';

const iso = (d) => d && d.toISOString().slice(0, 10);
const at = (s) => new Date(`${s}T12:00:00`);

test('lecture des libellés de date du calendrier', () => {
  const p = (l) => { const r = parsePeriod(l); return r && [iso(r.start), iso(r.end), r.open]; };
  assert.deepEqual(p('15 août 2026'), ['2026-08-15', '2026-08-15', false]);
  assert.deepEqual(p('1er juillet 2025'), ['2025-07-01', '2025-07-01', false]);
  assert.deepEqual(p('fin septembre 2026'), ['2026-09-21', '2026-09-30', false]);
  assert.deepEqual(p('janvier–mars 2027'), ['2027-01-01', '2027-03-31', false]);
  assert.deepEqual(p('fin 2027'), ['2027-10-01', '2027-12-31', false]);
  assert.deepEqual(p('2028'), ['2028-01-01', '2028-12-31', false]);
  assert.deepEqual(p('Depuis le 1er juillet 2026'), ['2026-07-01', null, true]);
  assert.equal(parsePeriod('au plus tard bientôt'), null);
});

test('tous les libellés présents dans les données sont lisibles', () => {
  const src = readFileSync(new URL('../src/data/calendrier.ts', import.meta.url), 'utf8');
  const labels = [...src.matchAll(/^\s*date: '([^']*)'/gm)].map((m) => m[1]);
  assert.ok(labels.length >= 10);
  for (const l of labels) assert.ok(parsePeriod(l), `libellé illisible : ${l}`);
});

test('une échéance passée n’est jamais « À venir »', () => {
  const e = { date: '15 août 2026', registre: 'a_venir' };
  assert.equal(statusOf(e, at('2026-09-30')), 'echue');
  assert.equal(statusOf(e, at('2026-08-15')), 'aujourdhui');
  assert.equal(statusOf(e, at('2026-08-01')), 'imminente');
  assert.equal(statusOf(e, at('2026-06-01')), 'a_venir');
});

test('période : en cours, puis échue le lendemain de la fin', () => {
  const e = { date: 'fin septembre 2026', registre: 'a_venir' };
  assert.equal(statusOf(e, at('2026-09-30')), 'en_cours');
  assert.equal(statusOf(e, at('2026-10-01')), 'echue');
  assert.equal(statusOf(e, at('2026-09-10')), 'imminente');
});

test('registre « en vigueur » et « Depuis le … »', () => {
  assert.equal(statusOf({ date: '9 juillet 2024', registre: 'en_vigueur' }, at('2026-09-30')), 'en_vigueur');
  assert.equal(statusOf({ date: 'Depuis le 1er juillet 2026', registre: 'a_venir' }, at('2026-09-30')), 'en_vigueur');
});

test('jours restants', () => {
  assert.equal(daysUntil({ date: '10 juillet 2027' }, at('2027-07-01')), 9);
  assert.equal(daysUntil({ date: '15 août 2026' }, at('2026-09-30')), null);
});

test('filtre par profil selon le périmètre, professions non financières comprises', () => {
  const tous = { perimetre: 'tous' };
  const fin = { perimetre: 'financier' };
  const etat = { perimetre: 'etat' };
  const casp = { perimetre: JSON.stringify(['casp']) };            // tel que dans data-perimetre
  const sport = { perimetre: ['agent_sportif'] };
  const avocat = { code: 'avocat', family: 'non_financier' };
  const agent = { code: 'agent_sportif', family: 'non_financier' };
  const ep = { code: 'etablissement_paiement', family: 'financier' };
  const caspP = { code: 'casp', family: 'financier' };
  assert.equal(concerns(tous, avocat), true);
  assert.equal(concerns(etat, avocat), false);              // État : masquée dès qu'un profil est choisi
  assert.equal(concerns(etat, null), true);                  // … visible dans « Tous les profils »
  assert.equal(concerns(etat, { code: null, family: 'financier' }), false);
  assert.equal(concerns(etat, { code: 'consultant', family: 'financier' }), false);
  assert.equal(concerns(fin, avocat), false);
  assert.equal(concerns(fin, ep), true);
  assert.equal(concerns(casp, avocat), false);
  assert.equal(concerns(casp, caspP), true);
  assert.equal(concerns(casp, ep), false);
  assert.equal(concerns(sport, agent), true);
  assert.equal(concerns(sport, avocat), false);
  assert.equal(concerns(casp, null), true);
  assert.equal(concerns(casp, { code: 'consultant', family: 'financier' }), true);
  // Famille entière
  assert.equal(concerns(casp, { code: null, family: 'financier' }), true);
  assert.equal(concerns(casp, { code: null, family: 'non_financier' }), false);
  assert.equal(concerns(sport, { code: null, family: 'non_financier' }), true);
  assert.equal(concerns(fin, { code: null, family: 'non_financier' }), false);
  assert.equal(concerns(tous, { code: null, family: 'non_financier' }), true);
});

test('chaque entrée des données a un périmètre valide', () => {
  const src = readFileSync(new URL('../src/data/calendrier.ts', import.meta.url), 'utf8');
  const dates = [...src.matchAll(/^\s*date: '([^']*)'/gm)].length;
  const pers = [...src.matchAll(/^\s*perimetre: (.+),$/gm)].map((m) => m[1]);
  assert.equal(pers.length, dates, 'une ligne perimetre par entrée');
  for (const p of pers) {
    assert.ok(/^'(tous|financier|etat)'$/.test(p) || /^\['[a-z_]+'(, '[a-z_]+')*\]$/.test(p), `périmètre invalide : ${p}`);
  }
  assert.ok(!src.includes('type_etablissement:'), 'plus de type_etablissement');
});

test('valeurs historiques du profil', () => {
  assert.equal(normalizeProfileCode('BANQUE'), 'etablissement_credit');
  assert.equal(normalizeProfileCode('PSP'), 'etablissement_paiement');
  assert.equal(normalizeProfileCode('avocat'), 'avocat');
  assert.equal(normalizeProfileCode(''), null);
});

test('prochaine échéance et compte à rebours', async () => {
  const { nextDeadline, relativeLabel, isExactDate } = await import('../src/scripts/calendrier-dates.js');
  const entries = [
    { date: '15 août 2026', registre: 'a_venir', perimetre: 'financier' },
    { date: 'janvier–mars 2027', registre: 'a_venir', perimetre: 'financier' },
    { date: '10 juillet 2027', registre: 'a_venir', perimetre: 'tous' },
    { date: '9 juillet 2024', registre: 'en_vigueur', perimetre: 'tous' },
  ];
  const avocat = { code: 'avocat', family: 'non_financier' };
  const n = nextDeadline(entries, at('2026-10-01'), avocat);
  assert.equal(n.entry.date, '10 juillet 2027');
  assert.equal(n.days, 282);
  assert.equal(relativeLabel(n.status, n.days, isExactDate(n.entry.date)), 'dans 282 jours');
  assert.equal(nextDeadline(entries, at('2026-10-01'), null).entry.date, 'janvier–mars 2027');
  assert.equal(nextDeadline(entries, at('2027-08-01'), avocat), null);
  assert.equal(relativeLabel('a_venir', 1, true), 'demain');
  assert.equal(relativeLabel('a_venir', 40, false), null);       // période (« fin 2027 ») : pas de compte au jour
  assert.equal(relativeLabel('aujourdhui', 0, true), "aujourd'hui");
  assert.equal(isExactDate('fin 2027'), false);
});
