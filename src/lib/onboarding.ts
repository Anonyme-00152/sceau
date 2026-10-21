import "server-only";
import { count, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import { DEMO_MODE } from "./demo";
import type { User } from "./db/schema";

// Premiers pas d'une installation neuve : une courte liste, déduite de ce qui a déjà été fait.

export type OnboardingStep = { key: string; title: string; body: string; href: string; cta: string; done: boolean; optional?: boolean };

export async function onboardingSteps(user: User): Promise<OnboardingStep[] | null> {
  if (DEMO_MODE || user.role !== "direction") return null;

  const [clients, members, actions] = await Promise.all([
    db.select({ n: count() }).from(schema.clients),
    db.select({ n: count() }).from(schema.users).where(eq(schema.users.status, "actif")),
    db
      .selectDistinct({ action: schema.auditLog.action })
      .from(schema.auditLog)
      .where(inArray(schema.auditLog.action, ["parametres.modifies", "sauvegarde.telechargee"])),
  ]);
  const done = new Set(actions.map((a) => a.action));

  const steps: OnboardingStep[] = [
    {
      key: "rubriques",
      title: "Choisir les rubriques des fiches",
      body: "N'activez que ce dont votre métier a besoin : le RGPD impose de ne collecter que le nécessaire.",
      href: "/espace/parametres",
      cta: "Paramètres",
      done: done.has("parametres.modifies"),
    },
    {
      key: "dossier",
      title: "Ouvrir un premier dossier",
      body: "Chaque fiche est chiffrée dès l'enregistrement. Les données sensibles restent masquées par défaut.",
      href: "/espace/clients/nouveau",
      cta: "Nouveau dossier",
      done: (clients[0]?.n ?? 0) > 0,
    },
    {
      key: "sauvegarde",
      title: "Télécharger une première sauvegarde",
      body: "Gardez-la avec la clé de chiffrement, à part : sans cette clé, le fichier est illisible.",
      href: "/espace/parametres#sauvegarde",
      cta: "Sauvegarder",
      done: done.has("sauvegarde.telechargee"),
    },
    {
      key: "equipe",
      title: "Ajouter un membre de l'équipe",
      body: "Facultatif. Chaque personne a son propre accès, son téléphone et sa liste de dossiers.",
      href: "/espace/equipe",
      cta: "Équipe",
      done: (members[0]?.n ?? 0) > 1,
      optional: true,
    },
  ];
  return steps.filter((s) => !s.optional).every((s) => s.done) ? null : steps;
}
