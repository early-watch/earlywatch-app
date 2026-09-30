// Réglage central des pages de l'espace client (MVP).
//
// `menu: true`  → page visible, affichée dans le menu (dans l'ordre de la liste).
// `menu: false` → page masquée : absente du menu, et son adresse redirige vers la
//                 page d'accueil (ClientLayout). Le code de la page est conservé ;
//                 pour la réactiver, repasser `menu` à true.
export interface ClientPage {
  key: string;      // identique à la prop `activePage` de ClientLayout
  path: string;     // chemin sous le base Astro
  label: string;
  menu: boolean;
}

export const CLIENT_PAGES: ClientPage[] = [
  // Menu MVP
  { key: 'veille',           path: 'app/veille',           label: 'Fil',                    menu: true },
  { key: 'calendrier',       path: 'app/calendrier',       label: 'Calendrier',             menu: true },
  { key: 'suivis',           path: 'app/suivis',           label: 'Suivis',                 menu: true },
  { key: 'parametres',       path: 'app/parametres',       label: 'Paramètres',             menu: true },
  // Hors MVP — masquées
  { key: 'tableau-de-bord',  path: 'app/tableau-de-bord',  label: 'Tableau de bord',        menu: false },
  { key: 'tracker',          path: 'app/tracker',          label: 'Registre réglementaire', menu: false },
  { key: 'feuille-de-route', path: 'app/feuille-de-route', label: 'Feuille de route',       menu: false },
  { key: 'procedures',       path: 'app/procedures',       label: 'Mes procédures',         menu: false },
  { key: 'fiches-reflexes',  path: 'app/fiches-reflexes',  label: 'Fiches réflexes',        menu: false },
  { key: 'pays-risque',      path: 'app/pays-risque',      label: 'Pays à risque',          menu: false },
];

export const MENU_PAGES = CLIENT_PAGES.filter((p) => p.menu);

// Page d'accueil de l'espace client : première page du menu.
export const HOME_PAGE = MENU_PAGES[0];

export function isHidden(key: string): boolean {
  const page = CLIENT_PAGES.find((p) => p.key === key);
  return page ? !page.menu : false;
}
