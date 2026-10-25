# Connecteurs PISTIS

Objectif : automatiser et relier les données de la vie courante (banques, agendas, déplacements, santé)
sans jamais affaiblir la sécurité des comptes de l'utilisateur.

## Règle de base

PISTIS ne demande, ne stocke et ne transmet **jamais** d'identifiants bancaires, et ne contourne jamais une
double authentification. En France et dans l'Union européenne, seuls des prestataires agréés (DSP2, « AISP »)
peuvent lire des comptes pour le compte d'un client, via les interfaces officielles des banques. Se connecter
à la place de l'utilisateur avec ses codes exposerait ses comptes en cas de fuite et peut lui faire perdre
la protection de sa banque en cas de fraude.

## État (version 0.3.0)

| Connecteur | Disponible | Comment |
| --- | --- | --- |
| Banques : La Banque Postale, BoursoBank, Hello bank!, Revolut, LCL, Crédit Agricole, BNP Paribas, Swile, autres | Oui | Import de relevés OFX ou CSV, lus dans l'appareil (`src/features/finance`) |
| Banques : connexion automatique | Non, en préparation | Agrégateur agréé + relais (voir plus bas) |
| Google Agenda, Outlook, Apple Calendrier | Oui | Import `.ics` (et `.zip` de Google), répétitions et fuseaux (`src/features/agenda`) |
| Google Agenda, Outlook : synchronisation | Non, en préparation | OAuth directement depuis l'appareil |
| Google Maps, Plans, Waze | Oui | Bouton « Y aller » : simple lien, aucune donnée envoyée par PISTIS |
| Apple Santé, Health Connect | Non | Accessibles uniquement depuis une application installée (application Android) |

## Banques : connexion automatique

### Ce que voit l'utilisateur

1. Dans PISTIS, il choisit sa banque.
2. Il est redirigé vers la page officielle de sa banque, s'y connecte et valide avec sa double authentification.
3. Ses comptes et opérations arrivent dans PISTIS en lecture seule, puis se mettent à jour automatiquement
   (la réglementation autorise jusqu'à 4 consultations par jour sans action de l'utilisateur).
4. Tous les 180 jours, la banque redemande une validation.

### Architecture

```
Téléphone / ordinateur (PISTIS)  ──►  Relais PISTIS (serveur léger)  ──►  Agrégateur agréé  ──►  Banque
   données stockées ici                 garde la clé de l'agrégateur,        (DSP2)
                                        ne conserve pas les opérations
```

- La clé d'accès de l'agrégateur ne peut pas être dans l'application web (elle serait lisible par tous) :
  un relais est indispensable. Il ne stocke que l'identifiant de consentement, jamais les opérations.
- Les opérations sont stockées dans la base locale, dans les mêmes tables que l'import
  (`account`, `bank_transaction`), avec la même règle anti-doublon.
- La politique de sécurité de l'application autorisera uniquement l'adresse du relais.

### Choix de l'agrégateur (PISTIS destiné à d'autres utilisateurs)

| Prestataire | Points forts | À vérifier |
| --- | --- | --- |
| Powens (ex-Budget Insight, français) | Très bonne couverture des banques françaises | Contrat et tarif sur devis |
| Bridge (français) | Spécialiste du marché français | Contrat et tarif sur devis |
| Tink (Visa), Yapily, Salt Edge | Couverture européenne | Offres entreprises |
| Enable Banking | Mode gratuit « restreint » pour ses propres comptes, utile pour le prototype | Offre commerciale pour d'autres utilisateurs |

GoCardless Bank Account Data (ex-Nordigen) n'accepte plus de nouvelles inscriptions.
Swile n'apparaît pas dans les couvertures vérifiées : l'import de fichier reste la solution.

### Prérequis avant ouverture à d'autres utilisateurs

- Contrat avec l'agrégateur (c'est lui qui porte l'agrément DSP2 ; PISTIS agit comme son client).
- Politique de confidentialité et registre RGPD : données bancaires = données sensibles pour l'utilisateur.
- Hébergement du relais en Europe, journalisation minimale, chiffrement des identifiants de consentement.
- Tests de sécurité du relais avant mise en production.

## Agendas : synchronisation

- Google Agenda : OAuth depuis le navigateur (pas de secret côté serveur), lecture seule.
  Le mode « test » de Google limite à 100 utilisateurs et expire les autorisations au bout de 7 jours ;
  au-delà, une vérification de l'application par Google est nécessaire.
- Outlook : Microsoft Graph avec une application inscrite gratuitement (OAuth avec PKCE), lecture seule.
- Les événements iront dans les tables actuelles (`calendar_source`, `calendar_event`).

## Santé

Apple Santé (HealthKit) et Health Connect (Android) n'ont pas d'accès web. La nouvelle API santé de Google
(ex-API Fitbit) exige une revue de sécurité, et l'API Google Fit est en cours de fermeture. Le connecteur santé
viendra avec l'application Android (jalon A1), via Health Connect, avec l'accord explicite de l'utilisateur pour
chaque type de donnée.

## Sources

- Couverture et authentification des banques françaises : https://enablebanking.com/docs/markets/fr/
- Mode restreint pour ses propres comptes : https://docs.firefly-iii.org/tutorials/data-importer/eb/
- Fin des inscriptions GoCardless : https://dev.to/johnfrandsen/gocardless-bank-account-data-alternatives-what-to-use-when-signups-are-disabled-326d
- API santé de Google : https://developers.google.com/health/about
