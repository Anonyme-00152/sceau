"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useElevation } from "./Elevation";

// La sauvegarde exige l'accès renforcé : le code à usage unique est redemandé avant le téléchargement.
export function BackupButton() {
  const { requestElevation } = useElevation();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const ok = await requestElevation();
        setBusy(false);
        if (!ok) return;
        // Téléchargement d'un fichier (pas une page) : lien temporaire avec l'attribut download.
        const link = document.createElement("a");
        link.href = "/espace/parametres/sauvegarde";
        link.download = "";
        link.click();
      }}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-bone px-5 text-sm font-medium text-ink transition-transform hover:scale-[1.03] disabled:opacity-60"
    >
      <Icon name="lock" className="size-4" />
      Télécharger une sauvegarde
    </button>
  );
}
