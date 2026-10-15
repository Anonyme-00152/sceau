"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { lockAction } from "@/lib/auth-actions";

// Verrouillage automatique après inactivité. Le verrou est posé côté serveur :
// tant qu'il n'est pas levé, aucune page de l'espace ne se rend.

const Ctx = createContext<{ remaining: number; total: number; lockNow: () => void }>({ remaining: 0, total: 1, lockNow: () => {} });
export const useIdleLock = () => useContext(Ctx);

export function IdleLockProvider({ children, after }: { children: React.ReactNode; after: number }) {
  const pathname = usePathname();
  const last = useRef(0);
  const [remaining, setRemaining] = useState(after);
  const [, startTransition] = useTransition();
  const locking = useRef(false);

  const lockNow = () => {
    if (locking.current) return;
    locking.current = true;
    startTransition(() => lockAction(pathname));
  };

  useEffect(() => {
    const bump = () => {
      last.current = Date.now();
    };
    bump();
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const id = setInterval(() => {
      const left = Math.max(0, after - (Date.now() - last.current));
      setRemaining(left);
      if (left === 0) lockNow();
    }, 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [after, pathname]);

  return <Ctx.Provider value={{ remaining, total: after, lockNow }}>{children}</Ctx.Provider>;
}
