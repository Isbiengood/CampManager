# CampManager

**Open-source housekeeping and accommodation management system for campsites, hotels and holiday parks.**

CampManager associe Google Sheets / Apps Script, une application mobile web et Supabase pour gérer les hébergements, les départs, le ménage, les contrôles gouvernante et les accès du personnel.

> **État actuel : candidat open source privé — préparation avant publication publique.**

## Ce qui est déjà validé

- backend Supabase indépendant d'un ancien projet de production ;
- installation d'un nouvel établissement avec jeton privé dédié ;
- application mobile multi-établissement ;
- création et réinitialisation de PIN ;
- blocage temporaire après erreurs de PIN et réactivation d'accès ;
- circuit mobile **À faire → À vérifier → Prêt** ;
- retour des actions mobile vers Google Sheets ;
- maintien de l'état **Prêt / Libre** après actualisation ;
- gestion des **départs anticipés** (CampManager V4.2.7) ;
- test réalisé depuis un téléphone réel.

La synchronisation entre le mobile et Google Sheets est volontairement asynchrone et peut prendre environ 1 à 2 minutes.

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
Application mobile web
clé publishable + session PIN
```

## Organisation du dépôt

- `apps-script/` — logique Google Sheets / Apps Script ;
- `web/` — application mobile web ;
- `supabase/` — migrations, Edge Function et scripts d'administration ;
- `docs/` — architecture, installation et protocole de validation.

## Sécurité

Le dépôt ne doit jamais contenir :

- de clé Supabase `service_role` ou `sb_secret_...` ;
- de jeton privé d'établissement ;
- de code d'installation actif ;
- de données réelles de clients ;
- de données réelles d'un établissement.

Voir [SECURITY.md](SECURITY.md).

## Modèles Google Sheets

Le développement distingue volontairement plusieurs fichiers :

- **CampManager – MASTER Open Source** : modèle de référence sans données d'établissement ;
- **CampManager – DÉMO Open Source** : vitrine avec données fictives ;
- **Test CampManager Supabase indépendant** : environnement de validation technique.

Le classeur réel historique n'est pas utilisé comme base de publication.

## Avant publication publique

Restent à finaliser :

- export complet et propre du projet Apps Script du MASTER ;
- nettoyage des derniers noms internes hérités de l'ancien projet ;
- identité OAuth Google dédiée à CampManager ;
- test d'installation avec un compte Google neuf ;
- test d'un second établissement pour confirmer l'isolation complète ;
- choix et ajout de la licence finale.

## Documentation

- [État du projet](docs/STATUS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Installation Supabase](docs/INSTALLATION_SUPABASE.md)
- [Installation Google Sheets](docs/INSTALLATION_GOOGLE_SHEETS.md)
- [Test zéro-à-un](docs/TEST_ZERO_TO_ONE.md)
