// Fil et Suivis (MVP) — niveau, ligne et détail d'une publication.
//
// Niveau : lu dans `level` fourni par le serveur (GET /api/v1/app/articles).
// Tant que le serveur ne le fournit pas, règle PROVISOIRE (même règle que le
// serveur) : Action = mesure restrictive (gel des avoirs), ou has_impact avec
// gravité critical/high ; À lire = gravité medium, ou has_impact en low ;
// Info = le reste.
// Résumé et raison : champs `summary` et `reason` du serveur ; bloc masqué s'ils
// sont vides — rien n'est inventé côté interface.
// Qui a traité quoi : `state_by_name` et `state_at` (dernier changement d'état,
// journal serveur) → « Suivi par … le JJ/MM » / « Traité par … » / « Ignoré par … ».
// Rien si l'article n'a jamais changé d'état (ou est revenu dans le Fil).

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

const STATE_VERBS = { to_process: 'Suivi', read: 'Traité', ignored: 'Ignoré' };

export function dayMonth(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/** « Traité par Camille Martin le 01/10 », ou '' (jamais changé, ou revenu dans le Fil). */
export function stateText(a) {
  const verb = STATE_VERBS[a.client_status];
  const who = String(a.state_by_name || '').trim();
  if (!verb || !who || !a.state_at) return '';
  return `${verb} par ${who} le ${dayMonth(a.state_at)}`;
}

function stateLine(a, cls) {
  const t = stateText(a);
  return t ? `<div class="${cls}">${esc(t)}</div>` : '';
}

/**
 * Message de confirmation avec « Annuler » (quelques secondes), dans la pile des
 * messages de api.js (.toast-container). `onUndo` est appelé au clic sur « Annuler ».
 */
export function undoToast(message, onUndo, ms = 6000) {
  let box = document.querySelector('.toast-container');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toast-container';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast toast-success fil-undo';
  el.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = `${message} · `;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fil-undo-btn';
  btn.textContent = 'Annuler';
  let done = false;
  const close = () => { if (!done) { done = true; el.remove(); } };
  btn.addEventListener('click', () => { if (done) return; close(); onUndo(); });
  el.append(text, btn);
  box.appendChild(el);
  setTimeout(close, ms);
  return el;
}

export function levelBadge(a) {
  const lv = levelOf(a);
  return `<span class="fil-level fil-level-${lv}">${LEVELS[lv].label}</span>`;
}

/**
 * Ligne de liste. `action` = { label, value } : la seule action visible, en bouton
 * discret (contour gris) ; la couleur pleine est réservée au détail et au badge Action.
 * `dateText` remplace la date affichée (ex. « traité le … »).
 */
/** Titre affiché : `display_title` (titre nettoyé par l'API), sinon le titre d'origine.
 *  Le niveau provisoire (levelOf) reste calculé sur le titre d'origine. */
export function titleOf(a) {
  return a.display_title || a.title || 'Sans titre';
}

export function renderRow(a, { action = null, dateText = null, selected = false } = {}) {
  const reason = (a.reason || '').trim();
  return `
    <article class="fil-row${selected ? ' is-selected' : ''}" data-id="${esc(a.id)}" tabindex="0" aria-label="${esc(titleOf(a))}">
      <div class="fil-row-level">${levelBadge(a)}</div>
      <div class="fil-row-body">
        <h3 class="fil-row-title">${esc(titleOf(a))}</h3>
        ${stateLine(a, 'fil-row-state')}
        <div class="fil-row-meta">
          <span class="fil-row-source">${esc(a.source_name || '—')}</span>
          <span class="fil-row-date">${esc(dateText ?? shortDate(a.published_at))}</span>
        </div>
        ${reason ? `<div class="fil-row-reason">${esc(reason)}</div>` : ''}
      </div>
      ${action ? `<div class="fil-row-act"><button type="button" class="fil-btn" data-action="${esc(action.value)}" data-id="${esc(a.id)}">${esc(action.label)}</button></div>` : ''}
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
      <h2 class="fil-detail-title">${esc(titleOf(a))}</h2>
      ${stateLine(a, 'fil-detail-state')}
      <div class="fil-detail-source">${esc(a.source_name || '—')}</div>
      ${summary ? `<section class="fil-detail-block"><h3>Résumé</h3><p>${esc(summary)}</p></section>` : ''}
      ${reason ? `<section class="fil-detail-block"><h3>Pourquoi pour vous</h3><p>${esc(reason)}</p></section>` : ''}
      ${a.original_url ? `<a class="fil-detail-link" href="${esc(a.original_url)}" target="_blank" rel="noopener">Texte officiel →</a>` : ''}
      ${actions.length ? `<div class="fil-detail-actions">${actions.map((x) =>
        `<button type="button" class="fil-btn${x.primary ? ' fil-btn-primary' : ''}" data-action="${esc(x.value)}" data-id="${esc(a.id)}">${esc(x.label)}</button>`
      ).join('')}</div>` : ''}
    </div>`;
}
