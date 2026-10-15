# Sceau — le registre client scellé

Registre client confidentiel : un site vitrine immersif et une application de gestion où chaque donnée est chiffrée,
chaque accès nominatif et chaque consultation inscrite dans un journal infalsifiable.

> Projet portfolio. Toutes les personnes, entreprises, adresses et numéros de la démonstration sont fictifs.

## Démarrer

```bash
npm install
npm run setup   # crée .env.local (clé maîtresse), la base locale et les données de démonstration
npm run dev     # http://localhost:3300
```

Repartir de zéro : arrêter le serveur, puis `npm run reset`.

### Comptes de démonstration

| Rôle          | E-mail                       |
| ------------- | ---------------------------- |
| Direction     | `direction@sceau-demo.test`  |
| Gestionnaire  | `gestion@sceau-demo.test`    |
| Lecture seule | `lecture@sceau-demo.test`    |

Mot de passe commun : `Sceau-Demo-2026!`. En mode démo (`DEMO_MODE=true`), l'écran de connexion propose un
« authentificateur de démonstration » qui affiche le code à usage unique : rien à installer.

### Usage réel, en local

```bash
npm run setup -- --vierge   # base vide, mode démo désactivé
npm run dev
```

1. Chaque personne demande un accès sur `/inscription` (nom, e-mail, mot de passe personnel).
2. L'administrateur (variable `ADMIN_EMAIL` de `.env.local`) reçoit un e-mail avec un **lien** et un **code** de validation.
   Le tout premier compte validé devient Direction ; les suivants sont validés par la direction, avec le code, depuis la page Équipe.
3. À sa première connexion, la personne associe une application d'authentification (QR code), puis signe l'engagement.

**E-mails.** Sans configuration, ils sont déposés dans `data/outbox/` (fichiers `.eml`, ouvrables par double-clic).
Pour un envoi réel via iCloud : créez un « mot de passe pour app » sur appleid.apple.com, puis renseignez
`SMTP_HOST=smtp.mail.me.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS` et `SMTP_FROM` dans `.env.local`.

### En ligne (Vercel + Turso)

Deux sites séparés à partir du même code : un **site privé** (vraies données) et une **démo publique** (données fictives,
remises à zéro chaque nuit). Chacun a sa propre base Turso en Europe et sa propre clé de chiffrement.

| Variable | Site privé | Démo |
| --- | --- | --- |
| `SCEAU_HEBERGEMENT` | `en-ligne` | `en-ligne` |
| `INSCRIPTIONS` | `fermees` | `fermees` |
| `DEMO_MODE` / `SCEAU_SEED` | `false` / — | `true` / `demo` |
| `APP_URL`, `ADMIN_EMAIL`, `SMTP_HOST/PORT/USER/FROM` | oui | — |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | injectées par l'intégration Turso | idem |
| `SCEAU_MASTER_KEY` (+ `SMTP_PASS` / `CRON_SECRET`) | `npm run cloud:secrets -- sceau-prive` | `npm run cloud:secrets -- sceau-demo` |

- La compilation exécute `npm run setup -- --build` : tables et mises à niveau, jamais de suppression.
- Inscriptions fermées, sauf tant qu'aucun compte Direction n'existe : c'est ainsi que le propriétaire crée son premier
  compte, validé par le lien reçu par e-mail.
- En ligne, le module Santé est indisponible : les données de santé exigent un hébergeur certifié HDS.
- Sauvegarde : Paramètres → « Télécharger une sauvegarde » (code à usage unique redemandé). Restauration :
  `npm run restaurer -- sceau-sauvegarde-AAAA-MM-JJ.json`. Sans la clé de chiffrement d'origine, rien ne se relit.

**Rubriques des fiches.** La page Paramètres (direction) active les modules selon le métier : situation professionnelle,
entreprise, finances, proches et représentants, situation juridique, santé et autonomie (EHPAD, médico-social).
Les données d'origine, de religion, d'opinion, d'orientation sexuelle ou de condamnation ne sont volontairement pas prévues
(RGPD, art. 9 et 10).

## Ce que fait l'application

**Accès**
- Connexion en deux étapes : mot de passe (scrypt) puis code TOTP (RFC 6238, compatible toute application d'authentification).
- Engagement de confidentialité signé à chaque session, par appui long, journalisé avec date et origine.
- Blocage après 5 échecs, temps de réponse identique que l'adresse existe ou non.

**Dossiers**
- Près de 90 champs répartis en 11 rubriques activables (identité, pièces officielles, coordonnées, situation
  professionnelle, entreprise, finances, proches, santé et autonomie, situation juridique, notes, conformité RGPD),
  plus des champs libres illimités. Le profil complet est chiffré en AES-256-GCM, chaque bloc lié à son dossier.
- Données sensibles masquées par défaut ; révélation volontaire, limitée à 30 s, journalisée. Les copies aussi.
- Données critiques (pièce d'identité, numéro fiscal, IBAN) et dossiers « secrets » : accès renforcé, le code TOTP
  est redemandé et vaut 5 minutes.
- Les valeurs sensibles ne quittent jamais le serveur, pas même dans le formulaire de modification.

**Cloisonnement**
- Liste d'accès nominative par dossier. Hors direction, un dossier hors liste n'existe pas (404 indiscernable).
- La direction voit l'existence de tous les dossiers pour gérer les droits ; s'inscrire elle-même est journalisé.
- Trois rôles : direction, gestionnaire, lecture seule.

**Preuve**
- Journal à chaîne d'empreintes SHA-256 : chaque entrée contient l'empreinte de la précédente. Toute modification
  ou suppression est détectée par la vérification (bouton « Recalculer la chaîne »).

**Session**
- Jeton aléatoire en cookie httpOnly / SameSite strict ; seule son empreinte est stockée.
- Expiration absolue 8 h, suppression après 30 min d'inactivité, verrouillage côté serveur après 5 min.
- Filigrane nominatif sur tout l'espace, flou automatique quand la fenêtre perd le focus.
- Révocation des sessions (les siennes, ou celles de l'équipe pour la direction).

**En-têtes**
- CSP stricte à nonce par requête, `frame-ancestors 'none'`, HSTS, `Referrer-Policy: no-referrer`,
  `Permissions-Policy` restrictive, `Cache-Control: no-store` sur l'espace privé.

## Le site vitrine

- Scène 3D générée par le code (Three.js / React Three Fiber) : un cachet de cire percé d'une serrure, et une nuée
  de particules qui converge en orbite. Rien n'est téléchargé, aucun modèle externe.
- Le contenu s'affiche immédiatement ; la 3D se charge ensuite, s'adapte à l'appareil et cesse de dessiner hors champ.
- Défilement doux, transitions de page natives (View Transitions), curseur à inertie, habillage sonore synthétisé
  (coupé par défaut), démonstrations interactives des quatre verrous.
- Accessibilité : navigation clavier, lien d'évitement, `prefers-reduced-motion` respecté partout.

## Pile technique

Next.js 16 (App Router, Server Actions, `proxy.ts`), React 19, TypeScript, Tailwind CSS 4, Drizzle ORM + libSQL
(SQLite en local, Turso possible en production), Three.js / React Three Fiber, Motion, Lenis, Zod.

```
src/
  app/(site)        site vitrine : accueil, sécurité
  app/(auth)        connexion, engagement, verrou
  app/espace        application : tableau de bord, dossiers, journal, équipe + actions serveur
  components/       site, three, auth, espace, ui
  lib/              chiffrement, TOTP, sessions, accès, journal, données
  proxy.ts          CSP à nonce + garde de l'espace
scripts/setup.ts    base locale et données fictives
```

## Limites assumées

- Un avertissement de confidentialité engage la personne qui consulte ; il ne transfère pas la responsabilité de
  l'entreprise. Au regard du RGPD, protéger les données reste l'obligation de l'organisation qui les collecte.
- La clé maîtresse vit dans une variable d'environnement. En production, elle irait dans un coffre de secrets (KMS).
- Pas de stockage de fichiers joints dans cette version.
