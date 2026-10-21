// En HTTPS, le préfixe __Host- interdit au cookie tout domaine ou chemin autre que le site lui-même.
export const HTTPS = (process.env.APP_URL ?? "").startsWith("https://");
export const SESSION_COOKIE = HTTPS ? "__Host-sceau_session" : "sceau_session";
export const ENGAGEMENT_COOKIE = HTTPS ? "__Host-sceau_engagement" : "sceau_engagement";

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** L'engagement de confidentialité signé reste valable sur cet appareil pendant cette durée. */
export const ENGAGEMENT_TTL = 30 * DAY;

/** Durée de vie absolue d'une session. */
export const SESSION_TTL = 8 * HOUR;
/** Session sans activité côté serveur : supprimée. */
export const SERVER_IDLE_TIMEOUT = 30 * MINUTE;
/** Inactivité côté navigateur : la session est verrouillée. */
export const CLIENT_LOCK_AFTER = 5 * MINUTE;
/** Fenêtre pour saisir le code à usage unique après le mot de passe. */
export const MFA_WINDOW = 5 * MINUTE;
/** Durée de l'accès renforcé (données critiques). */
export const ELEVATION_TTL = 5 * MINUTE;
/** Temps d'affichage d'une donnée révélée avant re-masquage. */
export const REVEAL_SECONDS = 30;

export const MAX_FAILED_ATTEMPTS = 5;
/** Échecs tolérés par adresse IP, tous comptes confondus, sur IP_WINDOW. */
export const MAX_FAILURES_PER_IP = 20;
export const IP_WINDOW = 15 * MINUTE;
export const LOCKOUT_DURATION = 5 * MINUTE;
