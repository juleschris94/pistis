# Historique des versions

## 0.2.2 — 25 octobre 2026

Version web accessible par lien.

### Ajouté

- Version web hébergée (`npm run build:hosted`) : un seul fichier, ouvrable depuis un téléphone ou un ordinateur.
  Données gardées dans le navigateur (IndexedDB, écriture immédiate quand la page passe en arrière-plan).
- Sauvegardes depuis cette version : fichier `.pistis.zip` proposé par la fenêtre d'enregistrement de l'hôte ;
  la restauration accepte `.pistis` et `.pistis.zip`.
- Paquet prêt à héberger de la version installable (fonctionne aussi dans un sous-dossier).

### Modifié

- La version d'essai devient la version web : plus de bandeau « essai » ; les données déjà saisies sont gardées.
- Étape « Installer PISTIS » masquée là où l'installation est impossible.

## 0.2.1 — 25 octobre 2026

Nouvelle identité de couleurs « forêt et or », d'après le second modèle visuel.

### Modifié

- Thème clair crème par défaut ; thème sombre « nuit forestière ». Vert forêt pour les actions, or pour les accents,
  la vision et le bouton « + ».
- Priorités du jour dans une carte vert forêt avec bouton doré.
- Domaines en tuiles pastel avec icône colorée (bronze, vert, corail, lavande, ardoise, olive).
- Écran de bienvenue, illustrations de vision, logo et icônes de l'application recolorés.
- Contrastes vérifiés dans les deux thèmes (docs/design-system.md).

## 0.2.0-m2 — 25 octobre 2026

Jalon M2 : projets et priorités du jour, palette officielle, version d'essai.

### Ajouté

- Onglet Projets : projets en cours, idées et projets terminés, avec bannière illustrée, Pourquoi, avancement réel
  et prochaine action.
- Dix modèles de projets (créer son entreprise, projet professionnel, lire un livre, sport, budget, épargne,
  voiture, déménagement, logement, démarches) : objectif, exemples de Pourquoi, résultat visé, plan modifiable.
- Assistant en 4 étapes : objectif → Pourquoi (obligatoire) → vision imaginée (illustration ou photo) → plan.
- Fiche projet : étapes et tâches à cocher, ajouter, renommer, supprimer ; statut, archivage, suppression confirmée.
- Idées notées en quelques secondes, transformées plus tard en projet sans rien perdre.
- Priorités du jour sur l'accueil : trois au maximum, épingles de l'utilisateur toujours en tête, raison affichée.
- Bouton « + » sur tous les écrans : tâche rapide (avec ou sans projet), idée, projet.
- Base : migration v3 (tables `goal`, `milestone`, `task`), incluses dans les sauvegardes.
- Version d'essai en un seul fichier (`npm run build:demo`).
- Documentation : règles métier (`docs/business-rules.md`), feuille de route (`docs/roadmap.md`).

### Modifié

- Palette officielle : bleu nuit `#07121F`, bleu `#2E8BFF`, cyan `#00C7FF`, violet `#865CFF`, accent champagne ;
  logo P avec étoile champagne ; icônes régénérées. Contrastes vérifiés (docs/design-system.md).
- Erreurs de l'assistant affichées sous le champ concerné, qui reçoit le focus.
- 84 tests unitaires et 16 parcours navigateur.

## 0.1.0-m1 — 25 octobre 2026

Jalon M1 : fondations de l'application, nouvelle identité visuelle « bleu nuit et cyan ».

### Ajouté

- Design system complet : thème sombre par défaut et thème clair, police Inter embarquée, icônes, tuiles de domaine,
  anneau et barres de progression, onglets segmentés, listes, badges. Contrastes AA vérifiés (docs/design-system.md).
- Nouvelle marque et icône d'application ; écran de bienvenue illustré (dessin original).
- Accueil en deux étapes : besoins (6 domaines) puis profil ; « Déjà un espace ? » restaure une sauvegarde sur un nouvel appareil.
- Tableau de bord : semaine en cours, priorité du jour (prochaine étape réelle), message du jour, premiers pas, domaines actifs.
- Navigation à 5 onglets (bas sur téléphone, barre latérale sur ordinateur). Les modules à venir annoncent leur jalon.
- Profil et paramètres : domaines, apparence (clair / système / sombre, animations réduites), langue, sauvegardes,
  confidentialité et diagnostic de l'appareil. Centre de notifications (vide jusqu'au jalon M6).
- Français et anglais : tous les textes traduits, langue du navigateur proposée par défaut.
- Bouton d'installation de l'application quand le navigateur le permet.

### Modifié

- Les erreurs sont des codes traduits dans l'interface (plus aucun texte en dur dans la logique).
- Polices latines mises en cache pour le hors ligne.
- 54 tests unitaires et 12 parcours navigateur.

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
