# Historique des versions

## 0.0.2-m0 — 24 octobre 2026

Revue complète du jalon M0 : fiabilité, sécurité, accessibilité et outillage.

### Corrigé

- Deux onglets ouverts : le second basculait en mémoire et ses saisies auraient été perdues. Un seul onglet
  utilise désormais la base, avec « Continuer ici » pour reprendre la main.
- Panne du moteur de données : l'écran restait bloqué sur « Ouverture… ». Une erreur claire s'affiche, avec « Réessayer ».
- Adresse `http://` sur le réseau local : page blanche. PISTIS explique maintenant qu'il faut du https.
- Photo et profil n'étaient pas enregistrés ensemble : une image pouvait rester orpheline. Tout passe en une transaction.
- Une sauvegarde d'une version plus ancienne perdait les paramètres par défaut. Les anciennes sauvegardes sont mises à niveau.
- Le « test de sauvegarde » comptait comme une vraie sauvegarde.
- Mise à jour automatique pouvant effacer un formulaire en cours : elle est désormais proposée.
- Texte blanc sur cyan illisible (contraste 2,5:1) : boutons principaux en cyan profond (5,6:1) ; couleurs d'état éclaircies en mode sombre.
- Message hors ligne qui masquait le haut de l'écran : notification discrète en bas, qui disparaît seule.
- Même fichier non sélectionnable deux fois de suite ; bouton de fichier natif en anglais selon l'appareil.

### Ajouté

- Restauration annulable ; sauvegarde relue avant d'être proposée ; « Enregistrer sous » sur ordinateur.
- Âge de la dernière sauvegarde et rappel bienveillant au-delà de 14 jours.
- Validation stricte des sauvegardes : chemins autorisés, tailles maximales, types de valeurs, manifeste complet.
- Politique de sécurité du contenu : l'application ne peut contacter aucun autre site.
- Erreurs de formulaire par champ, reliées aux lecteurs d'écran, avec focus sur le premier champ en faute.
- Écran de secours en cas d'erreur inattendue.
- ESLint, Prettier, tests navigateur Playwright en TypeScript (téléphone et ordinateur), CI complète.
- 37 tests unitaires et 8 parcours navigateur.

## 0.0.1-m0 — 23 octobre 2026

Jalon M0, spike technique web : PWA hors ligne, SQLite OPFS, migrations, onboarding, photo sans métadonnées,
sauvegardes `.pistis`, écran de vérification.
