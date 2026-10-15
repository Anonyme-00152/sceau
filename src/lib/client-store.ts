"use client";

import { useSyncExternalStore } from "react";

// Préférences locales (son, flou) et requêtes média, lues sans setState dans un effet
// et sans écart d'hydratation : le serveur rend la valeur par défaut, le navigateur la vraie.

type Pref = { get: () => boolean; set: (v: boolean) => void; subscribe: (cb: () => void) => () => void };

const prefs = new Map<string, Pref>();

export function localPref(key: string, fallback: boolean): Pref {
  const existing = prefs.get(key);
  if (existing) return existing;
  const listeners = new Set<() => void>();
  const read = () => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v === "1";
    } catch {
      return fallback;
    }
  };
  let value: boolean | null = null;
  const pref: Pref = {
    get: () => (value ??= read()),
    set: (v) => {
      value = v;
      try {
        localStorage.setItem(key, v ? "1" : "0");
      } catch {}
      listeners.forEach((l) => l());
    },
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  prefs.set(key, pref);
  return pref;
}

export function usePref(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const pref = localPref(key, fallback);
  const value = useSyncExternalStore(pref.subscribe, pref.get, () => fallback);
  return [value, pref.set];
}

export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
