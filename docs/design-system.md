# Design system PISTIS

Identité « forêt et or », inspirée des modèles visuels fournis le 25 octobre 2026 : thème sombre par défaut,
cartes arrondies, tuiles colorées, une action principale par écran, navigation à 5 onglets.
Tout est défini dans `src/design-system/tokens.css` ; aucun écran n'utilise de couleur en dur.

## Couleurs

Identité « forêt et or », reprise du modèle visuel du 25 octobre 2026 : fond crème, vert forêt pour les actions,
or pour les accents. Thème clair par défaut, thème sombre « nuit forestière ». Contrastes mesurés sur les cartes.

| Rôle | Clair (défaut) | Sombre | Contraste |
| --- | --- | --- | --- |
| Fond | `#F8F3EA` crème | `#081A17` | — |
| Carte | `#FFFCF6` ivoire | `#102C27` | — |
| Surface relevée (champs, boutons secondaires) | `#F4EDE1` | `#173A33` | — |
| Texte principal | `#12302B` | `#F7F1E6` | 13,8:1 · 13,2:1 |
| Texte secondaire | `#5C6662` | `#B5C2BA` | 5,8:1 · 8:1 |
| Bouton principal | vert forêt `#0E524B`, texte crème | or `#E6BB84`, texte `#10231F` | 8,8:1 · 9,2:1 |
| Liens | `#0E6B5F` | `#7FD3B0` | 6,2:1 · 8,4:1 |
| Progression réelle | `#0E524B → #2FA37C` | `#2FA37C → #8FE0BD` | décoratif |
| Or (vision imaginée, étoile du logo) | `#C9965A`, texte `#8A5A1F` | `#E6BB84` | 5,8:1 · 9,3:1 |
| Bouton « + » | or `#B9824A → #A26C35`, signe blanc | or clair, signe forêt | ≥ 3,4:1 (icône) |
| Positif | `#177356` | `#4CC79A` | 5,2:1 · 7:1 |
| Attention (échéance dépassée) | `#A84D14` terre cuite | `#F2A35E` | 5,6:1 · 7,2:1 |
| Alerte (erreurs, suppression) | `#B83A2E` | `#F2786A` | 5,6:1 · 5,4:1 |

**Carte mise en avant** (priorités du jour) : forêt profonde `#123B35` avec un halo doré, comme l'en-tête du
tableau de bord du modèle. Elle redéfinit les jetons pour son contenu (texte crème, liens et bouton dorés) :
les composants qu'elle contient s'adaptent seuls, contrastes ≥ 6:1.

Règles :

- Le rouge (alerte) est réservé aux erreurs et aux actions destructrices, jamais à une tâche en retard ni à une dépense :
  une échéance dépassée s'affiche en terre cuite.
- `--text-muted` ne s'utilise que sur le fond de page, jamais pour un texte important.
- L'or signale ce qui est **imaginé** (vision) et les accents ; la progression réelle reste verte.

Domaines : tuiles et icônes en pastel teinté (13 % de la couleur), icône dans la couleur pleine (≥ 4:1).

| Domaine | Clair | Sombre |
| --- | --- | --- |
| Projets et carrière | `#9A5F22` bronze | `#D9A05F` |
| Finances et épargne | `#0E6B55` vert | `#4CC79A` |
| Habitudes et bien-être | `#B14D3A` corail | `#EC8A72` |
| Démarches administratives | `#6A5F9E` lavande | `#AB9EE3` |
| Logement et patrimoine | `#3F6F8F` ardoise | `#7FB3D6` |
| Famille et quotidien | `#557228` olive | `#A4C46E` |

Illustrations (`VisionArt.tsx`, `HeroArt.tsx`) : scènes originales en SVG aux couleurs forêt, crème et or ;
aucune image téléchargée. Logo : « P » vert sur fond clair, crème et or sur fond sombre (jetons `--logo-*`).

## Typographie

Inter (police libre), embarquée dans l'application : aucun téléchargement externe, fonctionne hors ligne.
Seuls les alphabets latins sont mis en cache (français, anglais).

| Style | Taille | Graisse |
| --- | --- | --- |
| Affichage (`.p-display`) | 36 px | 700 |
| Titre d'écran | 30 px | 700 |
| Titre 2 (`.p-title`) | 24 px | 650 |
| Titre 3 (`.p-heading`) | 20 px | 650 |
| Titre de carte | 17 px | 650 |
| Corps | 16 px | 400 |
| Petit texte (`.p-subtle`) | 14 px | 400 |
| Légende (`.p-caption`) | 12 px | 400 |

Espacements sur une grille de 4 px. Rayons : 20 px (cartes), 18 px (tuiles), 14 px (boutons, champs), pilule (onglets segmentés).

## Composants (`src/design-system/components.tsx`)

| Composant | Usage |
| --- | --- |
| `PTopBar` | Titre d'écran, retour, actions à droite |
| `PCard` (variantes `accent`, `vision`) | Bloc de contenu ; `accent` = priorité du jour, `vision` = encouragement |
| `PButton`, `PButtonLink`, `PIconButton` | Actions (principale, secondaire, discrète, destructrice, claire) |
| `PField`, `PFileButton`, `PSegmented` | Saisie, choix de fichier, choix exclusif (radio) |
| `PTile` | Tuile de domaine sélectionnable |
| `PList`, `PListRow`, `PIconBox` | Listes de réglages et de sections |
| `PRing`, `PBar`, `PSteps` | Progression (anneau, barre, étapes d'un parcours) |
| `PCheck`, `PBadge`, `PMessage`, `PEmpty` | États, étiquettes, messages, écrans vides honnêtes |
| `PAvatar`, `LogoMark` | Photo de profil, marque PISTIS |
| `PScreen`, `PErrorBoundary` | Écrans pleins (chargement, erreur) |
| `PTextArea`, `PSelect`, `PChip` | Texte long, liste déroulante, puce sélectionnable (`aria-pressed`) |
| `PSheet` | Panneau du bas (ajout rapide) : focus, Échap et clic à l'extérieur ferment |
| `VisionArt` | Illustration de vision d'un projet |
| `ProjectCard`, `TaskRow` (`src/features/projects/ui.tsx`) | Carte de projet, ligne de tâche (case, épingle, suppression) |

## Mise en page

- Téléphone : barre de 5 onglets en bas, contenu sur une colonne.
- Ordinateur (≥ 960 px) : barre latérale avec la marque, contenu centré (720 px maximum).
- Thèmes : Clair (défaut), Système, Sombre (réglage dans Profil → Apparence).
- Animations : 150 à 240 ms ; supprimées si l'appareil ou le réglage PISTIS demande des animations réduites.

## Ton

Tutoiement, phrases courtes, jamais de reproche. Aucune donnée inventée : un module pas encore construit
le dit clairement, avec le jalon où il arrive.
