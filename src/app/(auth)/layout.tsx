import { ViewTransition } from "react";

export const metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition default="page">
      <main id="contenu">{children}</main>
    </ViewTransition>
  );
}
