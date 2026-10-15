"use client";

import { useState, useTransition } from "react";
import { verifyChainAction } from "@/app/espace/actions";
import type { ChainReport } from "@/lib/audit";
import { Icon } from "@/components/ui/Icon";

export function VerifyChainButton() {
  const [pending, start] = useTransition();
  const [report, setReport] = useState<ChainReport | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {report && (
        <span className={`label ${report.ok ? "text-moss" : "text-danger"}`} role="status">
          {report.ok ? `✓ ${report.count} entrées recalculées` : `Rupture à #${report.brokenAt}`}
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setReport(await verifyChainAction()))}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-bone/15 px-5 text-sm text-bone/85 transition-colors hover:border-bone hover:text-bone disabled:opacity-60"
      >
        <Icon name="chain" className={`size-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Vérification…" : "Recalculer la chaîne"}
      </button>
    </div>
  );
}
