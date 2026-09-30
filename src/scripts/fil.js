// Fil et Suivis (MVP) — niveau, ligne et détail d'une publication.
//
// Niveau : lu dans `level` fourni par le serveur (GET /api/v1/app/articles).
// Tant que le serveur ne le fournit pas, règle PROVISOIRE (même règle que le
// serveur) : Action = mesure restrictive (gel des avoirs), ou has_impact avec
// gravité critical/high ; À lire = gravité medium, ou has_impact en low ;
// Info = le reste.
// Résumé et raison : champs `summary` et `reason` du serveur ; bloc masqué s'ils
// sont vides — rien n'est inventé côté interface.

export const LEVELS = {
  action: { label: 'Action', rank: 0 },
  a_lire: { label: 'À lire', rank: 1 },
  info:   { label: 'Info',   rank: 2 },
};

const SERVER_LEVELS = {
  action: 'action', 'a_lire': 'a_lire', 'a-lire': 'a_lire', 'à lire': 'a_lire', 'a lire': 'a_lire',
  read: 'a_lire', to_read: 'a_lire', info: 'info',
};

// Vraies mesures restrictives de l'UE (gel des avoirs), repérées par leur intitulé
// juridique — repli provisoire, en attendant `level`. « gel des avoirs » seul est
// exclu : il apparaît aussi dans des lignes directrices qui ne sont pas des mesures.
const RESTRICTIVE = /mesures restrictives|restrictive measures/i;

export function levelOf(a) {
  const fromServer = SERVER_LEVELS[String(a.level || '').trim().toLowerCase()];
  if (fromServer) return fromServer;
  const sev = String(a.severity || '').toLowerCase();
  if (RESTRICTIVE.test(a.title || '')) return 'action';
  if (a.has_impact && (sev === 'critical' || sev === 'high')) return 'action';
  if (sev === 'medium' || (a.has_impact && sev === 'low')) return 'a_lire';
  return 'info';
}

export function byLevelThenDate(a, b) {
  const d = LEVELS[levelOf(a)].rank - LEVELS[levelOf(b)].rank;
  if (d) return d;
  return String(b.published_at || '').localeCompare(String(a.published_at || ''));
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function shortDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function longDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function levelBadge(a) {
  const lv = levelOf(a);
  return `<span class="fil-level fil-level-${lv}">${LEVELS[lv].label}</span>`;
}

/**
 * Ligne de liste. `action` = { label, value } : la seule action visible.
 * `dateText` remplace la date affichée (ex. « traité le … »).
 */
export function renderRow(a, { action = null, dateText = null, selected = false } = {}) {
  const reason = (a.reason || '').trim();
  return `
    <article class="fil-row${selected ? ' is-selected' : ''}" data-id="${esc(a.id)}" tabindex="0" aria-label="${esc(a.title)}">
      <div class="fil-row-level">${levelBadge(a)}</div>
      <div class="fil-row-body">
        <h3 class="fil-row-title">${esc(a.title || 'Sans titre')}</h3>
        <div class="fil-row-meta">
          <span class="fil-row-source">${esc(a.source_name || '—')}</span>
          <span class="fil-row-date">${esc(dateText ?? shortDate(a.published_at))}</span>
        </div>
        ${reason ? `<div class="fil-row-reason">${esc(reason)}</div>` : ''}
      </div>
      ${action ? `<div class="fil-row-act"><button type="button" class="fil-btn fil-btn-primary" data-action="${esc(action.value)}" data-id="${esc(a.id)}">${esc(action.label)}</button></div>` : ''}
    </article>`;
}

/**
 * Détail : résumé, raison, « Texte officiel → », puis les autres actions.
 * `actions` = [{ label, value, primary? }].
 */
export function renderDetail(a, { actions = [] } = {}) {
  const summary = (a.summary || '').trim();
  const reason = (a.reason || '').trim();
  return `
    <div class="fil-detail-inner">
      <button type="button" class="fil-detail-back" data-close-detail>← Retour</button>
      <div class="fil-detail-top">${levelBadge(a)}<span class="fil-detail-date">${esc(longDate(a.published_at))}</span></div>
      <h2 class="fil-detail-title">${esc(a.title || 'Sans titre')}</h2>
      <div class="fil-detail-source">${esc(a.source_name || '—')}</div>
      ${summary ? `<section class="fil-detail-block"><h3>Résumé</h3><p>${esc(summary)}</p></section>` : ''}
      ${reason ? `<section class="fil-detail-block"><h3>Pourquoi pour vous</h3><p>${esc(reason)}</p></section>` : ''}
      ${a.original_url ? `<a class="fil-detail-link" href="${esc(a.original_url)}" target="_blank" rel="noopener">Texte officiel →</a>` : ''}
      ${actions.length ? `<div class="fil-detail-actions">${actions.map((x) =>
        `<button type="button" class="fil-btn${x.primary ? ' fil-btn-primary' : ''}" data-action="${esc(x.value)}" data-id="${esc(a.id)}">${esc(x.label)}</button>`
      ).join('')}</div>` : ''}
    </div>`;
}
