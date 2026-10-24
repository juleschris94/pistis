# Design system PISTIS

Identité « bleu nuit, bleu et cyan, accent champagne », inspirée du modèle visuel fourni le 25 octobre 2026 et de la palette officielle : thème sombre par défaut,
cartes arrondies, tuiles colorées, une action principale par écran, navigation à 5 onglets.
Tout est défini dans `src/design-system/tokens.css` ; aucun écran n'utilise de couleur en dur.

## Couleurs

Palette officielle du cahier des charges (jalon M2). Contrastes mesurés sur les cartes (`#10243B` en sombre, blanc en clair).

| Rôle | Sombre (défaut) | Clair | Contraste |
| --- | --- | --- | --- |
| Fond | `#07121F` | `#F5F8FC` | — |
| Fond creusé | `#0B1B2E` | `#EDF3F9` | — |
| Carte | `#10243B` | `#FFFFFF` | — |
| Surface relevée (champs, boutons secondaires) | `#172F49` | `#E6EEF7` | — |
| Texte principal | `#F7FAFC` | `#132236` | 15:1 · 16:1 |
| Texte secondaire | `#9EB0C5` | `#607389` | 7,1:1 · 4,9:1 |
| Cyan de marque (progression, accents) | `#00C7FF` | idem | — |
| Bleu de marque, utilisé comme texte (liens) | `#5AA3FF` | `#1769E8` | 6,1:1 · 5:1 |
| Bouton principal | dégradé `#2E8BFF → #00C7FF`, texte `#07121F` | dégradé `#1769E8 → #1F6FEB`, texte blanc | ≥ 5,6:1 · ≥ 4,6:1 |
| Violet (vision imaginée) | `#865CFF`, texte `#A68BFF` | — | 5,8:1 |
| Champagne (étoile du logo, épingle du jour) | `#FFD08A` | — | décoratif |
| Positif | `#10BFA5` | `#0A7563` | 6,7:1 · 5,6:1 |
| Attention (échéance dépassée) | `#FFB547` | `#965A00` | 8,9:1 · 5,6:1 |
| Alerte (erreurs, suppression) | `#FF5964` | `#C42B3A` | 5,1:1 · 5,6:1 |

Règles :

- Le rouge (alerte) est réservé aux erreurs et aux actions destructrices, jamais à une tâche en retard ni à une dépense :
  une échéance dépassée s'affiche en ambre.
- `--text-muted` (`#70849C`) ne s'utilise que sur le fond de page (4,9:1), jamais sur une carte.
- Le violet signale ce qui est **imaginé** (vision) ; la progression réelle reste en bleu/cyan.

Domaines (tuiles, icônes, bannières de projet) : fonds profonds pour un texte blanc lisible ≥ 5:1.

| Domaine | Couleur |
| --- | --- |
| Projets et carrière | `#1F6FEB` |
| Finances et épargne | `#0B7A69` |
| Habitudes et bien-être | `#00799E` |
| Démarches administratives | `#6D45E0` |
| Logement et patrimoine | `#A85A00` |
| Famille et quotidien | `#C42B3A` |

Illustrations de vision (`src/design-system/VisionArt.tsx`) : six scènes originales en SVG (sommet, ville, maison,
route, bibliothèque, horizon), aucune image téléchargée. L'utilisateur peut les remplacer par sa propre photo
(métadonnées supprimées).

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
- Thèmes : Clair, Système, Sombre (réglage dans Profil → Apparence).
- Animations : 150 à 240 ms ; supprimées si l'appareil ou le réglage PISTIS demande des animations réduites.

## Ton

Tutoiement, phrases courtes, jamais de reproche. Aucune donnée inventée : un module pas encore construit
le dit clairement, avec le jalon où il arrive.
