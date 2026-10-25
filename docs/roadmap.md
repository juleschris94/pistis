# Feuille de route PISTIS

Version web d'abord (PWA utilisable sur ordinateur et Android, en local ou hébergée), application Android ensuite.

| Jalon | Contenu | État |
| --- | --- | --- |
| M0 | Socle technique : SQLite local (OPFS), migrations, sauvegardes `.pistis` chiffrables, hors ligne | ✅ 0.0.2 |
| M1 | Identité visuelle, accueil, tableau de bord, profil et paramètres, français/anglais | ✅ 0.1.0 |
| **M2** | **Projets : idées, modèles, assistant (objectif → Pourquoi → vision → plan), étapes, tâches, progression réelle, priorités du jour, ajout rapide** | ✅ **0.2.0** |
| M3 | Planning : semaine, agendas importés (.ics), tâches datées, itinéraires · reste : engagements récurrents, constance, rappels | 🟡 0.3.0 |
| M4 | Finances : comptes et opérations importés (OFX, CSV), mois en cours · reste : catégories, budgets, épargne liée aux projets | 🟡 0.3.0 |
| C1 | Connecteurs automatiques : banques via agrégateur agréé + relais, synchro Google Agenda / Outlook (voir docs/connecteurs.md) | à faire |
| M5 | Suivis : habitudes, indicateurs, revues hebdomadaires | à faire |
| M6 | Notifications locales, centre de notifications, revue du dimanche | à faire |
| M7 | Simulations (« et si… ») isolées des données réelles | à faire |
| P1 | Démarches administratives, logement, famille ; cinq modèles supplémentaires | à faire |
| A1 | Application Android (même interface, stockage SQLite natif) | à faire |

## Prochaines étapes concrètes (M3)

1. Table `commitment` (engagement récurrent : jours, horaire facultatif) et migration v4.
2. Écran Planning : semaine avec tâches datées et engagements ; glisser une tâche vers un autre jour.
3. Règle de constance : semaines tenues / semaines prévues, jamais de compteur remis à zéro par un oubli.
4. Revue du soir facultative : ce qui est fait, ce qui glisse à demain (choix de l'utilisateur).

## Versions web

- Installable (PWA hors ligne) : `npm run build`, à héberger en https (voir README).
- Hébergée (page ouverte par lien) : `npm run build:hosted` → `dist-hosted/pistis.html`.
