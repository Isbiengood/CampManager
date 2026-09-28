# CampManager

**Open-source housekeeping and accommodation management system for campsites, hotels and holiday parks.**

CampManager associe Google Sheets / Apps Script, une application web mobile et Supabase pour gérer les hébergements, les départs, le ménage, les contrôles gouvernante et les accès du personnel.

> **État actuel : candidat open source privé — audit du dépôt effectué, validation zéro-à-un finale encore à réaliser avant publication publique.**

## Ce qui est déjà validé

- backend Supabase indépendant d'un ancien projet de production ;
- installation d'un nouvel établissement avec jeton privé dédié ;
- application mobile multi-établissement ;
- création et réinitialisation de PIN ;
- blocage temporaire après erreurs de PIN et réactivation d'accès ;
- circuit mobile **À faire → À vérifier → Prêt** ;
- retour des actions mobile vers Google Sheets ;
- maintien de l'état **Prêt / Libre** après actualisation ;
- gestion des départs anticipés ;
- test réalisé depuis un téléphone réel.

La synchronisation entre le mobile et Google Sheets est volontairement asynchrone et peut prendre environ 1 à 2 minutes selon le passage du déclencheur Apps Script.

## Architecture

```text
Google Sheets / Apps Script
        |
        | jeton privé établissement
        v
Supabase Edge Function
campmanager-v4-bridge
        |
        | clé serveur côté Edge uniquement
        v
PostgreSQL / RPC CampManager
        ^
        |
Application web mobile
clé publishable + session PIN
```

Le navigateur ne reçoit jamais de clé serveur Supabase ni de jeton privé Apps Script.

## Organisation du dépôt

- `apps-script/` — logique Google Sheets / Apps Script ;
- `web/` — source générique de l'application web mobile ;
- `supabase/` — migrations, Edge Function et scripts d'administration ;
- `docs/` — architecture, installation, état du projet et protocole de validation ;
- `tests/` — documentation de test et fixtures synthétiques d'import.

Les anciens modules Apps Script conservés uniquement pour historique sont rangés dans `apps-script/legacy/`.

## Import des réservations

Le module actif accepte :

- `.txt` ;
- `.xlsx` ;
- `.csv`.

Le format historique `.xls` n'est pas pris en charge directement.

Pour les fichiers `.xlsx`, le service avancé **Google Drive** doit être activé dans Apps Script. Les fichiers `.txt` et `.csv` sont lus directement.

Le parseur recherche les colonnes utiles par leur nom et n'est pas lié à un logiciel de réservation unique. Des exports réels représentatifs doivent néanmoins être testés avant d'annoncer la compatibilité avec un logiciel donné.

## Sécurité

Le dépôt ne doit jamais contenir :

- de clé Supabase `service_role` ou `sb_secret_...` ;
- de jeton privé d'établissement ;
- de code d'installation actif ;
- de données réelles de clients ou de personnel ;
- d'export réel de réservations.

Le pont Edge résout le jeton Apps Script vers un seul établissement côté serveur et limite les RPC accessibles.

Voir [SECURITY.md](SECURITY.md).

## MASTER Open Source

Le classeur **CampManager – MASTER Open Source** sert de modèle technique de référence.

Il doit rester :

- sans données réelles d'établissement ;
- sans `CAMPMANAGER_V4_CAMPING_CODE` ;
- sans `CAMPMANAGER_V4_SPREADSHEET_ID` ;
- sans `CAMPMANAGER_V4_BRIDGE_TOKEN` ;
- sans déclencheur installable appartenant à un établissement.

Le diagnostic non destructif de référence est `testerCampManagerV4()` dans `apps-script/99_Tests.gs`.

## État de l'audit du dépôt

Les zones suivantes ont été revues et mises en cohérence avec l'architecture actuelle :

- Apps Script actif et modules legacy ;
- documentation `docs/` ;
- backend `supabase/` ;
- application `web/` ;
- ressources `tests/`.

La couche web appelle désormais directement les RPC multi-établissement actuels, sans adaptateur `*_preprod_v4`.

## Avant publication publique

Restent notamment à réaliser :

1. rejouer le test zéro-à-un complet depuis l'état actuel du dépôt ;
2. effectuer ce test avec un compte Google neuf ;
3. tester plusieurs exports réels anonymisés de réservations (`.txt`, `.xlsx`, `.csv`) ;
4. créer un second établissement et confirmer l'isolation croisée ;
5. tester la révocation d'un jeton de pont ;
6. valider la configuration déployée Supabase et l'application web dans un environnement neuf ;
7. finaliser l'identité OAuth Google CampManager ;
8. choisir et ajouter la licence finale ;
9. compléter le canal privé de signalement de vulnérabilités avant ouverture publique.

## Documentation

- [État du projet](docs/STATUS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Import des réservations](docs/IMPORT_RESERVATIONS.md)
- [Installation Supabase](docs/INSTALLATION_SUPABASE.md)
- [Installation Google Sheets](docs/INSTALLATION_GOOGLE_SHEETS.md)
- [Test zéro-à-un](docs/TEST_ZERO_TO_ONE.md)
- [Tests](tests/README.md)
