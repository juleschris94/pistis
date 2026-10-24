# Design system PISTIS

Identité « bleu nuit et cyan », inspirée du modèle visuel fourni le 25 octobre 2026 : thème sombre par défaut,
cartes arrondies, tuiles colorées, une action principale par écran, navigation à 5 onglets.
Tout est défini dans `src/design-system/tokens.css` ; aucun écran n'utilise de couleur en dur.

## Couleurs

| Rôle | Sombre (défaut) | Clair | Contraste vérifié |
| --- | --- | --- | --- |
| Fond | `#0F172A` | `#F1F5F9` | — |
| Carte | `#1E293B` | `#FFFFFF` | — |
| Surface relevée (champs, boutons secondaires) | `#334155` | `#E2E8F0` | — |
| Texte principal | `#F8FAFC` | `#0F172A` | 14:1 · 17:1 |
| Texte secondaire | `#94A3B8` | `#475569` | 5,7:1 · 7,6:1 |
| Cyan de marque (progression, éléments actifs) | `#00D1FF` | `#00B4E0` | — |
| Cyan utilisé comme texte (liens) | `#00D1FF` | `#0369A1` | 8:1 · 5,9:1 |
| Bouton principal | `#00D1FF` + texte `#0F172A` | idem | 9,8:1 |
| Violet (vision, projections) | `#7C3AED`, texte `#A78BFA` | texte `#6D28D9` | 5,4:1 · 7,1:1 |
| Succès | `#10B981` | `#047857` | 5,8:1 · 5,5:1 |
| Attention | `#F59E0B` | `#B45309` | 6,8:1 · 5:1 |
| Erreur | `#F87171` | `#B91C1C` | 5,3:1 · 6,5:1 |

Écarts volontaires par rapport au modèle :

- Texte blanc sur cyan illisible (1,8:1) : le bouton principal garde le cyan avec un texte bleu nuit.
- Rouge `#EF4444` trop sombre sur les cartes (3,9:1) : éclairci en `#F87171` pour le texte.
- Le rouge est réservé aux erreurs et actions destructrices, jamais à un objectif en retard ni à une dépense.

Domaines (tuiles, icônes) : fonds profonds pour un texte blanc lisible ≥ 5:1.

| Domaine | Couleur |
| --- | --- |
| Projets et carrière | `#2563EB` |
| Finances et épargne | `#047857` |
| Habitudes et bien-être | `#0F766E` |
| Démarches administratives | `#7C3AED` |
| Logement et patrimoine | `#C2410C` |
| Famille et quotidien | `#BE123C` |

## Typographie

Inter (police libre), embarquée dans l'application : aucun téléchargement externe, fonctionne hors ligne.
Seuls les alphabets latins sont mis en cache (français, anglais).

| Style | Taille | Graisse |
| --- | --- | --- |
| Titre 1 (`.p-display`) | 34 px | 700 |
| Titre 2 (`.p-title`) | 24 px | 650 |
| Titre 3 (`.p-heading`) | 20 px | 650 |
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

## Mise en page

- Téléphone : barre de 5 onglets en bas, contenu sur une colonne.
- Ordinateur (≥ 960 px) : barre latérale avec la marque, contenu centré (720 px maximum).
- Thèmes : Clair, Système, Sombre (réglage dans Profil → Apparence).
- Animations : 150 à 240 ms ; supprimées si l'appareil ou le réglage PISTIS demande des animations réduites.

## Ton

Tutoiement, phrases courtes, jamais de reproche. Aucune donnée inventée : un module pas encore construit
le dit clairement, avec le jalon où il arrive.
