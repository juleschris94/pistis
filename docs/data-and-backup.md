# Données, migrations et sauvegardes

## Où vivent les données

| Environnement | Moteur | Fichier |
| --- | --- | --- |
| Navigateur (PC, Android) | SQLite 3.54 WebAssembly, VFS OPFS « SAH pool » | `src/data/web/db.worker.ts` |
| Tests automatiques | Même moteur, en mémoire | `src/data/memoryDatabase.ts` |
| App Android (jalon M7) | SQLite natif via Capacitor | à venir |

Tous implémentent l'interface `Database` (`src/data/database.ts`) : `run`, `all`, `transaction`, `info`.
Le mode SAH pool ne demande aucun en-tête serveur particulier : PISTIS peut être hébergé sur n'importe quel site statique.

Si le stockage durable est indisponible (navigation privée), la base passe en mémoire et l'écran l'annonce clairement.

## Migrations

- Liste ordonnée dans `src/data/migrations.ts`, version courante dans `PRAGMA user_version`.
- Chaque migration s'exécute dans une transaction avec la mise à jour de version : jamais de base à moitié migrée.
- Une base plus récente que l'application est refusée avec un message.

Ajouter une migration : ajouter un objet `{ version: N+1, description, statements }` à la fin de la liste,
puis un test dans `src/data/migrations.test.ts`. Ne jamais modifier une migration existante.

## Format `.pistis` (version 1)

```
pistis-sauvegarde-AAAA-MM-JJ.pistis   archive ZIP
  manifest.json    format, versions d'app et de schéma, date, nombre de lignes, empreinte SHA-256 de chaque fichier
  data.json        toutes les tables sauvegardées, sans les colonnes binaires
  media/<id>/data  image principale
  media/<id>/thumb miniature
```

Chiffré : `PISTISENC1` | sel (16 octets) | IV (12 octets) | archive chiffrée AES-256-GCM, clé PBKDF2-SHA-256, 600 000 itérations.

### Validation avant restauration (rien n'est écrit avant)

1. Mot de passe correct et fichier non modifié (authentification AES-GCM).
2. Format et version reconnus ; schéma pas plus récent que l'application.
3. Chaque fichier présent avec la bonne empreinte ; aucun fichier inattendu.
4. Tables connues, nombre de lignes conforme au manifeste, chaque image présente.
5. Colonnes connues du schéma actuel.

Puis tout est remplacé en **une seule transaction** : en cas d'erreur, la base reste intacte.

## Risques lors des mises à jour

- Ajouter une table sans l'ajouter à `BACKUP_TABLES` = elle ne sera pas sauvegardée. Un test devra l'empêcher (M1).
- Changer le format `.pistis` impose d'incrémenter `BACKUP_FORMAT_VERSION` et de garder la lecture des anciennes versions.
