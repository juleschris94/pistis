# Idées d'amélioration retenues

Chaque idée sert une des cinq questions de PISTIS et respecte ses valeurs (local, sans culpabilisation,
réel avant projeté). Elles sont rattachées au jalon où elles coûtent le moins à construire.

## Déjà intégrées dans M0 (version 0.0.2)

| Idée | Pourquoi |
| --- | --- |
| Un seul onglet à la fois, avec « Continuer ici » | Deux onglets ouverts pouvaient faire perdre des saisies sans prévenir |
| Annuler une restauration | Une erreur de fichier ne doit jamais coûter ses données |
| Sauvegarde relue avant d'être proposée | On ne livre jamais un fichier illisible |
| Âge de la dernière sauvegarde affiché, rappel au-delà de 14 jours | Sans cloud, la sauvegarde est la seule protection contre la perte du téléphone |
| « Enregistrer sous » sur ordinateur | Choisir directement une clé USB ou un dossier synchronisé |
| Politique de sécurité qui bloque tout envoi de données | La promesse « 100 % local » devient vérifiable, pas seulement déclarée |
| Mise à jour proposée, jamais imposée | Un rechargement automatique pouvait effacer un formulaire en cours |
| Écran clair si l'adresse n'est pas en https | Évite une page blanche quand on teste depuis le Wi-Fi |

## À construire

| Idée | Question servie | Coût | Jalon |
| --- | --- | --- | --- |
| **Revue de la semaine guidée (5 min)** : ce qui a avancé, rappel des Pourquoi, choix des 3 priorités de la semaine suivante | Est-ce que je progresse ? | Moyen | M3 |
| **Capacité de la semaine** : heures disponibles déclarées comparées au temps estimé planifié ; message doux si la semaine déborde, proposition de reporter | Quelles actions méritent mon attention ? | Faible | M3 |
| **Capture depuis n'importe quelle app Android** : « Partager vers PISTIS » un texte ou un lien devient une idée ; raccourcis sur l'icône (« Nouvelle idée », « Nouvelle dépense ») | Organiser sans friction | Faible | M2 (raccourcis), M4 (dépense) |
| **Reste à vivre** : budget restant du mois ÷ jours restants, un seul chiffre sur l'Accueil | Où en suis-je aujourd'hui ? | Faible | M4 |
| **Échéancier des charges récurrentes** (loyer, abonnements, assurances) annoncées 3 jours avant | Anticiper au lieu de subir | Moyen | P1 |
| **Import CSV de relevé bancaire** (fichier exporté depuis la banque, aucune connexion) avec reconnaissance des catégories déjà utilisées | Réduire la saisie manuelle | Moyen | P1 |
| **Sauvegarde automatique hebdomadaire** dans un dossier choisi une fois (ordinateur) | Ne plus dépendre de la mémoire de l'utilisateur | Moyen | M6 |
| **Mode pause** : suspendre rappels et objectifs pendant une maladie ou des vacances, sans « retard » affiché ensuite | L'humain avant la performance | Faible | M6 |
| **Journal des réussites** alimenté par les jalons atteints et les projets terminés, relu dans les bilans | Reconnaître ses progrès | Faible | P2 |

## Écartées, et pourquoi

| Idée | Raison |
| --- | --- |
| Séries (« streaks ») et points | Une série cassée culpabilise ; contraire à « la santé et le repos avant la surcharge » |
| Coach IA intégré | Contraire au « sans IA intégrée » de la V1 et à la confidentialité |
| Justifier une dépense par rapport à un objectif | Le cahier des charges exclut toute « justification morale » des dépenses ordinaires |
| Synchronisation cloud | Hors V1 ; la sauvegarde `.pistis` couvre le passage d'un appareil à l'autre |
