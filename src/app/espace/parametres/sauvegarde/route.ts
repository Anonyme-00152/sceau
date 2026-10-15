import { NextResponse } from "next/server";
import { libsql } from "@/lib/db";
import { getCurrent, isElevated } from "@/lib/session";
import { exportBackup } from "@/lib/backup";
import { audit } from "@/lib/audit";
import { requestInfo } from "@/lib/request";

// Téléchargement d'une sauvegarde : direction uniquement, session complète et accès renforcé en cours.
export async function GET() {
  const current = await getCurrent();
  const { user, session } = current ?? {};
  const allowed =
    !!user && !!session && !!session.mfaAt && !!session.ndaAt && !session.lockedAt && user.role === "direction" && isElevated(session);
  if (!allowed) {
    return new NextResponse("Accès renforcé requis : réservé à la direction.", { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const backup = await exportBackup(libsql);
  const { ip } = await requestInfo();
  await audit({
    userId: user.id,
    actor: user.name,
    action: "sauvegarde.telechargee",
    targetType: "journal",
    label: `${backup.tables.clients.length} dossiers`,
    ip,
  });

  const date = backup.createdAt.slice(0, 10);
  return new NextResponse(JSON.stringify(backup), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sceau-sauvegarde-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
