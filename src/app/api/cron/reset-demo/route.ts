import { NextResponse, type NextRequest } from "next/server";
import { libsql } from "@/lib/db";
import { databaseConfig, isLocalDatabase } from "@/lib/db/config";
import { ensureModules, prepareDatabase, wipeDatabase } from "@/lib/bootstrap/schema";
import { seedDemo } from "@/lib/bootstrap/demo";
import { MODULES } from "@/lib/fields";
import { safeEqual } from "@/lib/crypto";

// Remise à zéro nocturne de la démonstration publique (tâche planifiée Vercel).
// N'existe qu'en mode démo, et seulement avec le secret partagé CRON_SECRET.
export async function GET(request: NextRequest) {
  if (process.env.DEMO_MODE !== "true") return new NextResponse(null, { status: 404 });

  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }

  await wipeDatabase(libsql);
  await prepareDatabase(libsql, { local: isLocalDatabase(databaseConfig().url) });
  await ensureModules(libsql, MODULES.map((m) => m.id));
  const result = await seedDemo(libsql);
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
