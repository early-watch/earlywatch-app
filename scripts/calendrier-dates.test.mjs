// node --test scripts/calendrier-dates.test.mjs
// Les données du calendrier sont servies par l'API (earlybrief-platform,
// config/calendrier.json) : leur validité est testée côté serveur (tests/test_calendar_api.py).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePeriod, statusOf, concerns, normalizeProfileCode, daysUntil, isEstimated, horizonOf, icsFor, icsFilename, shortDescription } from '../src/scripts/calendrier-dates.js';

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

test('dates estimées : périodes, années, fins de mois — pas un jour précis ni « Depuis le »', () => {
  for (const l of ['fin 2027', '2028', 'janvier–mars 2027', 'fin septembre 2026']) assert.equal(isEstimated(l), true, l);
  for (const l of ['10 juillet 2027', '1er juillet 2025', 'Depuis le 1er juillet 2026', 'bientôt']) assert.equal(isEstimated(l), false, l);
});

test('blocs « Dans les 3 mois » / « Dans l’année » / « Plus tard » selon la date la plus tôt', () => {
  const now = at('2026-10-04');
  const h = (date) => horizonOf({ date, registre: 'a_venir' }, now);
  assert.equal(h('fin septembre 2026'), 'trois_mois');   // période entamée
  assert.equal(h('15 décembre 2026'), 'trois_mois');
  assert.equal(h('4 janvier 2027'), 'trois_mois');       // pile 3 mois
  assert.equal(h('janvier–mars 2027'), 'trois_mois');    // commence le 1er janvier
  assert.equal(h('10 juillet 2027'), 'annee');
  assert.equal(h('fin 2027'), 'annee');                  // commence le 1er octobre 2027 (≤ 12 mois)
  assert.equal(h('2028'), 'plus_tard');
  assert.equal(h('illisible'), 'plus_tard');
  assert.equal(horizonOf({ date: 'fin 2027' }, at('2026-09-01')), 'plus_tard');
});

test('profil du compte : même normalisation que le serveur', () => {
  assert.equal(normalizeProfileCode('PSP / EME'), 'etablissement_paiement');
  assert.equal(normalizeProfileCode('  Établissement   de crédit '), 'etablissement_credit');
  assert.equal(normalizeProfileCode('casp'), 'casp');
  assert.equal(normalizeProfileCode(''), null);
});

test('.ics : journée entière, premier jour d’une date estimée, texte échappé', () => {
  const now = at('2026-10-04');
  const ics = icsFor({ date: 'janvier–mars 2027', obligation: 'Normes; RTS, AMLA', note: 'Courte note.',
    acte: 'Règlement (UE) 2024/1620', source_url: 'https://eur-lex.europa.eu/eli/reg/2024/1620/oj' }, now);
  const unfolded = ics.replace(/\r\n /g, '');
  assert.match(unfolded, /\r\nDTSTART;VALUE=DATE:20270101\r\nDTEND;VALUE=DATE:20270102\r\n/);
  assert.match(unfolded, /\r\nSUMMARY:Normes\\; RTS\\, AMLA\r\n/);
  assert.match(unfolded, /DESCRIPTION:Date estimée : janvier–mars 2027\.\\nCourte note\.\\nRèglement \(UE\) 2024\/1620\\nhttps:\/\/eur-lex/);
  assert.match(unfolded, /\r\nURL:https:\/\/eur-lex\.europa\.eu\/eli\/reg\/2024\/1620\/oj\r\n/);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  const exact = icsFor({ date: '10 juillet 2027', obligation: 'AMLR' }, now).replace(/\r\n /g, '');
  assert.match(exact, /DTSTART;VALUE=DATE:20270710/);
  assert.doesNotMatch(exact, /Date estimée/);
  assert.equal(icsFor({ date: 'bientôt', obligation: 'x' }, now), null);
  assert.equal(icsFilename({ date: '10 juillet 2027' }), 'echeance-2027-07-10.ics');
});

test('description courte coupée sur un mot', () => {
  const s = shortDescription('mot '.repeat(80));
  assert.ok(s.length <= 201 && s.endsWith('…') && !s.includes('mo…'));
  assert.equal(shortDescription('court'), 'court');
});
