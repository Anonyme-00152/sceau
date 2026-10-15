import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Archivo, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: {
    default: "Sceau — Le registre client scellé",
    template: "%s — Sceau",
  },
  description:
    "Sceau est un registre client confidentiel : chiffrement champ par champ, accès cloisonnés, double clé et journal infalsifiable.",
  applicationName: "Sceau",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Rendu dynamique obligatoire : chaque réponse porte un nonce CSP unique (voir src/proxy.ts).
  await connection();
  return (
    <html
      lang="fr"
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable} ${archivo.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
