# Installation Supabase

> Document technique de préparation. Le parcours final devra être simplifié par un installateur.

## 1. Créer un projet Supabase vierge

Créer un projet appartenant à l'exploitant ou à l'organisation qui utilisera CampManager.

## 2. Appliquer les migrations

Les migrations seront stockées dans `supabase/migrations/` et doivent être appliquées dans l'ordre.

Avec Supabase CLI :

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 3. Déployer le pont Edge

La fonction cible est :

`supabase/functions/campmanager-v4-bridge/index.ts`

Le pont utilise son propre mécanisme d'authentification CampManager. Les secrets serveur restent dans l'environnement Supabase.

## 4. Tester

Exécuter le script de smoke test fourni dans `supabase/scripts/`.

## 5. Créer un code d'installation

Créer un code à usage unique, puis l'utiliser depuis le classeur Google Sheets lors de l'installation du nouvel établissement.

## 6. Application web

Configurer uniquement :

- URL Supabase ;
- clé Supabase publishable.

Aucune clé serveur ne doit être placée dans le navigateur.
