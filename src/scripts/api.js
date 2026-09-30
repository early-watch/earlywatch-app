/* ================================================================
   Early Watch — Shared Application Logic
   ================================================================ */

export const API = (() => {
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h === '') {
    return 'http://127.0.0.1:8000';
  }
  return 'https://earlybriefp7hwqsga-earlybrief-api.functions.fnc.fr-par.scw.cloud';
})();

// Astro base path for page redirects
const BASE = import.meta.env.BASE_URL || '/earlywatch-app/';

// ---- Auth ----
export function getToken() {
  return sessionStorage.getItem('ew_token');
}
export function getUser() {
  const u = sessionStorage.getItem('ew_user');
  return u ? JSON.parse(u) : null;
}
// EB-MVP-002 — un compte sans abonnement actif n'accède pas au contenu : l'API répond
// 402 et l'interface envoie vers « Choisissez votre formule ». Le superadmin n'est
// jamais concerné. Statut lu dans ew_user (posé à la connexion).
export function hasInactiveSubscription(user = getUser()) {
  return !!user && user.role !== 'superadmin'
    && !!user.subscription_status && user.subscription_status !== 'active';
}
export function redirectToPlans() {
  window.location.href = BASE + 'choisir-formule';
}

export function requireAuth() {
  if (!getToken()) {
    window.location.href = BASE + 'login';
    return false;
  }
  if (hasInactiveSubscription()) {
    redirectToPlans();
    return false;
  }
  return true;
}

// ---- Client view auth ----
export function requireClientAuth() {
  if (!getToken()) {
    window.location.href = BASE + 'login';
    return false;
  }
  const user = getUser();
  if (!user || !['admin', 'reader', 'editor', 'superadmin'].includes(user.role)) {
    window.location.href = BASE + 'login';
    return false;
  }
  if (hasInactiveSubscription(user)) {
    redirectToPlans();
    return false;
  }
  return true;
}

// ---- Impersonation (sélecteur admin → vue client) ----
export function isImpersonating() {
  return !!sessionStorage.getItem('ew_token_original');
}

export function startImpersonation(impersonToken, impersonUser) {
  sessionStorage.setItem('ew_token_original', getToken() || '');
  sessionStorage.setItem('ew_user_original', sessionStorage.getItem('ew_user') || '{}');
  sessionStorage.setItem('ew_token', impersonToken);
  sessionStorage.setItem('ew_user', JSON.stringify(impersonUser));
}

export function stopImpersonation() {
  const originalToken = sessionStorage.getItem('ew_token_original');
  const originalUser  = sessionStorage.getItem('ew_user_original');
  if (originalToken) sessionStorage.setItem('ew_token', originalToken);
  if (originalUser)  sessionStorage.setItem('ew_user', originalUser);
  sessionStorage.removeItem('ew_token_original');
  sessionStorage.removeItem('ew_user_original');
}

export function logout() {
  sessionStorage.removeItem('ew_token');
  sessionStorage.removeItem('ew_user');
  sessionStorage.removeItem('ew_token_original');
  sessionStorage.removeItem('ew_user_original');
  window.location.href = BASE + 'login';
}

// ---- API helper ----
export async function api(path, opts = {}) {
  const token = getToken();
  const headers = { ...opts.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body && typeof opts.body === 'object') {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (res.status === 401) {
    logout();
    throw new Error('Session expirée');
  }
  if (res.status === 402) {
    // EB-MVP-002 — abonnement inactif : contenu refusé côté serveur.
    redirectToPlans();
    throw new Error('Abonnement inactif');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    const msg = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map(d => d.msg || JSON.stringify(d)).join(', ')
        : detail ? JSON.stringify(detail) : 'Erreur serveur';
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

// ---- Toast ----
export function toast(msg, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ---- Score helpers ----
export function scoreClass(score) {
  if (score == null) return 'score-low';
  if (score >= 80) return 'score-critical';
  if (score >= 50) return 'score-high';
  if (score >= 25) return 'score-med';
  return 'score-low';
}
export function scoreBar(score) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const cls = scoreClass(score);
  return `<div class="score-bar ${cls}"><div class="score-bar-fill" style="width:${pct}%"></div></div>`;
}

// ---- Date formatting ----
export function formatDate(d) {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function formatTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ---- Badge helpers ----
export function statusBadge(status) {
  const map = {
    nouveau: ['Nouveau', 'badge-neutral'],
    important: ['Important', 'badge-warning'],
    quotidien: ['Quotidien', 'badge-neutral'],
    hebdo: ['Hebdo', 'badge-neutral'],
    relu: ['Relu', 'badge-neutral'],
    archive: ['Archive', 'badge-neutral'],
    ignorer: ['Ignor\u00e9', 'badge-neutral'],
    pending_validation: ['Validation', 'badge-warning'],
    validated: ['Valid\u00e9', 'badge-success'],
    rejected: ['Rejet\u00e9', 'badge-danger'],
  };
  const [label, cls] = map[status] || [status, 'badge-neutral'];
  return `<span class="badge ${cls}">${label}</span>`;
}
export function actionBadge(type) {
  if (!type) return '';
  const map = {
    sanctions_update: 'Sanctions',
    doctrine_update: 'Doctrine',
    obligation_update: 'Obligations',
  };
  return `<span class="badge badge-accent">${map[type] || type}</span>`;
}

// ---- Simple Markdown renderer ----
export function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^---$/gm, '<hr>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      if (content.match(/^[\s\-|]+$/)) return '<!-- sep -->';
      const cells = content.split('|').map(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    });

  html = html.replace(/((?:<tr>.*<\/tr>\n?)+)/g, (m) => {
    const cleaned = m.replace(/<!-- sep -->\n?/g, '');
    const firstRowEnd = cleaned.indexOf('</tr>') + 5;
    const header = cleaned.slice(0, firstRowEnd).replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
    const rest = cleaned.slice(firstRowEnd);
    return `<table>${header}${rest}</table>`;
  });

  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  html = html.split('\n').map(line => {
    if (line.match(/^<(h[1-3]|ul|ol|li|table|tr|hr|!-)/)) return line;
    if (line.trim() === '') return '';
    return `<p>${line}</p>`;
  }).join('\n');

  return html;
}

// ---- Expandable sections ----
export function initExpandables() {
  document.querySelectorAll('.expandable-header').forEach(h => {
    h.addEventListener('click', () => {
      h.closest('.expandable').classList.toggle('open');
    });
  });
}

// ---- Reminder badge (nav) ----
// Utilise fetch() brut — PAS api() — pour éviter que logout() soit appelé
// sur un 401 et navigue vers /login en plein vol d'une requête parallèle.
// Race condition documentée INV-011 : Nav badge 401 → logout() →
// window.location.href → abort fetch en cours → "Failed to fetch".
export async function loadReminderBadge() {
  try {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API}/api/v1/reminders/counts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return; // silently ignore — ne jamais logout depuis un widget nav
    const counts = await res.json();
    const total = (counts.critical || 0) + (counts.high || 0) + (counts.medium || 0);
    const badge = document.getElementById('nav-badge-ctrl');
    if (badge && total > 0) {
      badge.textContent = total > 99 ? '99+' : total;
      badge.style.display = 'inline-flex';
    }
  } catch (_) { /* silently ignore */ }
}
