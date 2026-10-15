import { ViewTransition } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { Footer } from "@/components/site/Footer";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <SiteShell>
      <ViewTransition default="page">
        <main id="contenu">{children}</main>
      </ViewTransition>
      <Footer />
    </SiteShell>
  );
}
