"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SensitivityBadge } from "@/components/ui/Badge";
import type { Sensitivity } from "@/lib/db/schema";

export type PaletteClient = { id: string; ref: string; name: string; city: string | null; sensitivity: Sensitivity; access: boolean };

type Item =
  | { type: "client"; client: PaletteClient }
  | { type: "page"; label: string; href: string; icon: IconName; hint?: string };

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CommandPalette({ clients, canCreate }: { clients: PaletteClient[]; canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("sceau:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("sceau:palette", onOpen);
    };
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => input.current?.focus());
    }
    if (!open && d.open) d.close();
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = normalize(query.trim());
    const pages: Item[] = [
      { type: "page", label: "Tableau de bord", href: "/espace", icon: "home" },
      { type: "page", label: "Tous les dossiers", href: "/espace/clients", icon: "folder" },
      ...(canCreate ? [{ type: "page" as const, label: "Nouveau dossier", href: "/espace/clients/nouveau", icon: "plus" as const }] : []),
      { type: "page", label: "Journal scellé", href: "/espace/journal", icon: "journal" },
      { type: "page", label: "Équipe et sessions", href: "/espace/equipe", icon: "team" },
    ];
    const matchedPages = pages.filter((p) => p.type === "page" && (!q || normalize(p.label).includes(q)));
    const matchedClients = clients
      .filter((c) => !q || normalize(`${c.name} ${c.ref} ${c.city ?? ""}`).includes(q))
      .slice(0, 8)
      .map((c): Item => ({ type: "client", client: c }));
    return [...matchedClients, ...matchedPages];
  }, [query, clients, canCreate]);

  const go = (item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    router.push(item.type === "client" ? `/espace/clients/${item.client.id}` : item.href);
  };

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        setOpen(false);
      }}
      onClick={(e) => e.target === dialog.current && setOpen(false)}
      aria-label="Recherche rapide"
      className="mx-auto mt-[12vh] w-[min(94vw,640px)] overflow-hidden rounded-2xl border border-bone/15 bg-ink-2 p-0 text-bone shadow-[0_40px_120px_rgba(0,0,0,0.8)] backdrop:bg-ink/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 border-b border-bone/10 px-5">
        <Icon name="search" className="size-5 text-mute" />
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(items.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(items[index]);
            }
          }}
          placeholder="Rechercher un dossier, une page…"
          aria-label="Rechercher"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={items[index] ? `palette-${index}` : undefined}
          className="h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-mute"
        />
        <kbd className="label rounded-md border border-bone/15 px-2 py-1 text-mute">Échap</kbd>
      </div>
      <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2" data-lenis-prevent>
        {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-mute">Aucun résultat dans vos dossiers.</li>}
        {items.map((item, i) => (
          <li
            key={item.type === "client" ? item.client.id : item.href}
            id={`palette-${i}`}
            role="option"
            aria-selected={i === index}
            onPointerEnter={() => setIndex(i)}
            onClick={() => go(item)}
            className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl px-4 py-3 ${i === index ? "bg-bone/[0.08]" : ""}`}
          >
            {item.type === "client" ? (
              <>
                <span className="flex min-w-0 items-center gap-3">
                  <Icon name={item.client.access ? "folder" : "lock"} className="size-[18px] shrink-0 text-mute" />
                  <span className="truncate">{item.client.name}</span>
                  <span className="label shrink-0 text-mute">{item.client.ref}</span>
                </span>
                <SensitivityBadge level={item.client.sensitivity} />
              </>
            ) : (
              <span className="flex items-center gap-3">
                <Icon name={item.icon} className="size-[18px] text-mute" />
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </dialog>
  );
}
