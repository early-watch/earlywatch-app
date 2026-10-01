// Noms des formules (décision du 30/09/2026). Codes techniques inchangés ; même
// libellés que app/core/billing_plans.py (GET /api/v1/billing/plans).
export const PLAN_LABELS = {
  pnf: 'Professions non financières',
  solo: 'Responsable LCB-FT',
  equipe: 'Équipe',
};

// Anciennes valeurs (tenants onboardés avant le lot 3) : affichées telles quelles.
const LEGACY_LABELS = { demo: 'Demo', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };

export function planLabel(code) {
  if (!code) return LEGACY_LABELS.demo;
  return PLAN_LABELS[code] || LEGACY_LABELS[code] || code;
}

export function isPaidPlan(code) {
  return Object.prototype.hasOwnProperty.call(PLAN_LABELS, code);
}
