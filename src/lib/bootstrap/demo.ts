import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import { hashPassword, seal, sealJson } from "../crypto";
import { generateTotpSecret } from "../totp";
import { audit } from "../audit";

// Jeu de démonstration entièrement fictif : personnes, entreprises, adresses et numéros inventés
// (plages téléphoniques réservées à la fiction, domaine de test). Utilisé en local et par la remise à zéro nocturne.

export const DEMO_PASSWORD = "Sceau-Demo-2026!";

export const TEAM = [
  { key: "ines", name: "Inès Morel", title: "Directrice associée", role: "direction", email: "direction@sceau-demo.test", demo: true },
  { key: "hugo", name: "Hugo Lambert", title: "Gestionnaire de comptes", role: "gestionnaire", email: "gestion@sceau-demo.test", demo: true },
  { key: "sarah", name: "Sarah Benali", title: "Assistante juridique", role: "lecteur", email: "lecture@sceau-demo.test", demo: true },
  { key: "malik", name: "Malik Diallo", title: "Gestionnaire patrimoine", role: "gestionnaire", email: "malik.diallo@sceau-demo.test", demo: false },
  { key: "claire", name: "Claire Fontaine", title: "Responsable conformité", role: "lecteur", email: "claire.fontaine@sceau-demo.test", demo: false },
] as const;

const PEOPLE = [
  ["Mme", "Élise", "Marchand"], ["M.", "Thomas", "Girard"], ["Mme", "Nadia", "Haddad"], ["M.", "Julien", "Roussel"],
  ["Mme", "Camille", "Petit"], ["M.", "Antoine", "Lefèvre"], ["Mme", "Léa", "Dubois"], ["M.", "Yanis", "Chérif"],
  ["Mme", "Margaux", "Fabre"], ["M.", "Oscar", "Vidal"], ["Mme", "Amina", "Traoré"], ["M.", "Paul", "Garnier"],
  ["Mme", "Hélène", "Arnaud"], ["M.", "Victor", "Lemaire"], ["Mme", "Clara", "Carpentier"], ["M.", "Samuel", "Robin"],
  ["Mme", "Jeanne", "Perrin"], ["M.", "Mathis", "Fournier"], ["Mme", "Sofia", "Benmansour"], ["M.", "Gabriel", "Leroux"],
  ["Mme", "Lina", "Mercier"], ["M.", "Noé", "Blanchard"], ["Mme", "Rose", "Delmas"], ["M.", "Adrien", "Kowalski"],
  ["Mme", "Maëlle", "Guérin"], ["M.", "Ibrahim", "Sow"],
] as const;

const COMPANIES = [
  ["Atelier Verlaine", "Artisanat d'art"], ["Nordlys Shipping", "Logistique maritime"], ["Maison Ardent", "Maroquinerie"],
  ["Cabinet Roche & Associés", "Conseil juridique"], ["Helio Biotech", "Biotechnologies"], ["Studio Marée", "Design produit"],
  ["Ferrand Immobilier", "Immobilier"], ["Kairos Capital", "Gestion d'actifs"], ["Lumen Énergie", "Énergies renouvelables"],
  ["Brasserie des Halles", "Restauration"], ["Orbe Logiciels", "Édition logicielle"], ["Clinique Saint-Aubin", "Santé"],
] as const;

const CITIES = [
  ["Paris", "75008", "France"], ["Lyon", "69002", "France"], ["Bordeaux", "33000", "France"], ["Nantes", "44000", "France"],
  ["Lille", "59800", "France"], ["Marseille", "13006", "France"], ["Toulouse", "31000", "France"], ["Rennes", "35000", "France"],
  ["Strasbourg", "67000", "France"], ["Genève", "1204", "Suisse"], ["Bruxelles", "1050", "Belgique"], ["Montréal", "H2X", "Canada"],
] as const;

const STREETS = ["rue des Tisserands", "quai des Brumes", "avenue des Tilleuls", "rue du Vieux-Port", "allée des Cèdres", "boulevard des Ondes", "impasse du Sablier", "rue de la Verrerie"];
const FUNCTIONS = ["Président", "Directrice générale", "Fondateur", "Directeur financier", "Associée gérante", "Responsable des achats"];
const PAYMENT = ["30 jours fin de mois", "À réception", "45 jours", "Prélèvement mensuel", "Acompte 40 % + solde"];

const NOTES = [
  "Souhaite que toute correspondance passe par son assistant. Ne jamais laisser de message vocal.",
  "Renouvellement en négociation : ne pas évoquer la remise de 12 % avant validation de la direction.",
  "Très attaché à la discrétion. Rendez-vous uniquement au bureau, jamais dans un lieu public.",
  "Litige clos l'an dernier. L'accord transactionnel original est conservé au coffre physique.",
  "Prépare une levée de fonds. Information non publique : aucune mention à des tiers, y compris en interne hors dossier.",
  "Recommandé par un client historique. Relation à traiter en priorité, interlocuteur unique : le gestionnaire du dossier.",
  "Situation familiale en cours d'évolution ; vérifier l'adresse de correspondance avant tout envoi.",
  "Demande expresse : aucun appel avant 10 h, aucune relance par SMS.",
];

const EVENT_BODIES = {
  appel: ["Point trimestriel, satisfait du suivi.", "Appel entrant : question sur la dernière facture.", "Relance sur la signature de l'avenant."],
  "rendez-vous": ["Rendez-vous au bureau, revue annuelle du contrat.", "Déjeuner de présentation de la nouvelle offre.", "Signature de l'avenant n° 2."],
  email: ["Envoi du récapitulatif chiffré des échanges.", "Accusé de réception des pièces justificatives.", "Transmission de la proposition commerciale."],
  note: ["Préférence confirmée pour un interlocuteur unique.", "À recontacter après la clôture de l'exercice.", "Documents originaux remis en main propre."],
} as const;

/** Remplit une base vide avec la démonstration. Le tirage est déterministe : la démo est identique à chaque fois. */
export async function seedDemo(client: Client) {
  let seed = 20261013;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const digits = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * 10)).join("");
  const between = (a: number, b: number) => Math.floor(a + rand() * (b - a + 1));
  const fakeIban = () => `FR76 ${digits(4)} ${digits(4)} ${digits(4)} ${digits(4)} ${digits(4)} ${digits(3)}`;
  // Dates au format ISO (AAAA-MM-JJ), celui des champs de type « date ».
  const isoDate = (fromYear: number, toYear: number) =>
    `${between(fromYear, toYear)}-${String(between(1, 12)).padStart(2, "0")}-${String(between(1, 28)).padStart(2, "0")}`;
  const birthDate = () => isoDate(1938, 1998);
  const CUSTOM_POOL = [
    { label: "Contact d'urgence", sensitive: true, value: () => `${pick(PEOPLE)[1]} ${pick(PEOPLE)[2]} — 01 99 00 ${digits(2)} ${digits(2)}` },
    { label: "Préférence de rendez-vous", sensitive: false, value: () => pick(["Mardi matin", "Jeudi après-midi", "Vendredi 9 h", "En fin de journée"]) },
    { label: "Code d'accès immeuble", sensitive: true, value: () => `${digits(1)}${pick(["A", "B", "C"])}${digits(3)}` },
    { label: "Assistant(e)", sensitive: false, value: () => `${pick(PEOPLE)[1]} ${pick(PEOPLE)[2]}` },
    { label: "Avocat référent", sensitive: true, value: () => `Me ${pick(PEOPLE)[2]}, barreau de ${pick(CITIES)[0]}` },
    { label: "Allergies (événements)", sensitive: true, value: () => pick(["Arachides", "Gluten", "Aucune connue", "Fruits à coque"]) },
  ];

  const now = Date.now();
  const DAY = 86_400_000;
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // Équipe
  const ids: Record<string, string> = {};
  for (const m of TEAM) {
    const id = randomUUID();
    ids[m.key] = id;
    await client.execute({
      sql: `INSERT INTO users (id, email, name, title, role, password_hash, totp_secret, is_demo, created_at, last_login_at, status, totp_enrolled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'actif', ?)`,
      args: [id, m.email, m.name, m.title, m.role, passwordHash, seal(generateTotpSecret(), `totp:${id}`), m.demo ? 1 : 0, now - 120 * DAY, now - between(1, 72) * 3_600_000, now - 120 * DAY],
    });
  }
  const nameOf = (key: string) => TEAM.find((t) => t.key === key)!.name;

  // Dossiers
  type Seeded = { id: string; ref: string; name: string; owner: string; members: string[] };
  const seeded: Seeded[] = [];
  const total = 26;
  for (let i = 0; i < total; i++) {
    const id = randomUUID();
    const ref = `SC-${String(101 + i).padStart(4, "0")}`;
    const person = PEOPLE[i % PEOPLE.length];
    const isCompany = i % 2 === 1 && i / 2 < COMPANIES.length;
    const company = isCompany ? COMPANIES[Math.floor(i / 2) % COMPANIES.length] : null;
    const city = pick(CITIES);
    const sensitivity = i % 5 === 0 ? "secret" : i % 3 === 0 ? "restreint" : "standard";
    const status = pick(["actif", "actif", "actif", "prospect", "en-pause", "archive"] as const);
    const owner = pick(["hugo", "hugo", "malik", "ines"] as const);
    const displayName = company ? company[0] : `${person[1]} ${person[2]}`;
    const slug = `${person[1]}.${person[2]}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z.]/g, "");

    const nationality = city[2] === "France" ? "Française" : city[2] === "Suisse" ? "Suisse" : city[2] === "Belgique" ? "Belge" : "Canadienne";
    const born = birthDate();
    const senior = Number(born.slice(0, 4)) < 1962;
    const siren = `${digits(3)} ${digits(3)} ${digits(3)}`;
    const values: Record<string, string> = {
      // Identité
      civilite: person[0],
      prenom: person[1],
      autresPrenoms: pick(["", "Marie", "Jean", "Louise", "Pierre", ""]),
      nom: person[2],
      nomNaissance: person[0] === "Mme" && rand() < 0.4 ? pick(PEOPLE)[2] : person[2],
      sexe: person[0] === "Mme" ? "Féminin" : "Masculin",
      dateNaissance: born,
      lieuNaissance: pick(CITIES)[0],
      paysNaissance: city[2],
      nationalite: nationality,
      situationFamiliale: pick(["Célibataire", "Marié·e", "Pacsé·e", "Divorcé·e", "Veuf·ve"]),
      enfantsACharge: String(between(0, 3)),
      langue: city[0] === "Montréal" ? "Français (Québec)" : "Français",
      // Pièces
      pieceType: pick(["Carte d'identité", "Passeport"]),
      pieceNumero: `${digits(2)}${pick(["AB", "KX", "RT", "PL"])}${digits(5)}`,
      pieceDelivrance: isoDate(2016, 2023),
      pieceExpiration: isoDate(2027, 2034),
      pieceAutorite: `Préfecture de ${pick(CITIES)[0]}`,
      numeroFiscal: `${digits(2)} ${digits(2)} ${digits(3)} ${digits(3)} ${digits(3)}`,
      // Coordonnées (plages réservées à la fiction, domaine de test)
      email: `${slug}@exemple.test`,
      emailSecondaire: rand() < 0.4 ? `${slug.split(".")[0]}.perso@exemple.test` : "",
      telephone: `06 39 98 ${digits(2)} ${digits(2)}`,
      telephoneFixe: `01 99 00 ${digits(2)} ${digits(2)}`,
      telephonePro: company ? `01 99 01 ${digits(2)} ${digits(2)}` : "",
      adresse: `${between(2, 148)} ${pick(STREETS)}`,
      complementAdresse: rand() < 0.5 ? `Bât. ${pick(["A", "B", "C"])}, ${between(1, 6)}e étage` : "",
      codePostal: city[1],
      villeAdresse: city[0],
      pays: city[2],
      canal: pick(["Téléphone", "E-mail", "Rendez-vous", "Courrier", "Par un proche"]),
      horairesContact: pick(["En semaine, 9 h – 12 h", "Après 17 h", "Mardi et jeudi", "Indifférent"]),
      consentementContact: pick(["Oui", "Oui", "Non"]),
      // Situation professionnelle
      profession: company ? "" : senior ? "Retraité·e de l'enseignement" : pick(["Architecte", "Pharmacienne", "Consultant", "Infirmière", "Ingénieur"]),
      employeur: company || senior ? "" : pick(["Studio Lumière", "Groupe Hélios", "Clinique du Parc", "Indépendant"]),
      statutPro: company ? "" : senior ? "Retraité·e" : pick(["Salarié·e", "Indépendant·e", "Dirigeant·e"]),
      revenus: company ? "" : `${(between(28, 420) * 1000).toLocaleString("fr-FR")} € / an`,
      // Entreprise
      raisonSociale: company ? company[0] : "",
      formeJuridique: company ? pick(["SAS", "SARL", "SA", "SASU"]) : "",
      siren: company ? siren : "",
      siret: company ? `${siren} ${digits(5)}` : "",
      tvaIntracom: company ? `FR${digits(2)}${siren.replace(/\s/g, "")}` : "",
      codeNaf: company ? `${digits(2)}.${digits(2)}${pick(["A", "B", "Z"])}` : "",
      capital: company ? `${(between(1, 500) * 1000).toLocaleString("fr-FR")} €` : "",
      dateCreation: company ? isoDate(1985, 2021) : "",
      dirigeant: company ? `${pick(PEOPLE)[1]} ${pick(PEOPLE)[2]}` : "",
      fonction: company ? pick(FUNCTIONS) : "",
      effectif: company ? `${between(4, 480)} salariés` : "",
      chiffreAffaires: company ? `${between(1, 90)} M€` : "",
      secteur: company ? company[1] : "",
      siteWeb: company ? `https://${company[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, "-")}.exemple.test` : "",
      // Finances
      iban: fakeIban(),
      bic: `DEMO${pick(["FR", "FR", "CH", "BE"])}PP${digits(3)}`,
      banque: pick(["Banque Exemple", "Crédit Fictif", "Caisse Démo"]),
      titulaireCompte: company ? company[0] : `${person[1]} ${person[2]}`,
      mandatSepa: `SCEAU-${digits(6)}`,
      mandatDate: isoDate(2022, 2026),
      modePaiement: pick(["Prélèvement", "Virement", "Carte"]),
      valeurContrat: `${(between(6, 240) * 1000).toLocaleString("fr-FR")} € / an`,
      conditions: pick(PAYMENT),
      plafond: rand() < 0.4 ? `${(between(5, 80) * 1000).toLocaleString("fr-FR")} €` : "",
      patrimoine: company ? "" : rand() < 0.5 ? "Résidence principale, assurance-vie, portefeuille titres." : "",
      // Proches (particuliers)
      personneConfiance: company ? "" : `${pick(PEOPLE)[1]} ${pick(PEOPLE)[2]}, 06 39 98 ${digits(2)} ${digits(2)}`,
      contactUrgence: company ? "" : `${pick(PEOPLE)[1]} ${pick(PEOPLE)[2]}, 01 99 00 ${digits(2)} ${digits(2)}`,
      // Santé et autonomie : seulement pour les personnes âgées de la démonstration (cas EHPAD)
      ...(senior && !company
        ? {
            numeroSecu: `${person[0] === "Mme" ? 2 : 1} ${born.slice(2, 4)} ${born.slice(5, 7)} 99 ${digits(3)} ${digits(3)} ${digits(2)}`,
            caisse: `CPAM de ${city[0]}`,
            mutuelle: pick(["Mutuelle Exemple", "Prévoyance Démo"]),
            numeroAdherent: `${digits(9)}`,
            medecinTraitant: `Dr ${pick(PEOPLE)[2]}`,
            allergies: pick(["Pénicilline", "Aucune connue", "Arachides"]),
            traitements: "Traitement fictif de démonstration, posologie à vérifier avec l'équipe soignante.",
            regimeAlimentaire: pick(["Normal", "Sans sel", "Diabétique", "Mixé"]),
            mobilite: pick(["Autonome", "Canne ou déambulateur", "Fauteuil roulant"]),
            gir: pick(["GIR 2", "GIR 3", "GIR 4", "GIR 5"]),
            directivesAnticipees: pick(["Oui", "Non"]),
            lieuDirectives: "Dossier papier, bureau de la direction",
            aidesSociales: pick(["APA", "APA, ASH", "Aucune"]),
            infosMedicales: "Informations fictives de démonstration.",
            mesureProtection: pick(["Aucune", "Curatelle simple", "Habilitation familiale"]),
          }
        : { mesureProtection: "Aucune" }),
      // Situation juridique
      regimeMatrimonial: company ? "" : pick(["Communauté réduite aux acquêts", "Séparation de biens", "Non concerné"]),
      notaire: rand() < 0.5 ? `Me ${pick(PEOPLE)[2]}` : "",
      // Notes
      notes: pick(NOTES) + "\n\n" + pick(NOTES),
      // RGPD
      baseLegale: pick(["Exécution d'un contrat", "Exécution d'un contrat", "Consentement", "Obligation légale"]),
      origineDonnees: pick(["La personne elle-même", "La personne elle-même", "Un proche"]),
      informationDelivree: "Oui",
      consentementDate: isoDate(2023, 2026),
      finConservation: isoDate(2029, 2034),
    };
    const custom = Array.from({ length: between(1, 3) }, () => pick(CUSTOM_POOL))
      .filter((c, idx, arr) => arr.findIndex((x) => x.label === c.label) === idx)
      .map((c) => ({ id: randomUUID(), label: c.label, value: c.value(), sensitive: c.sensitive }));

    const createdAt = now - between(20, 600) * DAY;
    await client.execute({
      sql: `INSERT INTO clients (id, ref, kind, display_name, company, sector, city, country, status, sensitivity, owner_id, sealed, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, ref, company ? "entreprise" : "particulier", displayName, company ? company[0] : null, company ? company[1] : pick(["Particulier", "Patrimoine privé", "Profession libérale"]), city[0], city[2], status, sensitivity, ids[owner], sealJson({ values, custom }, `client:${id}`), createdAt, now - between(0, 19) * DAY],
    });

    // Accès : le titulaire, la direction (presque toujours), et quelques membres selon la sensibilité.
    const members = new Set<string>([owner]);
    if (rand() < 0.85) members.add("ines");
    if (sensitivity !== "secret" && rand() < 0.45) members.add("sarah");
    if (rand() < 0.3) members.add(owner === "hugo" ? "malik" : "hugo");
    if (sensitivity === "standard" && rand() < 0.25) members.add("claire");
    if (i < 3) members.add("hugo");
    if (i === 2 || i === 4) members.add("sarah");
    for (const m of members) {
      await client.execute({
        sql: "INSERT INTO client_access (client_id, user_id, granted_by, granted_at) VALUES (?, ?, ?, ?)",
        args: [id, ids[m], m === owner ? "création" : nameOf("ines"), createdAt + DAY],
      });
    }

    // Historique d'échanges (chiffré)
    for (let e = 0; e < between(2, 5); e++) {
      const kind = pick(["appel", "rendez-vous", "email", "note"] as const);
      const eventId = randomUUID();
      await client.execute({
        sql: "INSERT INTO events (id, client_id, user_id, kind, body, at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [eventId, id, ids[pick([...members])], kind, seal(pick(EVENT_BODIES[kind]), `event:${eventId}`), now - between(1, 90) * DAY - between(0, 86_000_000)],
      });
    }

    seeded.push({ id, ref, name: displayName, owner, members: [...members] });
  }

  // Journal : quinze jours d'activité plausible, insérés dans l'ordre chronologique pour une chaîne valide.
  type Line = Parameters<typeof audit>[0] & { at: number };
  const lines: Line[] = [];
  const ip = () => `10.0.${between(1, 4)}.${between(10, 240)}`;
  for (let d = 14; d >= 1; d--) {
    for (const m of TEAM) {
      if (rand() < 0.25) continue;
      const base = now - d * DAY + between(8, 10) * 3_600_000;
      const who = { userId: ids[m.key], actor: m.name, ip: ip() };
      lines.push({ ...who, at: base, action: "connexion.reussie", targetType: "session" });
      lines.push({ ...who, at: base + 4_000, action: "confidentialite.acceptee", targetType: "session" });
      const mine = seeded.filter((s) => s.members.includes(m.key));
      for (let k = 0; k < between(1, 4) && mine.length; k++) {
        const c = pick(mine);
        const t = base + between(2, 400) * 60_000;
        lines.push({ ...who, at: t, action: "client.consulte", targetType: "client", targetId: c.id, label: `${c.ref} · ${c.name}` });
        if (rand() < 0.4) lines.push({ ...who, at: t + 40_000, action: "champ.revele", targetType: "client", targetId: c.id, label: `${c.ref} · ${pick(["Téléphone", "E-mail", "Adresse postale", "Notes"])}` });
      }
      if (rand() < 0.15) lines.push({ ...who, at: base + 3_600_000, action: "session.verrouillee", targetType: "session" });
      lines.push({ ...who, at: base + between(5, 9) * 3_600_000, action: "deconnexion", targetType: "session" });
    }
    // Seuls les accès réellement accordés à Claire apparaissent au journal : l'historique reste cohérent avec les listes.
    const granted = seeded.filter((s) => s.members.includes("claire"));
    if (granted.length && rand() < 0.3) {
      const c = pick(granted);
      lines.push({ userId: ids.ines, actor: nameOf("ines"), ip: ip(), at: now - d * DAY + 15 * 3_600_000, action: "acces.accorde", targetType: "client", targetId: c.id, label: `${c.ref} · ${nameOf("claire")}` });
    }
    if (rand() < 0.2) {
      lines.push({ userId: null, actor: "inconnu", ip: `185.${between(10, 250)}.${between(1, 250)}.${between(1, 250)}`, at: now - d * DAY + 3 * 3_600_000, action: "connexion.echec", targetType: "user", label: "admin@sceau-demo.test" });
    }
  }
  lines.sort((a, b) => a.at - b.at);
  // L'audit passe par l'ORM : on lui donne la même base.
  for (const { at, ...line } of lines) await audit(line, at);

  return { members: TEAM.length, clients: seeded.length, journal: lines.length };
}
