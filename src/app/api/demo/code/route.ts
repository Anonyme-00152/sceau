import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { unseal } from "@/lib/crypto";
import { totpNow } from "@/lib/totp";

// Authentificateur de démonstration : n'existe qu'en mode démo, et seulement pour les comptes marqués « démo ».
// Sur un vrai déploiement, le code s'affiche sur le téléphone du membre et nulle part ailleurs.
export async function GET(request: NextRequest) {
  if (process.env.DEMO_MODE !== "true") return new NextResponse(null, { status: 404 });

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email requis" }, { status: 400 });

  const user = (await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];
  if (!user?.isDemo) return NextResponse.json({ error: "compte non démo" }, { status: 404 });

  const { code, remaining } = totpNow(unseal(user.totpSecret, `totp:${user.id}`));
  return NextResponse.json({ code, remaining }, { headers: { "Cache-Control": "no-store" } });
}
