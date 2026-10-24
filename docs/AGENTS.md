# Règles du projet PISTIS (humains et agents IA)

Lis ce fichier avant toute modification. Il s'applique à ChatGPT, Claude Code, Gemini, Antigravity
et à toute personne qui contribue.

## Ce qui ne se négocie pas

1. **100 % local.** Aucun appel réseau dans l'application : pas d'API, pas de télémétrie, pas de police ou
   d'image chargée depuis Internet. La politique de sécurité (`vite.config.ts`) le bloque, et les tests
   navigateur échouent à la moindre requête externe. Ne jamais l'assouplir pour « faire marcher » une bibliothèque.
2. **Aucune donnée inventée.** Pas de démonstration fictive présentée comme une fonctionnalité terminée.
3. **Montants en centimes entiers** (`INTEGER`) avec un code devise. Jamais de nombres à virgule pour de l'argent.
4. **Les simulations n'écrivent jamais** dans les tables réelles.
5. **Une migration publiée ne se modifie jamais.** On ajoute la suivante dans `src/data/migrations.ts`.
6. **Ne jamais prétendre qu'une protection fonctionne** (chiffrement, sauvegarde) sans test qui le prouve.
7. **Une écriture qui touche plusieurs lignes passe par `db.transaction`** : tout ou rien.
8. **Aucun texte affiché écrit en dur.** Tout passe par `t('clé')` (src/i18n) ; la clé existe en français ET en anglais.
   La logique lève des `PistisError('code')`, jamais un message en français.

## Architecture

- `src/domain/` et les fichiers `*Rules.ts` : fonctions pures, sans React ni base de données, testées à 100 %.
- `src/data/` : seul endroit où l'on parle à SQLite. Les écrans passent par des fonctions de dépôt
  (`getProfile`, `saveProfile`…).
- `src/design-system/` : toute couleur, taille, rayon vient de `tokens.css`. Pas de valeur en dur dans un écran.
  Texte sur un bouton principal : jetons `--action-bg` / `--action-text` (contraste vérifié), jamais le cyan de marque.
- Textes, catégories, citations : à terme dans `src/content/` (JSON), jamais dispersés dans le code.

## Version d'essai

`vite.demo.config.ts` remplace le pilote de base (`src/data/web/webDatabase`) par `src/demo/demoDatabase.ts`
(sql.js en JavaScript pur) et désactive service worker et CSP, **pour la version d'essai seulement**.
Ne jamais importer `src/demo/` depuis l'application ; le code propre à l'essai est protégé par
`import.meta.env.MODE === 'demo'` et disparaît de la version réelle.

## Liste de contrôle pour un nouveau texte ou une nouvelle erreur

1. Clé ajoutée dans `src/i18n/fr.ts` puis `src/i18n/en.ts` (même variables `{…}`) : TypeScript et un test le vérifient.
2. Nouvelle erreur : code ajouté à `ERROR_CODES` (`src/core/errors.ts`) et message `errors.<code>` dans les deux langues.

## Liste de contrôle pour une nouvelle table

1. Migration ajoutée à la fin de `MIGRATIONS`, avec son test.
2. Si la migration insère des données : fournir `upgradeBackup` (un test l'exige).
3. Table ajoutée à `BACKUP_TABLES` (et à `PRIMARY_KEYS` si sa clé ne s'appelle pas `id`).
4. Si une colonne pointe vers une image : l'ajouter à `MEDIA_REFERENCES` (sinon l'image pourrait être supprimée).

## Façon de travailler

- Une branche Git par tâche ; on fusionne seulement si `npm run check` passe (la CI le refait).
- Un seul agent à la fois sur une même zone du code.
- Toute règle financière modifiée commence par un test qui échoue, puis la correction.
- Chaque fusion met à jour `CHANGELOG.md` et la documentation du module touché.
- `npm run format` avant de valider. Messages, commentaires et documentation en français ; noms de code en anglais.
- Un effet React qui charge des données utilise le motif `let alive = true … return () => { alive = false }` (voir `App.tsx`).

## Ton de l'application

Tutoiement, phrases courtes, jamais de reproche ni de culpabilisation. Un objectif en retard n'est
jamais affiché en rouge. Le rouge est réservé aux erreurs et aux actions destructrices.
