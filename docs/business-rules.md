# Règles métier PISTIS

Chaque règle ci-dessous est codée dans une fonction pure de `src/domain/` (ou garantie par la base) et
couverte par un test. Si une règle change, on modifie d'abord le test.

## Projets (`src/domain/goals.ts`)

| Règle | Où | Test |
| --- | --- | --- |
| Un projet a un titre de 1 à 120 caractères. | `validateGoal` + contrainte SQL | `goals.test.ts` |
| **Pas de projet en cours sans Pourquoi.** Seule une idée (`status = 'idea'`) peut s'en passer. | `validateGoal`, `requiresWhy` + `CHECK` SQL | `goalsRepository.test.ts` |
| Une idée devient un projet en une seule opération : Pourquoi, vision, plan ; ses tâches déjà notées sont gardées. | `promoteIdea` (transaction) | `goalsRepository.test.ts` |
| Statuts : idée → en cours ⇄ en pause → terminé → archivé. Terminer enregistre la date ; rouvrir l'efface. | `canChangeStatus`, `setGoalStatus` | `goals.test.ts` |
| **Progression = tâches terminées ÷ tâches prévues.** Sans tâche, aucun pourcentage n'est affiché (jamais estimé). | `progressOf` | `goals.test.ts` |
| Prochaine action = première tâche ouverte, dans l'ordre des étapes puis des tâches. | `nextAction`, `orderTasks` | `goals.test.ts` |
| Une étape est atteinte quand toutes ses tâches (au moins une) sont terminées. | `milestoneReached` | `goals.test.ts` |
| Supprimer une étape garde ses tâches (sans étape) ; supprimer un projet supprime étapes et tâches. | clés étrangères SQL | `goalsRepository.test.ts` |
| Terminer une tâche retire son épingle du jour. | `setTaskDone` | `goalsRepository.test.ts` |

## Vision

- La vision est toujours étiquetée **« Vision imaginée »** (violet) : elle inspire, elle ne mesure rien.
- L'avancement affiché à côté est l'**« Avancement réel »**, calculé uniquement à partir des tâches.
- Image de vision : une des six illustrations intégrées ou une photo personnelle (redimensionnée, métadonnées supprimées).

## Priorités du jour (`src/domain/dailyPlan.ts`)

- Tâches éligibles : tâches ouvertes des projets **en cours** et tâches rapides (sans projet). Les projets en pause,
  terminés ou à l'état d'idée sont exclus.
- **Trois priorités au maximum.** Le reste est proposé dans « Autres actions possibles ».
- Ordre : épinglée aujourd'hui > en retard > prévue aujourd'hui > prévue dans les 3 jours > importance haute > à suivre.
  À égalité : échéance, importance de la tâche, importance du projet, date de création, position, identifiant
  (l'ordre est donc toujours le même pour les mêmes données).
- **PISTIS ne remplace jamais un choix de l'utilisateur** : une tâche épinglée reste en tête. Trois épingles au
  maximum par jour (`task.tooManyPinned`).
- Une échéance dépassée est signalée en ambre (« En retard »), jamais en rouge.

## Modèles de projets (`src/content/templates.ts`)

- Dix modèles versionnés (`id`, `version`) : chaque projet créé garde `template_id` et `template_version`.
- Un modèle propose un objectif, des exemples de Pourquoi, un résultat visé, une fréquence, un indicateur et un
  plan (étapes et tâches). Tout est modifiable avant la création ; rien n'est créé sans validation.
- Les textes existent en français et en anglais (un test le vérifie).
