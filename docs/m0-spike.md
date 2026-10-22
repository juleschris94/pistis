# Jalon M0 — spike technique web

## Utilité

Prouver, sur un vrai navigateur, que la pile choisie (PWA React + SQLite WebAssembly) tient les
promesses du cahier des charges avant de construire les fonctionnalités.

## Les preuves et leur état

| Preuve | Comment elle est vérifiée | État au 23/10/2026 |
| --- | --- | --- |
| Base SQLite persistante | OPFS « SAH pool », données relues après rechargement | Validé (Chromium automatisé) |
| Migrations | v1 → v2 appliquées au démarrage, test de migration d'une base v1 existante | Validé |
| Hors ligne | Service worker, rechargement réseau coupé | Validé (Chromium automatisé) |
| Photo sans métadonnées | JPEG avec position GPS importé, image stockée sans EXIF, miniature 320 px | Validé |
| Sauvegarde | Export chiffré, mauvais mot de passe refusé, restauration dans un navigateur vierge | Validé |
| Stockage protégé contre l'effacement | `navigator.storage.persist()` | **À vérifier sur ton Android** (non accordé en test automatisé) |
| Installation PWA sur PC et Android | Bouton « Installer » du navigateur | **À vérifier à la main** sur la version https |

## Ce qu'il te reste à tester (10 minutes)

1. Ouvre la version en ligne (https) sur ton PC dans Chrome ou Edge, crée ton profil, installe l'app.
2. Fais de même sur ton téléphone Android dans Chrome.
3. Sur le téléphone : mode avion, ferme l'app, rouvre-la → elle doit s'ouvrir avec ton profil.
4. Appuie sur « Demander le stockage protégé » une fois l'app installée → la ligne doit passer au vert.
5. Exporte une sauvegarde chiffrée sur le téléphone, envoie-la sur le PC, restaure-la dans un autre navigateur.

Note les résultats dans ce fichier. M0 est terminé quand les sept lignes sont validées.

## Fichiers

- `src/data/web/db.worker.ts` — moteur SQLite dans un Web Worker
- `src/data/migrations.ts` — schéma versionné
- `src/features/media/` — contrôle et ré-encodage des images
- `src/features/backup/` — format `.pistis`, chiffrement
- `src/app/TestBench.tsx` — écran des vérifications (provisoire)
- `tests/e2e_m0.py` — parcours automatisé

## Limites connues

- Chiffrement des sauvegardes : PBKDF2-SHA-256 (600 000 itérations) + AES-256-GCM. Argon2id est prévu plus tard.
- Les données de la base elle-même ne sont pas encore chiffrées dans le navigateur (code de déverrouillage : jalon M6).
- Photos HEIC (iPhone) refusées avec un message clair : Chrome ne sait pas les décoder.
