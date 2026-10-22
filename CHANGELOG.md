# Historique des versions

## 0.0.1-m0 — 23 octobre 2026

Jalon M0, spike technique web.

- PWA installable, hors ligne après le premier chargement (service worker Workbox).
- SQLite 3.54 WebAssembly persistant dans le navigateur (OPFS, VFS SAH pool), dans un Web Worker.
- Schéma versionné : v1 (profil, médias, journal des sauvegardes), v2 (paramètres).
- Onboarding : bienvenue puis profil local (prénom, nom, pseudo, phrase, photo).
- Photos : contrôle du type réel, refus HEIC, redimensionnement 2048 px, miniature 320 px, suppression des métadonnées EXIF.
- Sauvegardes `.pistis` : export, chiffrement facultatif, vérification complète, restauration atomique.
- Écran de vérification M0.
- 17 tests unitaires et un parcours navigateur automatisé.
