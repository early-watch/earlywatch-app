// node --test scripts/equipe.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seatsUsed, seatLimit, seatsLabel, fullMessage, isInvited, usersSectionHtml } from '../src/scripts/equipe.js';

const U = [
  { id: 'a', first_name: 'Jeanne', last_name: 'Martin', email: 'j@x.fr', role: 'admin', last_login_at: '2026-10-01T08:00:00Z' },
  { id: 'b', first_name: 'Paul', last_name: 'Durand', email: 'p@x.fr', role: 'reader', last_login_at: null },
  { id: 's', email: 'ops@early', role: 'superadmin', last_login_at: null },
];

test('places comptées comme le serveur : actifs, hors superadmin', () => {
  assert.equal(seatsUsed(U), 2);
  assert.equal(seatsUsed([...U, { id: 'c', role: 'reader', is_active: false }]), 2);
});

test('limite : max_users du statut, sinon de la formule, sinon aucune', () => {
  assert.equal(seatLimit({ max_users: 5, plan: 'solo' }, [{ code: 'solo', max_users: 1 }]), 5);
  assert.equal(seatLimit({ plan: 'equipe' }, [{ code: 'solo', max_users: 1 }, { code: 'equipe', max_users: 10 }]), 10);
  assert.equal(seatLimit({ plan: null }, [{ code: 'solo', max_users: 1 }]), null);
  assert.equal(seatLimit(null, null), null);
});

test('libellés', () => {
  assert.equal(seatsLabel(3, 10), '3 / 10 utilisateurs');
  assert.equal(seatsLabel(1, 1), '1 / 1 utilisateur');
  assert.equal(seatsLabel(2, null), '2 utilisateurs');
  assert.equal(fullMessage(1, 'solo'), 'Votre formule comprend 1 utilisateur. Passez à Équipe pour inviter des collègues');
  assert.match(fullMessage(10, 'equipe'), /Les 10 places/);
});

test('invitation en attente : jamais connecté, pas soi-même', () => {
  assert.equal(isInvited(U[1], 'a'), true);
  assert.equal(isInvited(U[0], 'a'), false);
});

test('admin : compteur, Renvoyer, Retirer sauf sur sa ligne et le superadmin', () => {
  const h = usersSectionHtml({ users: U, meId: 'a', admin: true, limit: 10, plan: 'equipe' });
  assert.match(h, /2 \/ 10 utilisateurs/);
  assert.match(h, /data-resend="b"/);
  assert.match(h, /data-remove="b"/);
  assert.doesNotMatch(h, /data-remove="a"/);
  assert.doesNotMatch(h, /data-remove="s"/);
  assert.doesNotMatch(h, /disabled/);
});

test('places pleines : bouton désactivé et message', () => {
  const h = usersSectionHtml({ users: U.slice(0, 1), meId: 'a', admin: true, limit: 1, plan: 'solo', upgradeHref: '#' });
  assert.match(h, /id="pm-invite-open" disabled/);
  assert.match(h, /Passez à Équipe pour inviter des collègues/);
  assert.match(h, /data-upgrade/);
});

test('confirmation de retrait', () => {
  const h = usersSectionHtml({ users: U, meId: 'a', admin: true, limit: 10, plan: 'equipe', confirmId: 'b' });
  assert.match(h, /Retirer Paul Durand \?/);
  assert.match(h, /data-remove-confirm="b"/);
});

test('non administrateur : lecture seule', () => {
  const h = usersSectionHtml({ users: U, meId: 'b', admin: false });
  assert.doesNotMatch(h, /pm-invite-open|data-remove|data-resend|pm-seats/);
});

test('échappement', () => {
  const h = usersSectionHtml({ users: [{ id: 'x', first_name: '<b>', email: 'a"b@x.fr', role: 'reader' }], meId: 'a', admin: true });
  assert.doesNotMatch(h, /<b>/);
});
