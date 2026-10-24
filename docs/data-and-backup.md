# Données, migrations et sauvegardes

## Où vivent les données

| Environnement | Moteur | Fichier |
| --- | --- | --- |
| Navigateur (PC, Android) | SQLite 3.54 WebAssembly, VFS OPFS « SAH pool », dans un Web Worker | `src/data/web/db.worker.ts` |
| Tests automatiques | Même moteur, en mémoire | `src/data/memoryDatabase.ts` |
| App Android (jalon M7) | SQLite natif via Capacitor | à venir |

Tous implémentent l'interface `Database` (`src/data/database.ts`) : `run`, `all`, `transaction`, `info`.
Le mode SAH pool ne demande aucun en-tête serveur particulier : PISTIS peut être hébergé sur n'importe quel site statique.

Si le navigateur ne propose aucun stockage durable (navigation privée), la base passe en mémoire et l'écran l'annonce.
Si le stockage existe mais ne s'ouvre pas, PISTIS affiche une erreur au lieu de basculer en mémoire :
basculer en silence ferait perdre tout ce qui serait saisi ensuite.

## Un seul onglet à la fois

Le stockage SAH pool n'accepte qu'une connexion. Le travailleur prend donc un verrou (Web Locks, `pistis-database`)
et le garde tant qu'il vit.

- Un second onglet attend ce verrou et affiche « PISTIS est déjà ouvert ailleurs ».
- « Continuer ici » envoie un message (BroadcastChannel `pistis-tabs`) : l'ancien onglet arrête son travailleur,
  ce qui libère le verrou, et affiche « PISTIS est ouvert dans un autre onglet » avec « Utiliser ici ».
- Les requêtes de l'ancien onglet sont rejetées proprement : aucune écriture n'est perdue en silence.

## Migrations

- Liste ordonnée dans `src/data/migrations.ts`, version courante dans `PRAGMA user_version`.
- Chaque migration s'exécute dans une transaction avec la mise à jour de version : jamais de base à moitié migrée.
- Une base plus récente que l'application est refusée avec un message.
- Une migration qui crée des données fournit `upgradeBackup` pour que les anciennes sauvegardes restent restaurables.

## Format `.pistis` (version 1)

```
pistis-sauvegarde-AAAA-MM-JJ.pistis   archive ZIP
  manifest.json    format, versions d'app et de schéma, date, nombre de lignes, empreinte SHA-256 de chaque fichier
  data.json        toutes les tables sauvegardées, sans les colonnes binaires
  media/<id>/data  image principale
  media/<id>/thumb miniature
```

Chiffré : `PISTISENC1` | sel (16 octets) | IV (12 octets) | archive chiffrée AES-256-GCM, clé PBKDF2-SHA-256, 600 000 itérations.

Chaque sauvegarde exportée est **relue et validée avant d'être proposée** : on ne livre jamais un fichier illisible.
Sur ordinateur, une fenêtre « Enregistrer sous » permet de choisir un dossier hors de l'appareil ; sinon, téléchargement.

### Validation avant restauration (rien n'est écrit avant)

1. Taille raisonnable (512 Mo maximum, 1 Go décompressé, 20 000 fichiers) : un fichier piégé est refusé.
2. Mot de passe correct et fichier non modifié (authentification AES-GCM).
3. Seuls les chemins attendus sont acceptés (`manifest.json`, `data.json`, `media/<uuid>/data|thumb`).
4. Format et version reconnus ; schéma pas plus récent que l'application ; manifeste complet.
5. Chaque fichier présent avec la bonne empreinte ; aucun fichier inattendu.
6. Tables connues, nombre de lignes conforme, valeurs uniquement texte, nombre ou vide, identifiants valides.
7. Mise à niveau des données d'une sauvegarde plus ancienne, puis colonnes vérifiées contre le schéma actuel.

Puis tout est remplacé en **une seule transaction**. Juste avant, l'état actuel est copié en mémoire :
« Annuler la restauration » le remet en place.

## Images

`MEDIA_REFERENCES` (`src/features/media/mediaRepository.ts`) liste toutes les colonnes qui pointent vers une image.
Une image n'est supprimée que si plus aucune d'elles ne la référence, dans la même transaction que le changement.

## Risques lors des mises à jour

- Ajouter une table sans l'ajouter à `BACKUP_TABLES` = elle ne sera pas sauvegardée.
- Ajouter une colonne d'image sans l'ajouter à `MEDIA_REFERENCES` = l'image peut être effacée par erreur.
- Changer le format `.pistis` impose d'incrémenter `BACKUP_FORMAT_VERSION` et de garder la lecture des anciennes versions.
