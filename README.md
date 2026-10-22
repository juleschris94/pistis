# PISTIS

**Organise ta vie. Développe ton potentiel. Construis ton avenir.**

Application personnelle de pilotage de vie, 100 % locale : pas de compte, pas de cloud, pas de serveur.
Elle fonctionne dans le navigateur (PC et Android), hors ligne après le premier chargement.

> État actuel : **jalon M0 — spike technique**. L'écran affiché prouve que les fondations tiennent
> sur ton appareil (base persistante, migrations, hors ligne, photo, sauvegarde). Il sera remplacé
> par l'Accueil à partir du jalon M1.

## Démarrer en 5 commandes

Prérequis : [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install          # installe les dépendances (une seule fois, nécessite Internet)
npm run dev          # version de développement : http://localhost:5173
npm test             # tests automatiques (règles, base, sauvegardes)
npm run build        # version finale dans le dossier dist/
npm run preview      # sert la version finale : http://localhost:4173
```

Le mode hors ligne ne fonctionne qu'avec la version finale (`build` puis `preview`), pas avec `dev`.

### Tester sur ton téléphone Android (même Wi-Fi que le PC)

```bash
npm run build && npx vite preview --host
```

Ouvre l'adresse « Network » affichée dans Chrome Android. Pour installer PISTIS comme une app et
activer le mode hors ligne, il faut une adresse **https** : utilise la version en ligne (ci-dessous).

## Mettre PISTIS en ligne (GitHub Pages, gratuit)

1. Crée un dépôt GitHub et pousse ce dossier (`git push`).
2. Dans le dépôt : **Settings → Pages → Source : GitHub Actions**.
3. Chaque `git push` sur `main` publie automatiquement l'application (fichier `.github/workflows/deploy.yml`).

L'adresse sera `https://<ton-compte>.github.io/<nom-du-dépôt>/`. Héberger PISTIS ne fait que
distribuer ses fichiers : **les données restent dans le navigateur de chaque personne** et ne sont jamais envoyées.

Attention : chaque adresse a son propre stockage. Les données saisies sur `localhost` ne sont pas
visibles sur la version en ligne. On passe de l'une à l'autre avec une sauvegarde `.pistis`.

## Tests

| Commande | Ce qui est vérifié |
| --- | --- |
| `npm test` | Migrations, profil, règles des images, sauvegardes (export, chiffrement, altération, restauration) |
| `npm run typecheck` | Types TypeScript de tout le projet |
| `python3 tests/e2e_m0.py` | Parcours complet dans Chromium : onboarding, photo sans EXIF, rechargement, hors ligne, export chiffré, restauration dans un autre navigateur (nécessite `npm run preview` lancé et `pip install playwright pillow`) |

## Organisation du code

```
src/
  app/            démarrage, écrans de l'application
  core/           outils communs (identifiants, horloge, empreintes)
  data/           accès aux données : interface Database, pilotes, migrations
  design-system/  jetons (couleurs, tailles) et composants réutilisables
  features/       un dossier par module : profile, media, backup, storage…
tests/            parcours navigateur
docs/             documentation vivante
```

Règle d'or : les écrans n'écrivent jamais de SQL et ne contiennent aucun calcul métier.

## Documentation

- [docs/AGENTS.md](docs/AGENTS.md) — règles à respecter par toute personne ou IA qui modifie le code
- [docs/m0-spike.md](docs/m0-spike.md) — ce que prouve le jalon M0 et comment le vérifier
- [docs/data-and-backup.md](docs/data-and-backup.md) — stockage, migrations, format `.pistis`
- [CHANGELOG.md](CHANGELOG.md) — historique des versions
- Document d'architecture complet : « PISTIS V1 — Audit et architecture » (référence produit)
