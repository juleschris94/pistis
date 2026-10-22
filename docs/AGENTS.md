# Règles du projet PISTIS (humains et agents IA)

Lis ce fichier avant toute modification. Il s'applique à ChatGPT, Claude Code, Gemini, Antigravity
et à toute personne qui contribue.

## Ce qui ne se négocie pas

1. **100 % local.** Aucun appel réseau dans l'application : pas d'API, pas de télémétrie, pas de police ou
   d'image chargée depuis Internet. Tout fichier nécessaire est dans le dépôt et mis en cache par le service worker.
2. **Aucune donnée inventée.** Pas de démonstration fictive présentée comme une fonctionnalité terminée.
3. **Montants en centimes entiers** (`INTEGER`) avec un code devise. Jamais de nombres à virgule pour de l'argent.
4. **Les simulations n'écrivent jamais** dans les tables réelles.
5. **Une migration publiée ne se modifie jamais.** On ajoute la suivante dans `src/data/migrations.ts`.
6. **Ne jamais prétendre qu'une protection fonctionne** (chiffrement, sauvegarde) sans test qui le prouve.

## Architecture

- `src/domain/` (à partir du jalon M2) et les fichiers `*Rules.ts` : fonctions pures, sans React ni base de données, testées à 100 %.
- `src/data/` : seul endroit où l'on parle à SQLite. Les écrans passent par des fonctions de dépôt
  (`getProfile`, `insertMedia`…).
- `src/design-system/` : toute couleur, taille, rayon vient de `tokens.css`. Pas de valeur en dur dans un écran.
- Textes, catégories, citations : à terme dans `src/content/` (JSON), jamais dispersés dans le code.

## Façon de travailler

- Une branche Git par tâche ; on fusionne seulement si `npm test` et `npm run typecheck` passent.
- Un seul agent à la fois sur une même zone du code.
- Toute règle financière modifiée commence par un test qui échoue, puis la correction.
- Chaque fusion met à jour `CHANGELOG.md` et la documentation du module touché.
- Messages, commentaires et documentation en français ; noms de code (variables, fonctions) en anglais.

## Ton de l'application

Tutoiement, phrases courtes, jamais de reproche ni de culpabilisation. Un objectif en retard n'est
jamais affiché en rouge.
