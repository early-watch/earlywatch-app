// Ressorts proposés à l'inscription (liste déroulante), par profil.
// Valeur = identifiant `ressort` des sources locales (config/sources_pnf.yaml,
// repo earlybrief-platform) : le serveur abonne le nouveau tenant aux sources dont
// le ressort est identique (source_audiences.source_matches). Une saisie libre
// (« Barreau de Lyon ») ne correspondrait à aucune source.
// À tenir à jour à chaque ajout de source locale.
export const RESSORTS: Record<string, { value: string; label: string }[]> = {
  avocat: [
    { value: 'barreau-aix-en-provence', label: 'Aix-en-Provence' },
    { value: 'barreau-arras', label: 'Arras' },
    { value: 'barreau-avignon', label: 'Avignon' },
    { value: 'barreau-bastia', label: 'Bastia' },
    { value: 'barreau-belfort', label: 'Belfort' },
    { value: 'barreau-bonneville', label: 'Bonneville et des Pays du Mont-Blanc' },
    { value: 'barreau-cambrai', label: 'Cambrai' },
    { value: 'barreau-chambery', label: 'Chambéry' },
    { value: 'barreau-charente', label: 'Charente' },
    { value: 'barreau-clermont-ferrand', label: 'Clermont-Ferrand' },
    { value: 'barreau-drome', label: 'Drôme' },
    { value: 'barreau-essonne', label: 'Essonne' },
    { value: 'barreau-fontainebleau', label: 'Fontainebleau' },
    { value: 'barreau-grenoble', label: 'Grenoble' },
    { value: 'barreau-haute-loire', label: 'Haute-Loire' },
    { value: 'barreau-la-rochelle-rochefort', label: 'La Rochelle-Rochefort' },
    { value: 'barreau-lisieux', label: 'Lisieux' },
    { value: 'barreau-lyon', label: 'Lyon' },
    { value: 'barreau-macon', label: 'Mâcon' },
    { value: 'barreau-marseille', label: 'Marseille' },
    { value: 'barreau-metz', label: 'Metz' },
    { value: 'barreau-mulhouse', label: 'Mulhouse' },
    { value: 'barreau-nancy', label: 'Nancy' },
    { value: 'barreau-nimes', label: 'Nîmes' },
    { value: 'barreau-paris', label: 'Paris' },
    { value: 'barreau-reims', label: 'Reims' },
    { value: 'barreau-saint-quentin', label: 'Saint-Quentin' },
    { value: 'barreau-toulon', label: 'Toulon' },
    { value: 'barreau-vannes', label: 'Vannes' },
    { value: 'barreau-villefranche-sur-saone', label: 'Villefranche-sur-Saône' },
  ],
  notaire: [
    { value: 'notaires-alpes-maritimes', label: 'Alpes-Maritimes' },
    { value: 'notaires-cin-lyon', label: 'Cour d\'appel de Lyon' },
    { value: 'notaires-gironde', label: 'Gironde' },
    { value: 'notaires-picardie', label: 'Picardie' },
  ],
  expert_comptable: [
    { value: 'croec-auvergne-rhone-alpes', label: 'Auvergne-Rhône-Alpes' },
    { value: 'croec-centre-val-de-loire', label: 'Centre-Val de Loire' },
    { value: 'croec-ile-de-france', label: 'Île-de-France' },
    { value: 'croec-normandie', label: 'Normandie' },
    { value: 'croec-nouvelle-aquitaine', label: 'Nouvelle-Aquitaine' },
    { value: 'croec-paca', label: 'Provence-Alpes-Côte d\'Azur' },
  ],
  commissaire_aux_comptes: [
    { value: 'crcc-ouest-atlantique', label: 'Ouest-Atlantique' },
    { value: 'crcc-paris', label: 'Paris' },
  ],
};

/** Libellé d'un ressort enregistré (identifiant), sinon la valeur telle quelle. */
export function ressortLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  for (const list of Object.values(RESSORTS)) {
    const r = list.find((x) => x.value === value);
    if (r) return r.label;
  }
  return value;
}
