// Paramètres > Utilisateurs (gestion par l'administrateur du compte).
//
// API (earlybrief-platform, app/api/v1/tenants.py, #291) :
//   GET    /api/v1/tenants/{slug}/users                  → {users, seats_used, seats_max, plan}
//   POST   /api/v1/tenants/{slug}/users                  → invitation (sans mot de passe) ; invitation_sent
//   POST   /api/v1/tenants/{slug}/users/{id}/invitation  → renvoi ; {invitation_sent}
//   DELETE /api/v1/tenants/{slug}/users/{id}             → retrait (le dernier admin est protégé)
// Places : seats_used / seats_max du serveur. Repli (ancienne réponse en liste) :
// comptage identique au serveur (actifs, hors superadmin) et max_users de la formule
// (GET /billing/plans) ; aucune limite pour une formule hors catalogue.

export const ROLE_LABELS = { admin: 'Administrateur', editor: 'Éditeur', reader: 'Lecteur', superadmin: 'Early Watch' };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ');

export function seatsUsed(users) {
  return (users || []).filter((u) => u.role !== 'superadmin' && u.is_active !== false).length;
}

/** Réponse de GET /tenants/{slug}/users : objet (#291) ou ancienne liste. */
export function parseTeam(res) {
  if (Array.isArray(res)) return { users: res, used: null, limit: undefined };
  if (res && Array.isArray(res.users)) {
    return {
      users: res.users,
      used: Number.isInteger(res.seats_used) ? res.seats_used : null,
      limit: Number.isInteger(res.seats_max) ? res.seats_max : (res.seats_max === null ? null : undefined),
    };
  }
  return null;
}

export function seatLimit(billing, plans) {
  if (billing && Number.isInteger(billing.max_users)) return billing.max_users;
  const code = billing && billing.plan;
  const p = (Array.isArray(plans) ? plans : []).find((x) => x.code === code);
  return p && Number.isInteger(p.max_users) ? p.max_users : null;
}

export function seatsLabel(used, limit) {
  const n = limit ?? used;
  const unit = n > 1 ? 'utilisateurs' : 'utilisateur';
  return limit == null ? `${used} ${unit}` : `${used} / ${limit} ${unit}`;
}

// Formule supérieure de la même ligne (grille du 01/10/2026) :
// professions non financières pnf → pnf_cabinet ; établissements financiers solo → equipe.
export const UPGRADES = {
  pnf: { code: 'pnf_cabinet', text: 'Passez à la formule Cabinet' },
  solo: { code: 'equipe', text: 'Passez à Équipe' },
};

/** Message affiché quand toutes les places sont prises. */
export function fullMessage(limit, plan) {
  const up = UPGRADES[plan];
  if (!up) {
    return `Les ${limit} places de votre formule sont occupées. Retirez un utilisateur pour en inviter un autre.`;
  }
  return `Votre formule comprend ${limit} utilisateur${limit > 1 ? 's' : ''}. ${up.text} pour inviter des collègues`;
}

/** Jamais connecté (et pas soi-même) : invitation en attente. */
export const isInvited = (u, meId) => !u.last_login_at && u.id !== meId;

function lastLoginCell(u, meId, admin) {
  if (u.last_login_at) return esc(date(u.last_login_at));
  if (!admin || u.id === meId) return 'Jamais';
  return `Invitation envoyée · <button type="button" class="pm-link" data-resend="${esc(u.id)}">Renvoyer</button>`;
}

function actionsCell(u, meId, confirmId) {
  if (u.id === meId || u.role === 'superadmin') return '';
  if (confirmId === u.id) {
    return `<span class="pm-confirm">Retirer ${esc(fullName(u) || u.email)} ?
      <button type="button" class="pm-link pm-danger" data-remove-confirm="${esc(u.id)}">Confirmer</button>
      <button type="button" class="pm-link" data-remove-cancel>Annuler</button></span>`;
  }
  return `<button type="button" class="pm-link" data-remove="${esc(u.id)}">Retirer</button>`;
}

export function inviteFormHtml() {
  return `
    <form class="pm-invite" id="pm-invite-form" novalidate>
      <div class="pm-invite-grid">
        <label>Prénom<input class="pm-input" name="first_name" maxlength="100" autocomplete="off" required></label>
        <label>Nom<input class="pm-input" name="last_name" maxlength="100" autocomplete="off" required></label>
        <label class="pm-invite-wide">E-mail<input class="pm-input" type="email" name="email" autocomplete="off" required></label>
        <label>Rôle<select class="pm-input" name="role">
          <option value="reader" selected>Lecteur</option>
          <option value="admin">Administrateur</option>
        </select></label>
      </div>
      <div class="pm-hint">L’invité reçoit un e-mail pour choisir son mot de passe.</div>
      <div class="pm-invite-actions">
        <button class="pm-btn" type="submit">Envoyer l’invitation</button>
        <button class="pm-link" type="button" data-invite-cancel>Annuler</button>
      </div>
    </form>`;
}

/**
 * Section Utilisateurs.
 * opts : { users, meId, admin, limit, plan, confirmId, formOpen, upgradeHref }
 * Non administrateur : liste en lecture seule (sans compteur ni actions).
 */
export function usersSectionHtml(opts) {
  const { users = [], meId, admin, limit = null, plan = null, confirmId = null, formOpen = false, upgradeHref = '', used: usedFromServer = null } = opts;
  const used = Number.isInteger(usedFromServer) ? usedFromServer : seatsUsed(users);
  const full = limit != null && used >= limit;
  const head = admin
    ? `<div class="pm-users-head"><span class="pm-seats" id="pm-seats">${esc(seatsLabel(used, limit))}</span>
         <button type="button" class="pm-btn" id="pm-invite-open" ${full || formOpen ? 'disabled' : ''}>Ajouter un utilisateur</button></div>`
    : '';
  const fullNote = admin && full
    ? `<div class="pm-hint pm-full" id="pm-full">${esc(fullMessage(limit, plan))}${UPGRADES[plan] ? ` — <a href="${esc(upgradeHref)}" data-upgrade>gérer l’abonnement</a>.` : ''}</div>`
    : '';
  const rows = users.map((u) => `
    <tr data-user="${esc(u.id)}">
      <td>${esc(fullName(u) || '—')}${u.id === meId ? '<span class="pm-tag">vous</span>' : ''}</td>
      <td class="pm-email">${esc(u.email)}</td>
      <td class="pm-nowrap">${ROLE_LABELS[u.role] || esc(u.role)}</td>
      <td class="pm-nowrap pm-last">${lastLoginCell(u, meId, admin)}</td>
      ${admin ? `<td class="pm-act">${actionsCell(u, meId, confirmId)}</td>` : ''}
    </tr>`).join('');
  return `
    <h2 class="pm-h2">Utilisateurs</h2>
    ${head}${fullNote}
    ${admin && formOpen ? inviteFormHtml() : ''}
    <table class="pm-users">
      <thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Dernière connexion</th>${admin ? '<th><span class="pm-sr">Actions</span></th>' : ''}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}
