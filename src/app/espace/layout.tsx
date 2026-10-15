import { ViewTransition } from "react";
import { activeElevation, requireAccess } from "@/lib/session";
import { canCreate } from "@/lib/access";
import { listClients } from "@/lib/clients";
import { DEMO_MODE } from "@/lib/demo";
import { CLIENT_LOCK_AFTER } from "@/lib/constants";
import { AppShell } from "@/components/espace/AppShell";

export const metadata = {
  title: { default: "Espace", template: "%s — Espace Sceau" },
  robots: { index: false, follow: false },
};

export default async function EspaceLayout({ children }: LayoutProps<"/espace">) {
  const { user, session } = await requireAccess();
  const clients = await listClients(user);

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role, title: user.title }}
      sessionTag={session.id.slice(0, 6).toUpperCase()}
      elevatedUntil={activeElevation(session)}
      lockAfter={CLIENT_LOCK_AFTER}
      clients={clients.map((c) => ({ id: c.id, ref: c.ref, name: c.displayName, city: c.city, sensitivity: c.sensitivity, access: c.access }))}
      canCreate={canCreate(user)}
      demoEmail={DEMO_MODE && user.isDemo ? user.email : null}
    >
      <ViewTransition default="page">
        <div>{children}</div>
      </ViewTransition>
    </AppShell>
  );
}
