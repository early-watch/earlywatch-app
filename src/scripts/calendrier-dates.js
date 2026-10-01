// Calendrier réglementaire — lecture des libellés de date et statut du jour.
//
// Les libellés de src/data/calendrier.ts restent tels quels (EB-CAL-001 : aucune
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

// Valeurs historiques de settings.entity_type (cf. LEGACY_ALIASES, app/core/profiles.py).
const LEGACY = { banque: 'etablissement_credit', psp: 'etablissement_paiement', 'psp/eme': 'etablissement_paiement', ep: 'etablissement_paiement', eme: 'etablissement_monnaie_electronique', psan: 'casp', 'psan/casp': 'casp' };

export function normalizeProfileCode(value) {
  const k = String(value || '').trim().toLowerCase();
  return LEGACY[k] || k || null;
}
