# Supabase

Ce dossier contient le backend Supabase Open Source de CampManager.

## Contenu

- `migrations/` — schéma SQL, API mobile, API Drive / administration, bootstrap sécurisé et correctifs de sécurité ;
- `functions/campmanager-v4-bridge/` — Edge Function servant de pont sécurisé entre Apps Script et Supabase ;
- `scripts/` — création d'un code d'installation et smoke test ;
- `config.toml` — configuration locale Supabase CLI.

## Migrations

Les migrations doivent être appliquées dans l'ordre :

1. `0001_core.sql` — tables principales, contraintes, index de base et RLS ;
2. `0002_mobile_api.sql` — RPC utilisés par l'application mobile ;
3. `0003_drive_admin_api.sql` — RPC serveur pour la synchronisation Google Drive et l'administration ;
4. `0004_secure_bootstrap.sql` — jetons du pont, codes d'installation et bootstrap sécurisé ;
5. `0005_security_and_indexes.sql` — correctifs de sécurité, compteurs d'échecs persistants et index complémentaires.

Aucune migration ne doit contenir de données réelles d'établissement.

## Pont Edge sécurisé

La fonction Edge active est :

`functions/campmanager-v4-bridge/index.ts`

Elle assure notamment :

- le bootstrap initial d'un nouvel établissement à partir d'un code d'installation à usage unique ;
- l'authentification des appels Apps Script avec un jeton CampManager privé ;
- la résolution du contexte établissement côté serveur ;
- la limitation des RPC autorisés ;
- l'injection côté serveur du code établissement afin qu'un client ne puisse pas choisir librement un autre établissement.

Le jeton privé d'un établissement est stocké dans les **Propriétés du script Apps Script**. Sa valeur brute n'est pas stockée dans la base : Supabase conserve son empreinte SHA-256.

## `verify_jwt = false`

Dans `config.toml`, l'Edge Function utilise :

```toml
[functions.campmanager-v4-bridge]
verify_jwt = false
```

C'est volontaire.

Le pont n'utilise pas le JWT Supabase standard pour authentifier Apps Script. Il applique son propre mécanisme d'authentification CampManager :

- code d'installation à usage unique pour le bootstrap ;
- en-tête `x-campmanager-token` pour les appels d'un établissement déjà installé.

Le pont refuse ensuite tout RPC qui ne figure pas dans sa liste blanche.

## Secrets serveur

La fonction Edge lit les secrets uniquement depuis l'environnement Supabase.

Variables utilisées :

- `SUPABASE_URL` ;
- `SUPABASE_SECRET_KEYS` si disponible ;
- `SUPABASE_SERVICE_ROLE_KEY` uniquement comme compatibilité avec les anciens projets.

Aucune valeur de clé serveur ne doit être committée dans GitHub, placée dans Apps Script ou exposée dans le navigateur.

## Sécurité SQL

Les tables sensibles utilisent RLS et les accès directs de `anon` / `authenticated` sont révoqués.

Les RPC mobiles nécessaires sont exécutables par `anon`, mais vérifient le PIN ou une session CampManager.

Les RPC Drive / administration et les fonctions de bootstrap sont réservés à `service_role` et sont appelés uniquement depuis l'Edge Function.

Les fonctions `SECURITY DEFINER` utilisent un `search_path` explicite.

## Installation

Après création d'un projet Supabase vierge :

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Déployer ensuite le pont :

```bash
supabase functions deploy campmanager-v4-bridge
```

Puis exécuter le smoke test fourni dans `scripts/smoke_test.sql`.

## Code d'installation

Le script `scripts/create_installation_code.sql` génère un code à usage unique.

Le code brut est renvoyé une seule fois. Seule son empreinte SHA-256 est conservée dans Supabase.

## Règle de dépôt

Aucune donnée réelle, aucun jeton privé et aucun secret serveur ne doit être committé.
