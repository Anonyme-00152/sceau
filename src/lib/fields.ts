// Catalogue des champs d'un dossier client. Partagé entre serveur et navigateur :
// il ne contient que des métadonnées, jamais de valeurs.
//
// Les rubriques sont rangées en modules, activables par la direction selon le métier
// (cabinet, agence, banque privée, EHPAD…) : on ne collecte que ce dont on a besoin.
//
// Volontairement absents : origine, religion, opinions politiques ou syndicales,
// orientation sexuelle, condamnations. Le RGPD (art. 9 et 10) en interdit la collecte
// dans un fichier client ordinaire.

export type ClientKindLite = "particulier" | "entreprise";
export type FieldType = "text" | "date" | "email" | "tel" | "select" | "textarea" | "number" | "yesno";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  /** Masqué par défaut, révélation journalisée. */
  sensitive?: boolean;
  /** Exige une élévation (code à usage unique) et un rôle autorisé. */
  critical?: boolean;
  multiline?: boolean;
  placeholder?: string;
  wide?: boolean;
};

export type ModuleId = "essentiel" | "pro" | "entreprise" | "finances" | "proches" | "sante" | "juridique" | "rgpd";

export type SectionDef = {
  id: string;
  label: string;
  module: ModuleId;
  /** Rubrique réservée à un type de client. */
  kinds?: ClientKindLite[];
  fields: FieldDef[];
};

export const MODULES: { id: ModuleId; label: string; description: string; locked?: boolean; defaultOn: boolean }[] = [
  { id: "essentiel", label: "Essentiel", description: "Identité, pièces officielles, coordonnées, notes.", locked: true, defaultOn: true },
  { id: "rgpd", label: "Conformité RGPD", description: "Base légale, information de la personne, durée de conservation.", locked: true, defaultOn: true },
  { id: "pro", label: "Situation professionnelle", description: "Profession, employeur, statut, revenus.", defaultOn: true },
  { id: "entreprise", label: "Entreprise", description: "Forme juridique, SIREN, SIRET, TVA, NAF, dirigeant.", defaultOn: true },
  { id: "finances", label: "Finances", description: "Coordonnées bancaires, mandat SEPA, paiement, patrimoine.", defaultOn: true },
  { id: "proches", label: "Proches et représentants", description: "Personne de confiance, contact d'urgence, représentant légal.", defaultOn: true },
  { id: "juridique", label: "Situation juridique", description: "Mesure de protection, régime matrimonial, notaire, avocat.", defaultOn: true },
  {
    id: "sante",
    label: "Santé et autonomie",
    description: "Pour les EHPAD et structures médico-sociales : sécurité sociale, autonomie (GIR), traitements.",
    defaultOn: false,
  },
];

export const DEFAULT_MODULES = MODULES.filter((m) => m.defaultOn).map((m) => m.id);

// Raccourcis de déclaration.
const t = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: "text", ...extra });
const sel = (key: string, label: string, options: string[], extra: Partial<FieldDef> = {}): FieldDef => ({
  key,
  label,
  type: "select",
  options,
  ...extra,
});
const long = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({
  key,
  label,
  type: "textarea",
  multiline: true,
  wide: true,
  ...extra,
});
const yes = (key: string, label: string): FieldDef => ({ key, label, type: "yesno", options: ["Oui", "Non"] });
const S = { sensitive: true } as const;
const C = { sensitive: true, critical: true } as const;

export const SECTIONS: SectionDef[] = [
  {
    id: "identite",
    label: "Identité",
    module: "essentiel",
    fields: [
      sel("civilite", "Civilité", ["Mme", "M.", "Mx", "Non précisé"]),
      t("prenom", "Prénom"),
      t("autresPrenoms", "Autres prénoms"),
      t("nom", "Nom d'usage"),
      t("nomNaissance", "Nom de naissance"),
      sel("sexe", "Sexe", ["Féminin", "Masculin", "Autre", "Non précisé"]),
      { key: "dateNaissance", label: "Date de naissance", type: "date", ...S },
      t("lieuNaissance", "Lieu de naissance", S),
      t("paysNaissance", "Pays de naissance"),
      t("nationalite", "Nationalité"),
      sel("situationFamiliale", "Situation familiale", [
        "Célibataire",
        "Marié·e",
        "Pacsé·e",
        "En concubinage",
        "Séparé·e",
        "Divorcé·e",
        "Veuf·ve",
        "Non précisé",
      ]),
      { key: "enfantsACharge", label: "Enfants à charge", type: "number" },
      t("langue", "Langue parlée"),
    ],
  },
  {
    id: "pieces",
    label: "Pièces et numéros officiels",
    module: "essentiel",
    fields: [
      sel("pieceType", "Type de pièce", ["Carte d'identité", "Passeport", "Titre de séjour", "Permis de conduire", "Autre"]),
      t("pieceNumero", "Numéro de pièce", C),
      { key: "pieceDelivrance", label: "Délivrée le", type: "date" },
      { key: "pieceExpiration", label: "Expire le", type: "date" },
      t("pieceAutorite", "Autorité de délivrance"),
      t("numeroFiscal", "Numéro fiscal", C),
    ],
  },
  {
    id: "coordonnees",
    label: "Coordonnées",
    module: "essentiel",
    fields: [
      { key: "email", label: "E-mail", type: "email", ...S },
      { key: "emailSecondaire", label: "E-mail secondaire", type: "email", ...S },
      { key: "telephone", label: "Téléphone mobile", type: "tel", ...S },
      { key: "telephoneFixe", label: "Téléphone fixe", type: "tel", ...S },
      { key: "telephonePro", label: "Téléphone professionnel", type: "tel" },
      t("adresse", "Adresse", { ...S, wide: true }),
      t("complementAdresse", "Complément (bâtiment, étage, digicode)", S),
      t("codePostal", "Code postal"),
      t("villeAdresse", "Ville"),
      t("pays", "Pays"),
      t("adresseFacturation", "Adresse de facturation", { ...S, wide: true }),
      sel("canal", "Canal préféré", ["Téléphone", "E-mail", "SMS", "Courrier", "Rendez-vous", "Par un proche"]),
      t("horairesContact", "Horaires de contact"),
      yes("consentementContact", "Accepte d'être recontacté"),
    ],
  },
  {
    id: "pro",
    label: "Situation professionnelle",
    module: "pro",
    kinds: ["particulier"],
    fields: [
      t("profession", "Profession"),
      t("employeur", "Employeur"),
      sel("statutPro", "Statut", [
        "Salarié·e",
        "Indépendant·e",
        "Dirigeant·e",
        "Fonctionnaire",
        "Retraité·e",
        "Étudiant·e",
        "Sans emploi",
        "Autre",
      ]),
      t("revenus", "Revenus annuels", S),
    ],
  },
  {
    id: "entreprise",
    label: "Entreprise",
    module: "entreprise",
    kinds: ["entreprise"],
    fields: [
      t("raisonSociale", "Raison sociale"),
      sel("formeJuridique", "Forme juridique", ["SAS", "SASU", "SARL", "EURL", "SA", "SCI", "EI / micro-entreprise", "Association", "Autre"]),
      t("siren", "SIREN"),
      t("siret", "SIRET"),
      t("tvaIntracom", "N° de TVA intracommunautaire"),
      t("codeNaf", "Code NAF / APE"),
      t("capital", "Capital social"),
      { key: "dateCreation", label: "Date de création", type: "date" },
      t("dirigeant", "Dirigeant·e"),
      t("fonction", "Fonction de l'interlocuteur"),
      t("effectif", "Effectif"),
      t("chiffreAffaires", "Chiffre d'affaires"),
      t("secteur", "Secteur"),
      t("siteWeb", "Site web"),
    ],
  },
  {
    id: "finances",
    label: "Finances",
    module: "finances",
    fields: [
      t("iban", "IBAN", { ...C, wide: true }),
      t("bic", "BIC", S),
      t("banque", "Banque"),
      t("titulaireCompte", "Titulaire du compte", S),
      t("mandatSepa", "Référence du mandat SEPA"),
      { key: "mandatDate", label: "Mandat signé le", type: "date" },
      sel("modePaiement", "Mode de paiement", ["Prélèvement", "Virement", "Carte", "Chèque", "Espèces", "Autre"]),
      t("valeurContrat", "Valeur du contrat"),
      t("conditions", "Conditions de paiement"),
      t("plafond", "Plafond ou encours autorisé"),
      long("patrimoine", "Patrimoine déclaré", S),
    ],
  },
  {
    id: "proches",
    label: "Proches et représentants",
    module: "proches",
    kinds: ["particulier"],
    fields: [
      t("personneConfiance", "Personne de confiance (nom, téléphone)", { ...S, wide: true }),
      t("contactUrgence", "Contact d'urgence (nom, téléphone)", { ...S, wide: true }),
      t("representantLegal", "Représentant légal", S),
      sel("lienRepresentant", "Lien avec la personne", ["Tuteur·rice", "Curateur·rice", "Mandataire", "Parent", "Enfant", "Conjoint·e", "Autre"]),
      t("coordonneesRepresentant", "Coordonnées du représentant", { ...S, wide: true }),
    ],
  },
  {
    id: "sante",
    label: "Santé et autonomie",
    module: "sante",
    kinds: ["particulier"],
    fields: [
      t("numeroSecu", "N° de sécurité sociale", C),
      t("caisse", "Caisse d'assurance maladie"),
      t("mutuelle", "Complémentaire santé"),
      t("numeroAdherent", "N° d'adhérent", S),
      t("medecinTraitant", "Médecin traitant", S),
      t("allergies", "Allergies", S),
      long("traitements", "Traitements en cours", S),
      t("regimeAlimentaire", "Régime alimentaire"),
      sel("mobilite", "Mobilité", ["Autonome", "Aide ponctuelle", "Canne ou déambulateur", "Fauteuil roulant", "Alité·e"]),
      sel("gir", "Autonomie (GIR)", ["GIR 1", "GIR 2", "GIR 3", "GIR 4", "GIR 5", "GIR 6", "Non évalué"], S),
      yes("directivesAnticipees", "Directives anticipées rédigées"),
      t("lieuDirectives", "Lieu de conservation des directives"),
      t("aidesSociales", "Aides perçues (APA, ASH, APL…)"),
      long("infosMedicales", "Informations médicales utiles", C),
    ],
  },
  {
    id: "juridique",
    label: "Situation juridique",
    module: "juridique",
    kinds: ["particulier"],
    fields: [
      sel(
        "mesureProtection",
        "Mesure de protection",
        [
          "Aucune",
          "Sauvegarde de justice",
          "Curatelle simple",
          "Curatelle renforcée",
          "Tutelle",
          "Habilitation familiale",
          "Mandat de protection future",
        ],
        S,
      ),
      t("mandataireJudiciaire", "Mandataire judiciaire", S),
      { key: "dateJugement", label: "Date du jugement", type: "date" },
      sel("regimeMatrimonial", "Régime matrimonial", [
        "Communauté réduite aux acquêts",
        "Séparation de biens",
        "Participation aux acquêts",
        "Communauté universelle",
        "Non concerné",
      ]),
      t("notaire", "Notaire"),
      t("avocat", "Avocat·e"),
      long("dossiersEnCours", "Dossiers en cours", S),
    ],
  },
  {
    id: "confidentiel",
    label: "Notes confidentielles",
    module: "essentiel",
    fields: [long("notes", "Notes", S)],
  },
  {
    id: "rgpd",
    label: "Conformité RGPD",
    module: "rgpd",
    fields: [
      sel("baseLegale", "Base légale", [
        "Exécution d'un contrat",
        "Consentement",
        "Obligation légale",
        "Intérêt légitime",
        "Intérêts vitaux",
        "Mission d'intérêt public",
      ]),
      sel("origineDonnees", "Origine des données", ["La personne elle-même", "Un proche", "Un professionnel", "Autre"]),
      yes("informationDelivree", "Personne informée du traitement"),
      { key: "consentementDate", label: "Informée ou consentante le", type: "date" },
      { key: "finConservation", label: "Conserver jusqu'au", type: "date" },
    ],
  },
];

export const FIELD_INDEX: Record<string, FieldDef> = Object.fromEntries(
  SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, f])),
);

/** Rubriques visibles pour un type de client et les modules actifs, numérotées dans l'ordre d'affichage. */
export function visibleSections(modules: readonly ModuleId[], kind: ClientKindLite) {
  const active = new Set<ModuleId>([...modules, "essentiel", "rgpd"]);
  return SECTIONS.filter((s) => active.has(s.module) && (!s.kinds || s.kinds.includes(kind))).map((s, i) => ({
    ...s,
    index: String(i + 1).padStart(2, "0"),
  }));
}

export type CustomField = { id: string; label: string; value: string; sensitive: boolean };

export type Profile = {
  values: Record<string, string>;
  custom: CustomField[];
};

export const EMPTY_PROFILE: Profile = { values: {}, custom: [] };

export const SENSITIVITY_LABEL = {
  standard: "Standard",
  restreint: "Restreint",
  secret: "Secret",
} as const;

export const STATUS_LABEL = {
  actif: "Actif",
  prospect: "Prospect",
  "en-pause": "En pause",
  archive: "Archivé",
} as const;

export const ROLE_LABEL = {
  direction: "Direction",
  gestionnaire: "Gestionnaire",
  lecteur: "Lecture seule",
} as const;

export const EVENT_LABEL = {
  appel: "Appel",
  "rendez-vous": "Rendez-vous",
  email: "E-mail",
  note: "Note",
} as const;

/** Affichage d'une date ISO (AAAA-MM-JJ) au format français. */
export function displayValue(def: FieldDef | undefined, value: string) {
  if (def?.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return value;
}

/** Masque d'affichage : garde la forme de la valeur sans rien en révéler. */
export function maskShape(length: number): string {
  const n = Math.min(Math.max(length, 6), 18);
  return "•".repeat(n);
}
