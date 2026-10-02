/**
 * Early Watch — Map source_name → sigle (avatar 40px)
 *
 * Clé   : source_name exact tel que retourné par l'API (= "name" dans sources.yaml).
 * Sigle : 2–5 caractères, Instrument Sans.
 * Taille: SM_SIGLES liste explicitement tous les sigles ≥ 4 caractères → classe .sm (9px).
 *         Approche data plutôt que CSS conditionnel : maintenable si un sigle change.
 *
 * Sources : config/sources.yaml — 37 sources au 2026-04-21
 * Legifrance : flux eli/jo/rss → JO uniquement (pas de jurisprudence)
 */

// ── Map source_name → sigle ──────────────────────────────────────────────────

const SIGLES = {
  // Catégorie 1 — Primaires FR/EU
  'AMF':                    'AMF',
  'ACPR':                   'ACPR',
  'EBA':                    'EBA',
  'ESMA':                   'ESMA',
  'ECB Banking Supervision':'BCE',
  'EIOPA':                  'EIOPA',
  'AI Office EU':           'AIOE',
  'Parlement EU (ECON)':    'ECON',
  'CNIL':                   'CNIL',
  'Banque de France':       'BDF',
  'EC Financial Services':  'COM',
  'BIS':                    'BIS',
  'FSB':                    'FSB',
  'Legifrance JO':          'JO',
  'Conseil UE':             'CUE',
  'COLB':                   'COLB',
  'Tracfin':                'TRAC',
  'Tracfin Publications':   'TRAC',
  'FATF / GAFI':            'GAFI',
  'GAFI Typologies':        'GAFI',
  'GAFI Virtual Assets':    'GAFI',
  'AMLA':                   'AMLA',
  'OSMP':                   'OSMP',
  'AMF Réglementation':     'AMF',
  'AMF Doctrine PSAN':      'AMF',
  'EUR-Lex TFR 2023/1113':  'EURL',
  'EUR-Lex Législation':    'EURL',

  // Catégorie 2 — Organismes de place
  'Wolfsberg Group':        'WOLF',
  'Egmont Group':           'EGM',

  // Catégorie 3 — Sanctions
  'OFAC':                   'OFAC',
  'OFSI UK':                'OFSI',
  'UN Sanctions':           'ONU',
  'EUR-Lex Sanctions':      'EURL',

  // Catégorie 4 — Presse
  'AGEFI':                  'AGFI',

  // Catégorie 5 — International
  'Moneyval':               'MVAL',
  'FCA UK':                 'FCA',
  'FinCEN':                 'FNCN',
};

// ── Sigles ≥ 4 caractères → variante .sm (font-size 9px) ────────────────────
// Exhaustif et explicite — si un sigle change, mettre à jour ici aussi.

const SM_SIGLES = new Set([
  // 4 chars
  'ACPR', 'ESMA', 'AIOE', 'ECON', 'CNIL', 'COLB',
  'TRAC', 'GAFI', 'AMLA', 'OSMP', 'EURL', 'WOLF',
  'OFAC', 'OFSI', 'AGFI', 'MVAL', 'FNCN',
  // 5 chars
  'EIOPA',
]);

// ── API publique ─────────────────────────────────────────────────────────────

/**
 * Retourne le sigle à afficher dans l'avatar pour une source donnée.
 * Fallback : 2 premières lettres du premier mot non-article.
 *
 * @param {string|null} sourceName  article.source_name (API)
 * @returns {string}
 */
export function getSourceSigle(sourceName) {
  if (!sourceName) return '?';
  const mapped = SIGLES[sourceName];
  if (mapped) return mapped;

  // Fallback : 2 premières lettres, premier mot non-article
  const SKIP = new Set(['le', 'la', 'les', 'the', 'de', 'du', 'un', 'une', "l'", '\u2019']);
  const words = sourceName
    .split(/[\s\-_]+/)
    .filter(w => w && !SKIP.has(w.toLowerCase()));
  return ((words[0] || sourceName).slice(0, 2).toUpperCase()) || '?';
}

/**
 * Retourne true si le sigle nécessite la variante .sm (font-size 9px).
 * Basé sur SM_SIGLES — pas de calcul dynamique de longueur.
 *
 * @param {string} sigle
 * @returns {boolean}
 */
export function isSigleSm(sigle) {
  return SM_SIGLES.has(sigle);
}

/**
 * Construit le HTML d'un avatar source prêt à injecter.
 *
 * @param {string|null} sourceName
 * @returns {string}  <div class="ew-source-avatar [sm]">SIGLE</div>
 */
export function sourceAvatarHTML(sourceName) {
  const sigle = getSourceSigle(sourceName);
  const sm = isSigleSm(sigle) ? ' sm' : '';
  return `<div class="ew-source-avatar${sm}">${sigle}</div>`;
}
