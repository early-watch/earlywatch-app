// Calendrier réglementaire — lecture des libellés de date et statut du jour.
//
// Les libellés du calendrier (API GET /app/calendar) restent tels quels (EB-CAL-001 : aucune
// date ajoutée). Ce module en déduit une PÉRIODE [début, fin] pour calculer le
// statut à la date du jour, dans le navigateur (le site est statique : un statut
// calculé au build serait figé au jour du déploiement).

const MOIS = {
  janvier: 0, 'février': 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6,
  'août': 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, 'décembre': 11, decembre: 11,
};
const M = '(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)';

const day = (y, m, d) => new Date(Date.UTC(y, m, d));
const lastDay = (y, m) => new Date(Date.UTC(y, m + 1, 0));

/**
 * Libellé → { start, end, open } (dates UTC à minuit), ou null si illisible.
 * `open` : « Depuis le … » (pas de fin).
 */
export function parsePeriod(label) {
  const s = String(label || '').trim().toLowerCase().replace(/\s+/g, ' ');
  let m;
  if ((m = s.match(new RegExp(`^depuis le (\\d{1,2})(?:er)? ${M} (\\d{4})$`)))) {
    const d = day(+m[3], MOIS[m[2]], +m[1]);
    return { start: d, end: null, open: true };
  }
  if ((m = s.match(new RegExp(`^(\\d{1,2})(?:er)? ${M} (\\d{4})$`)))) {
    const d = day(+m[3], MOIS[m[2]], +m[1]);
    return { start: d, end: d, open: false };
  }
  if ((m = s.match(new RegExp(`^fin ${M} (\\d{4})$`)))) {
    const y = +m[2], mo = MOIS[m[1]];
    return { start: day(y, mo, 21), end: lastDay(y, mo), open: false };
  }
  if ((m = s.match(new RegExp(`^${M}\\s*[–-]\\s*${M} (\\d{4})$`)))) {
    const y = +m[3];
    return { start: day(y, MOIS[m[1]], 1), end: lastDay(y, MOIS[m[2]]), open: false };
  }
  if ((m = s.match(/^fin (\d{4})$/))) {
    return { start: day(+m[1], 9, 1), end: day(+m[1], 11, 31), open: false };
  }
  if ((m = s.match(/^(\d{4})$/))) {
    return { start: day(+m[1], 0, 1), end: day(+m[1], 11, 31), open: false };
  }
  return null;
}

export const IMMINENT_DAYS = 30;

const todayUTC = (now) => day(now.getFullYear(), now.getMonth(), now.getDate());
const daysBetween = (a, b) => Math.round((b - a) / 86400000);

/**
 * Statut à la date `now` :
 *   - échéance (registre « a_venir ») : 'echue' | 'aujourdhui' | 'en_cours' | 'imminente' | 'a_venir'
 *   - contexte (registre « en_vigueur ») : 'en_vigueur' | 'a_venir'
 * Libellé illisible → null (l'appelant garde l'affichage neutre).
 */
export function statusOf(entry, now = new Date()) {
  const p = parsePeriod(entry.date);
  if (!p) return null;
  const t = todayUTC(now);
  if (entry.registre === 'en_vigueur') return p.start <= t ? 'en_vigueur' : 'a_venir';
  if (p.open) return p.start <= t ? 'en_vigueur' : 'a_venir';
  if (p.end < t) return 'echue';
  if (+p.start === +t && +p.end === +t) return 'aujourdhui';
  if (p.start <= t) return 'en_cours';
  return daysBetween(t, p.start) <= IMMINENT_DAYS ? 'imminente' : 'a_venir';
}

export const STATUS_LABELS = {
  echue: 'Échue',
  aujourdhui: "Aujourd'hui",
  en_cours: 'En cours',
  imminente: 'Imminente',
  a_venir: 'À venir',
  en_vigueur: 'En vigueur',
};

/** Jours restants avant le début de la période (échéance future), sinon null. */
export function daysUntil(entry, now = new Date()) {
  const p = parsePeriod(entry.date);
  if (!p) return null;
  const n = daysBetween(todayUTC(now), p.start);
  return n > 0 ? n : null;
}

// ── Filtre par profil ──────────────────────────────────────────────────────
// Profils : identifiants de app/core/profiles.py (liste fournie par l'API).
// Familles des profils cités dans les données, si la liste de l'API manque.
const FAMILY_FALLBACK = { casp: 'financier', agent_sportif: 'non_financier' };

/** perimetre (JSON de l'attribut data-perimetre ou valeur brute) → valeur. */
export function parsePerimetre(raw) {
  if (Array.isArray(raw)) return raw;
  const v = String(raw ?? '').trim();
  if (v.startsWith('[')) { try { return JSON.parse(v); } catch { return 'tous'; } }
  return v || 'tous';
}

/**
 * L'entrée concerne-t-elle ce profil ? (champ `perimetre` des données)
 *   - aucun profil choisi (« Tous les profils ») → oui ;
 *   - 'etat' → effet indirect : seulement sans profil choisi (masqué dès qu'un
 *     profil ou une famille est choisi, consultant compris) ;
 *   - consultant conformité → toutes les autres entrées (il accompagne tous les assujettis) ;
 *   - 'tous' → tous les profils, professions non financières comprises ;
 *   - 'financier' → secteur financier ;
 *   - liste de profils → ces profils ; famille entière choisie → si un profil
 *     de la liste appartient à la famille.
 * `familyOf(code)` : famille d'un profil (liste de l'API), avec repli local.
 */
export function concerns(entry, profile, familyOf = () => null) {
  if (!profile || (!profile.code && !profile.family)) return true;
  const per = parsePerimetre(entry.perimetre);
  if (per === 'etat') return false;
  if (profile.code === 'consultant') return true;
  if (per === 'tous') return true;
  if (per === 'financier') return profile.family === 'financier';
  if (Array.isArray(per)) {
    if (profile.code) return per.includes(profile.code);
    return per.some((c) => (familyOf(c) || FAMILY_FALLBACK[c]) === profile.family);
  }
  return true;
}

// Valeurs historiques de settings.entity_type : même table et même mise en forme de la
// clé que le serveur (LEGACY_ALIASES et _key, app/core/profiles.py).
const LEGACY = {
  banque: 'etablissement_credit', 'etablissement de credit': 'etablissement_credit', 'établissement de crédit': 'etablissement_credit',
  psp: 'etablissement_paiement', 'psp/eme': 'etablissement_paiement', ep: 'etablissement_paiement',
  eme: 'etablissement_monnaie_electronique', psan: 'casp', 'psan/casp': 'casp',
};

export function normalizeProfileCode(value) {
  const k = String(value || '').trim().toLowerCase().replace(/ \/ /g, '/').split(/\s+/).filter(Boolean).join(' ');
  return LEGACY[k] || k || null;
}

/**
 * Prochaine échéance (registre « a_venir », non échue) concernant ce profil,
 * la plus proche par date de début ; une échéance en cours passe en premier.
 * → { entry, status, days } ou null.
 */
export function nextDeadline(entries, now = new Date(), profile = null, familyOf = () => null) {
  const t = todayUTC(now);
  const candidates = entries
    .filter((e) => e.registre === 'a_venir' && concerns(e, profile, familyOf))
    .map((e) => ({ entry: e, period: parsePeriod(e.date), status: statusOf(e, now) }))
    .filter((x) => x.period && x.status && x.status !== 'echue' && x.status !== 'en_vigueur')
    .sort((a, b) => a.period.start - b.period.start);
  const first = candidates[0];
  if (!first) return null;
  return { entry: first.entry, status: first.status, days: daysBetween(t, first.period.start) };
}

/** « aujourd'hui », « demain », « dans N jours », « en cours » (précision au jour). */
export function relativeLabel(status, days, exact) {
  if (status === 'aujourdhui') return "aujourd'hui";
  if (status === 'en_cours') return 'en cours';
  if (!exact || days == null || days <= 0) return null;
  return days === 1 ? 'demain' : `dans ${days} jours`;
}

/** Le libellé désigne-t-il un jour précis (« 15 août 2026 ») ? */
export function isExactDate(label) {
  const p = parsePeriod(label);
  return !!(p && !p.open && +p.start === +p.end);
}

// ── Regroupement par horizon, dates estimées ───────────────────────────────

/** Date imprécise (« fin 2027 », « 2028 », « janvier–mars 2027 », « fin septembre 2026 ») :
 *  tout libellé lisible qui ne désigne pas un jour précis ni « Depuis le … ». */
export function isEstimated(label) {
  const p = parsePeriod(label);
  return !!(p && !p.open && +p.start !== +p.end);
}

export const HORIZONS = [
  { key: 'trois_mois', label: 'Dans les 3 mois' },
  { key: 'annee', label: "Dans l'année" },
  { key: 'plus_tard', label: 'Plus tard' },
];

const addMonths = (d, n) => day(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate());

/**
 * Bloc d'une échéance à venir, selon sa date la PLUS TÔT (début de la période) :
 * ≤ 3 mois → 'trois_mois' (période déjà entamée comprise), ≤ 12 mois → 'annee',
 * sinon 'plus_tard'. Libellé illisible → 'plus_tard'.
 */
export function horizonOf(entry, now = new Date()) {
  const p = parsePeriod(entry.date);
  if (!p) return 'plus_tard';
  const t = todayUTC(now);
  if (p.start <= addMonths(t, 3)) return 'trois_mois';
  if (p.start <= addMonths(t, 12)) return 'annee';
  return 'plus_tard';
}

// ── Ajout à l'agenda (.ics, généré dans le navigateur) ─────────────────────

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
// RFC 5545 : échappement des textes, lignes pliées à 75 octets.
const icsText = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function fold(line) {
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > 75) { out.push(cur); cur = ' '; bytes = 1; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

/** Description courte : la note limitée à ~200 caractères, coupée sur un mot. */
export function shortDescription(text, max = 200) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[\s,;:.]+$/, '') + '…';
}

/**
 * Fichier .ics d'une échéance : événement « journée entière » au jour de l'échéance ;
 * date estimée → premier jour de la période (mention dans la description).
 * Libellé illisible → null (pas de bouton).
 */
export function icsFor(entry, now = new Date()) {
  const p = parsePeriod(entry.date);
  if (!p) return null;
  const start = p.start;
  const end = day(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1);
  const desc = [
    isEstimated(entry.date) ? `Date estimée : ${entry.date}.` : '',
    shortDescription(entry.note),
    entry.acte || '',
    entry.source_url || '',
  ].filter(Boolean).join('\n');
  const uid = `${ymd(start)}-${String(entry.obligation || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}@earlywatch`;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Early Watch//Calendrier LCB-FT//FR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(end)}`,
    `SUMMARY:${icsText(entry.obligation)}`,
    `DESCRIPTION:${icsText(desc)}`,
    ...(entry.source_url ? [`URL:${icsText(entry.source_url)}`] : []),
    'TRANSP:TRANSPARENT',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Nom de fichier lisible : « echeance-2027-07-10.ics ». */
export function icsFilename(entry) {
  const p = parsePeriod(entry.date);
  return p ? `echeance-${p.start.toISOString().slice(0, 10)}.ics` : 'echeance.ics';
}
