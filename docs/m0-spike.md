# Jalon M0 — spike technique web

## Utilité

Prouver, sur un vrai navigateur, que la pile choisie (PWA React + SQLite WebAssembly) tient les
promesses du cahier des charges avant de construire les fonctionnalités.

## Les preuves et leur état

| Preuve | Comment elle est vérifiée | État au 24/10/2026 |
| --- | --- | --- |
| Base SQLite persistante | OPFS « SAH pool », données relues après rechargement | Validé (téléphone et ordinateur simulés) |
| Migrations | v1 → v2 au démarrage ; restauration d'une sauvegarde v1 | Validé |
| Hors ligne | Service worker, rechargement réseau coupé | Validé |
| Photo sans métadonnées | JPEG 3000×2000 avec position GPS → 2048 px, miniature 320 px, aucun EXIF | Validé |
| Sauvegarde | Export chiffré, mauvais mot de passe refusé, restauration ailleurs, annulation | Validé |
| Un seul onglet à la fois | Second onglet en attente, reprise de la main, aucune perte | Validé |
| Aucune requête externe | Politique de sécurité + tests qui échouent à la moindre requête | Validé |
| Stockage protégé contre l'effacement | `navigator.storage.persist()` | **À vérifier sur ton Android** |
| Installation PWA sur PC et Android | Bouton « Installer » du navigateur | **À vérifier à la main** sur la version https |

## Ce qu'il te reste à tester (10 minutes)

1. Ouvre la version en ligne (https) sur ton PC dans Chrome ou Edge, crée ton profil, installe l'app.
2. Fais de même sur ton téléphone Android dans Chrome.
3. Sur le téléphone : mode avion, ferme l'app, rouvre-la → elle doit s'ouvrir avec ton profil.
4. Appuie sur « Demander le stockage protégé » une fois l'app installée → la ligne doit passer au vert.
5. Exporte une sauvegarde chiffrée sur le téléphone, envoie-la sur le PC, restaure-la, puis essaie « Annuler la restauration ».

Note les résultats dans ce fichier. M0 est terminé quand toutes les lignes sont validées.

## Fichiers

- `src/data/web/db.worker.ts` — moteur SQLite dans un Web Worker, verrou d'onglet
- `src/data/web/webDatabase.ts` — pilote côté interface, pannes et reprise d'onglet
- `src/data/migrations.ts` — schéma versionné
- `src/features/media/` — contrôle et ré-encodage des images
- `src/features/backup/` — format `.pistis`, chiffrement, enregistrement du fichier
- `src/app/environment.ts` — contrôle du navigateur avant démarrage
- `src/app/TestBench.tsx` — écran des vérifications (provisoire)
- `tests/m0.spec.ts` — parcours automatisés

## Limites connues

- Chiffrement des sauvegardes : PBKDF2-SHA-256 (600 000 itérations) + AES-256-GCM. Argon2id est prévu plus tard.
- La base elle-même n'est pas encore chiffrée dans le navigateur (code de déverrouillage : jalon M6).
- Photos HEIC (iPhone) refusées avec un message clair : Chrome ne sait pas les décoder.
- Safari/iOS non testé automatiquement (cible actuelle : Chrome et Edge).
