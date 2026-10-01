/* ================================================================
   EB-CAL-001 v0 — Calendrier réglementaire (données statiques)
   ----------------------------------------------------------------
   Source de vérité : les deux tranches vérifiées par Maria (07/08/2026)
     - EB-CAL-001-tranche-AMLR-AMLA-jet1.md
     - EB-CAL-001-tranche-MiCA-CASP-FR-jet1.md
   Chaque entrée est reprise TELLE QUELLE des tableaux vérifiés.
   Aucune date n'est ajoutée ou reconstituée ; les libellés de date flous
   ("fin septembre 2026", "2028"…) sont conservés à l'identique.

   EXCLU du v0 : la ligne RTS « ~10 juillet 2026 » (non vérifiée, en attente
   de fact-check mesure par mesure — décision Maria).

   Les URL de source pointent l'acte/l'autorité cité dans la colonne "Source"
   (permalien ELI EUR-Lex pour les règlements, site officiel sinon).
   ================================================================ */

export type Registre = 'a_venir' | 'en_vigueur';
/**
 * Périmètre de l'entrée (filtre par profil) :
 *   'tous'      — toutes les entités assujetties, professions non financières comprises ;
 *   'financier' — secteur financier seulement (ex. sélection pour la supervision directe AMLA) ;
 *   'etat'      — l'État / le superviseur : effet indirect, affiché seulement sans profil choisi ;
 *   string[]    — profils précis (identifiants de app/core/profiles.py).
 * Validé par Maria le 01/10/2026 (EB-CAL-001).
 */
export type Perimetre = 'tous' | 'financier' | 'etat' | string[];

export interface EntreeCalendrier {
  /** Libellé de date exact de la source (aucune date ajoutée). */
  date: string;
  /** Obligation / jalon, repris tel quel. */
  obligation: string;
  /** Périmètre (voir Perimetre). */
  perimetre: Perimetre;
  /** Acte(s) de référence. */
  acte: string;
  /** Registre d'affichage : à venir (deadline board) ou déjà en vigueur (contexte). */
  registre: Registre;
  /** Statut au 07/08/2026 (colonne source). */
  statut: string;
  /** Lien vers la source officielle. */
  source_url: string;
  /** Nuance / précision de périmètre. */
  note: string;
}

/* URL officielles réutilisées (permaliens ELI pour EUR-Lex). */
const URL = {
  amlr: 'https://eur-lex.europa.eu/eli/reg/2024/1624/oj',   // AMLR — Règlement (UE) 2024/1624
  amla: 'https://www.amla.europa.eu/',                       // AMLA — autorité
  mica: 'https://eur-lex.europa.eu/eli/reg/2023/1114/oj',   // MiCA — Règlement (UE) 2023/1114
  esma: 'https://www.esma.europa.eu/',
  amf: 'https://www.amf-france.org/',
} as const;

/**
 * Entrées dans l'ordre chronologique de la source (préservé pour l'affichage).
 * Tranche AMLR/AMLA puis tranche MiCA-CASP + transposition FR.
 */
export const calendrier: EntreeCalendrier[] = [
  // ---- Tranche AMLR / AMLA ----
  {
    date: '9 juillet 2024',
    obligation: 'Entrée en vigueur du paquet AMLR + AMLD6',
    perimetre: 'tous',
    acte: 'Règlement (UE) 2024/1624 · Directive (UE) 2024/1640',
    registre: 'en_vigueur',
    statut: 'En vigueur',
    source_url: URL.amlr,
    note: '',
  },
  {
    date: '1er juillet 2025',
    obligation: 'AMLA opérationnelle (siège Francfort)',
    perimetre: 'tous',
    acte: 'Règlement (UE) 2024/1620',
    registre: 'en_vigueur',
    statut: 'Applicable',
    source_url: URL.amla,
    note: 'Supervision indirecte au départ.',
  },
  {
    date: '15 août 2026',
    obligation:
      "Superviseurs nationaux transmettent à AMLA les données d'identification des entités provisoirement éligibles à la supervision directe",
    perimetre: 'financier',
    acte: 'Règlement (UE) 2024/1620',
    registre: 'a_venir',
    statut: 'Imminent',
    source_url: URL.amla,
    note:
      "Concerne uniquement les entités susceptibles de sélection (grands établissements transfrontaliers CASP/PSP/EME présents dans ≥ 6 États membres) — pas tous les établissements.",
  },
  {
    date: 'fin septembre 2026',
    obligation: 'AMLA finalise la liste provisoire des entités éligibles',
    perimetre: 'financier',
    acte: 'Règlement (UE) 2024/1620',
    registre: 'a_venir',
    statut: 'À venir',
    source_url: URL.amla,
    note:
      'Concerne uniquement les entités susceptibles de sélection (grands transfrontaliers ≥ 6 États membres).',
  },
  {
    date: 'janvier–mars 2027',
    obligation: 'Collecte de données pour la sélection définitive',
    perimetre: 'financier',
    acte: 'Règlement (UE) 2024/1620',
    registre: 'a_venir',
    statut: 'À venir',
    source_url: URL.amla,
    note: 'Entités susceptibles de sélection.',
  },
  {
    date: '10 juillet 2027',
    obligation:
      "Application de l'AMLR (obligations de fond : CDD, bénéficiaires effectifs, monitoring, reporting) + date limite de transposition de l'AMLD6",
    perimetre: 'tous',
    acte: 'Règlement (UE) 2024/1624 · Directive (UE) 2024/1640',
    registre: 'a_venir',
    statut: 'À venir',
    source_url: URL.amlr,
    note: 'Échéance structurante : concerne TOUS les établissements (CASP, PSP, EME inclus).',
  },
  {
    date: '10 octobre 2027',
    obligation:
      'Notification par les États membres à la Commission des exemptions en place au 10/07/2027',
    perimetre: 'etat',
    acte: 'Règlement (UE) 2024/1624',
    registre: 'a_venir',
    statut: 'À venir',
    source_url: URL.amlr,
    note: "Concerne l'État / le superviseur — effet indirect pour les établissements.",
  },
  {
    date: 'fin 2027',
    obligation: 'Communication de la sélection définitive (~40 entités)',
    perimetre: 'financier',
    acte: 'Règlement (UE) 2024/1620',
    registre: 'a_venir',
    statut: 'À venir',
    source_url: URL.amla,
    note: 'Entités sélectionnées (CASP explicitement dans le champ).',
  },
  {
    date: '2028',
    obligation:
      'AMLA démarre la supervision directe des entités sélectionnées (≈ 6 mois après publication de la liste ; pas forcément le 1er janvier)',
    perimetre: 'financier',
    acte: 'Règlement (UE) 2024/1620',
    registre: 'a_venir',
    statut: 'À venir',
    source_url: URL.amla,
    note:
      'Concerne uniquement les entités susceptibles de sélection : jusqu’à ~40 entités sélectionnées (grands CASP/PSP/EME transfrontaliers à haut risque).',
  },
  {
    date: '10 juillet 2029',
    obligation:
      'Application différée de certaines dispositions (clubs/agents de football)',
    perimetre: ['agent_sportif'],
    acte: 'Règlement (UE) 2024/1624 · Directive (UE) 2024/1640',
    registre: 'a_venir',
    statut: 'À venir',
    source_url: URL.amlr,
    note: 'Secteurs spécifiques (peu pertinent pour le cœur LCB-FT).',
  },

  // ---- Tranche MiCA-CASP + transposition FR (contexte, déjà en vigueur) ----
  {
    date: '30 décembre 2024',
    obligation:
      'MiCA pleinement applicable aux prestataires de services sur crypto-actifs (régime CASP/PSCA)',
    perimetre: ['casp'],
    acte: 'Règlement (UE) 2023/1114',
    registre: 'en_vigueur',
    statut: 'En vigueur',
    source_url: URL.esma,
    note: '',
  },
  {
    date: '1er juillet 2026',
    obligation:
      "Fin de la période transitoire (grandfathering, art. 143(3)) — plafond UE, sans extension. En France : fin du régime PSAN. Seuls les PSCA agréés MiCA (ou notifiants art. 60) peuvent opérer",
    perimetre: ['casp'],
    acte: 'Règlement (UE) 2023/1114 · ordonnance 2024-936',
    registre: 'en_vigueur',
    statut: 'Échu (~5 semaines)',
    source_url: URL.esma,
    note: 'Transition PSAN → PSCA terminée.',
  },
  {
    date: 'Depuis le 1er juillet 2026',
    obligation:
      'Exercice de services crypto = agrément PSCA obligatoire ; sortie ordonnée pour les non-agréés (plans de wind-down ESMA)',
    perimetre: ['casp'],
    acte: 'Règlement (UE) 2023/1114',
    registre: 'en_vigueur',
    statut: 'Applicable',
    source_url: URL.esma,
    note: 'Communication ESMA du 17/04/2026 (état continu).',
  },
];
