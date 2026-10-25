# PISTIS

**Organise ta vie. Développe ton potentiel. Construis ton avenir.**

Application personnelle de pilotage de vie, 100 % locale : pas de compte, pas de cloud, pas de serveur.
Elle fonctionne dans le navigateur (PC et Android), hors ligne après le premier chargement.

> État actuel : **jalon M1 — fondations** (version 0.1.0). Accueil en deux étapes, tableau de bord,
> 5 onglets, profil et paramètres (domaines, thème clair/sombre, langue français/anglais, sauvegardes,
> confidentialité et diagnostic). Les onglets Projets, Planning, Suivis et Finances annoncent honnêtement
> leur jalon : ils se rempliront à partir de M2.

## Démarrer

Prérequis : [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install          # installe les dépendances (une seule fois, nécessite Internet)
npm run dev          # version de développement : http://localhost:5173
npm run build        # version finale dans le dossier dist/
npm run preview      # sert la version finale : http://localhost:4173
npm run check        # TOUTES les vérifications (voir « Qualité » ci-dessous)
npm run build:hosted # version web hébergée en un seul fichier : dist-hosted/pistis.html
```

Le mode hors ligne et la politique de sécurité ne sont actifs que dans la version finale (`build` puis `preview`).

## Deux façons d'utiliser PISTIS sur le web

| | Version installable (`npm run build`) | Version web hébergée (`npm run build:hosted`) |
| --- | --- | --- |
| Où | N'importe quel hébergement https (Netlify, GitHub Pages…) | Une page intégrée, ex. une page claude.ai, ouverte par lien |
| Stockage | SQLite (OPFS) dans le navigateur | SQLite (sql.js) dans la page, copie dans IndexedDB |
| Hors ligne, installation | Oui | Non |
| Sauvegardes | Fichier `.pistis` | Fichier `.pistis.zip` via la fenêtre d'enregistrement de l'hôte |

Les deux lisent les sauvegardes de l'autre : on passe de l'une à l'autre sans rien perdre.
La version hébergée est produite par `vite.hosted.config.ts` et `src/hosted/` ; elle ne modifie pas la version installable.

## Utiliser PISTIS sur ton téléphone

PISTIS a besoin d'une adresse **https** (ou `localhost`) : c'est une exigence des navigateurs pour stocker
des données durablement et fonctionner hors ligne. Une adresse du type `http://192.168.1.20:4173` ne marche
donc pas ; PISTIS l'explique à l'écran au lieu de planter.

La solution simple est la version en ligne :

1. Crée un dépôt GitHub et pousse ce dossier (`git push`).
2. Dans le dépôt : **Settings → Pages → Source : GitHub Actions**.
3. Chaque `git push` sur `main` vérifie tout puis publie l'application (`.github/workflows/deploy.yml`).
4. Ouvre `https://<ton-compte>.github.io/<nom-du-dépôt>/` dans Chrome Android, puis « Installer l'application ».

Héberger PISTIS ne fait que distribuer ses fichiers : **les données restent dans le navigateur de chaque
personne**. La politique de sécurité intégrée interdit même techniquement à l'application de contacter un autre site.

Chaque adresse a son propre stockage : les données saisies sur `localhost` ne sont pas visibles sur la version
en ligne. On passe de l'une à l'autre avec une sauvegarde `.pistis`.

## Qualité

| Commande | Ce qui est vérifié |
| --- | --- |
| `npm run typecheck` | Types TypeScript de tout le projet |
| `npm run lint` | Erreurs courantes et règles React (ESLint) |
| `npm run format` | Met le code en forme (Prettier) ; `format:check` vérifie sans modifier |
| `npm test` | 84 tests : projets, étapes et tâches, progression, priorités du jour, modèles, migrations, profil, images, sauvegardes (chiffrement, fichiers piégés, anciennes versions, annulation), réglages, traductions complètes, semaine, thème |
| `npm run test:e2e` | 8 parcours × 2 appareils (téléphone et ordinateur) dans un vrai Chromium : modèle → assistant → projet, tâches et priorités du jour, ajout rapide et idée → projet, accueil et besoins, photo sans EXIF, navigation, thème et langue, hors ligne, sauvegarde chiffrée, restauration (nouvel appareil et annulation), onglets multiples. Échoue à la moindre erreur console ou requête externe. |

Première exécution des tests navigateur : `npx playwright install chromium`.

## Organisation du code

```
src/
  app/            démarrage, routes, coque (onglets), thème, installation
  content/        domaines, modèles de projets, illustrations, jalons, encouragements
  hosted/         pilote de la version web hébergée (jamais dans la version installable)
  domain/         règles métier pures : projets, progression, priorités du jour
  core/           outils communs (erreurs, identifiants, horloge, semaine)
  data/           accès aux données : interface Database, pilotes, migrations
  design-system/  jetons (couleurs, tailles), composants, logo
  features/       un dossier par module : onboarding, home, settings, profile,
                  projects, media, backup, notifications, modules (onglets à venir)
  i18n/           textes français (référence) et anglais
tests/            parcours navigateur (Playwright) et fichiers de test
docs/             documentation vivante
```

Règle d'or : les écrans n'écrivent jamais de SQL et ne contiennent aucun calcul métier.

## Documentation

- [docs/AGENTS.md](docs/AGENTS.md) — règles à respecter par toute personne ou IA qui modifie le code
- [docs/m0-spike.md](docs/m0-spike.md) — ce que prouve le jalon M0 et ce qu'il te reste à vérifier
- [docs/design-system.md](docs/design-system.md) — couleurs, typographie, composants, écarts avec le modèle
- [docs/data-and-backup.md](docs/data-and-backup.md) — stockage, onglets, migrations, format `.pistis`
- [docs/business-rules.md](docs/business-rules.md) — règles métier (Pourquoi, progression, priorités du jour)
- [docs/roadmap.md](docs/roadmap.md) — jalons et prochaines étapes
- [docs/idees.md](docs/idees.md) — idées d'amélioration retenues et leur jalon
- [CHANGELOG.md](CHANGELOG.md) — historique des versions
- Document d'architecture complet : « PISTIS V1 — Audit et architecture » (référence produit)
