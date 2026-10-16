import "server-only";
import { asc, desc } from "drizzle-orm";
import { db, schema } from "./db";
import { sha256 } from "./crypto";

// Journal scellé : chaque entrée contient l'empreinte de la précédente.
// Modifier ou supprimer une ligne casse la chaîne, ce que verifyChain() détecte.

export const GENESIS = "0".repeat(64);

export type AuditInput = {
  userId?: string | null;
  actor: string;
  action: AuditAction;
  targetType?: "client" | "user" | "session" | "journal" | null;
  targetId?: string | null;
  label?: string | null;
  ip?: string | null;
};

export const AUDIT_LABEL = {
  "connexion.reussie": "Connexion",
  "connexion.echec": "Échec de connexion",
  "connexion.bloquee": "Compte temporairement bloqué",
  "code.valide": "Double clé validée",
  "code.echec": "Code à usage unique refusé",
  "confidentialite.acceptee": "Engagement de confidentialité signé",
  "session.verrouillee": "Session verrouillée",
  "session.deverrouillee": "Session déverrouillée",
  "session.elevee": "Accès renforcé accordé",
  "session.revoquee": "Session révoquée",
  deconnexion: "Déconnexion",
  "client.consulte": "Dossier consulté",
  "client.cree": "Dossier créé",
  "client.modifie": "Dossier modifié",
  "client.archive": "Dossier archivé",
  "champ.revele": "Donnée révélée",
  "champ.copie": "Donnée copiée",
  "acces.accorde": "Accès accordé",
  "acces.retire": "Accès retiré",
  "acces.refuse": "Accès refusé",
  "echange.ajoute": "Échange consigné",
  "journal.verifie": "Intégrité du journal vérifiée",
  "compte.demande": "Demande d'accès",
  "compte.approuve": "Compte validé",
  "compte.refuse": "Demande d'accès refusée",
  "code.enrole": "Authentificateur associé",
  "parametres.modifies": "Paramètres modifiés",
  "sauvegarde.telechargee": "Sauvegarde téléchargée",
  "compte.cree": "Compte créé",
  "compte.modifie": "Compte modifié",
  "compte.suspendu": "Compte suspendu",
  "compte.reactive": "Compte réactivé",
  "compte.debloque": "Compte débloqué",
  "compte.supprime": "Compte supprimé",
  "mot-de-passe.reinitialise": "Mot de passe réinitialisé",
  "mot-de-passe.modifie": "Mot de passe modifié",
  "code.reinitialise": "Téléphone à réassocier",
} as const;

export type AuditAction = keyof typeof AUDIT_LABEL;

function digest(prevHash: string, e: Omit<typeof schema.auditLog.$inferInsert, "prevHash" | "hash" | "seq">) {
  return sha256(
    [prevHash, e.at, e.userId ?? "", e.actor, e.action, e.targetType ?? "", e.targetId ?? "", e.label ?? "", e.ip ?? ""].join(
      "|",
    ),
  );
}

export async function audit(input: AuditInput, at = Date.now()) {
  await db.transaction(async (tx) => {
    const last = await tx
      .select({ hash: schema.auditLog.hash })
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.seq))
      .limit(1);
    const prevHash = last[0]?.hash ?? GENESIS;
    const entry = {
      at,
      userId: input.userId ?? null,
      actor: input.actor,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      label: input.label ?? null,
      ip: input.ip ?? null,
    };
    await tx.insert(schema.auditLog).values({ ...entry, prevHash, hash: digest(prevHash, entry) });
  });
}

export type ChainReport = { ok: boolean; count: number; brokenAt: number | null; head: string };

export async function verifyChain(): Promise<ChainReport> {
  const rows = await db.select().from(schema.auditLog).orderBy(asc(schema.auditLog.seq));
  let prev = GENESIS;
  for (const row of rows) {
    const { seq, prevHash, hash, ...entry } = row;
    if (prevHash !== prev || digest(prev, entry) !== hash) {
      return { ok: false, count: rows.length, brokenAt: seq, head: prev };
    }
    prev = hash;
  }
  return { ok: true, count: rows.length, brokenAt: null, head: prev };
}
