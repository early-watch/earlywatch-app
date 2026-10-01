// Noms des formules (décisions des 30/09 et 01/10/2026). Codes techniques inchangés ;
// mêmes libellés que app/core/billing_plans.py (GET /api/v1/billing/plans).
// Professions non financières : pnf (1 utilisateur), cabinet (jusqu'à 5).
// Établissements financiers et consultants : solo (1 utilisateur), equipe (jusqu'à 10).
export const PLAN_LABELS = {
  pnf: 'Professions non financières',
  cabinet: 'Cabinet',
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
