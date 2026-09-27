# Installation Google Sheets / Apps Script

## Parcours actuel

Le MASTER Open Source sert de modèle technique propre.

Le parcours prévu pour un nouvel établissement est :

```text
Faire une copie propre du MASTER
→ ouvrir CampManager
→ lancer « Installer un nouvel établissement »
→ saisir le nom de l'établissement
→ confirmer / ajuster le code établissement
→ saisir le code d'installation à usage unique
→ autoriser Google si nécessaire
→ bootstrap sécurisé côté Supabase
→ nettoyage des données du modèle
→ installation des déclencheurs
→ affichage du lien CampManager V4
→ renseigner logements et personnel
→ importer les réservations
```

L'utilisateur final ne doit pas avoir à modifier manuellement le code Apps Script.

## Modèle de référence

Le fichier **CampManager – MASTER Open Source** doit rester :

- sans données réelles d'établissement ;
- sans `CAMPMANAGER_V4_CAMPING_CODE` ;
- sans `CAMPMANAGER_V4_SPREADSHEET_ID` ;
- sans `CAMPMANAGER_V4_BRIDGE_TOKEN` ;
- sans déclencheur installable d'établissement.

Le MASTER contient uniquement le code et la configuration publique générique nécessaires à l'installation.

## Installation technique

Lors de l'installation d'une copie :

- le code d'installation à usage unique est envoyé au pont sécurisé ;
- le backend crée / associe l'établissement ;
- un jeton privé distinct est renvoyé ;
- ce jeton est stocké uniquement dans les **Propriétés du script** ;
- le pont est vérifié avant le nettoyage de la copie ;
- les propriétés locales de l'établissement sont enregistrées ;
- les déclencheurs nécessaires sont installés sous le compte de l'utilisateur ;
- le lien CampManager V4 correspondant à l'établissement est affiché en fin d'installation.

## Déclencheurs installés côté établissement

L'installation actuelle prévoit notamment :

- synchronisation V4 sécurisée ;
- contrôle gouvernante ;
- secours Ménage Drive ;
- gestion Client en attente ;
- bascule quotidienne ;
- nettoyage du personnel à 17 h ;
- menu partagé CampManager.

Le diagnostic `99_Tests.gs` vérifie qu'un établissement installé possède une occurrence de chacun des déclencheurs attendus.

## Service avancé Google Drive

Le module `20_Import.gs` utilise le service avancé **Drive** pour convertir les fichiers `.xlsx` en Google Sheets temporaires.

Dans le projet Apps Script, le service doit donc rester activé :

`Services → Drive`

Il n'est pas nécessaire pour l'import direct des fichiers `.txt` et `.csv`.

## Après installation

Les étapes métier suivantes sont :

1. renseigner les logements ;
2. renseigner le personnel et les gouvernantes ;
3. vérifier l'accès CampManager V4 ;
4. importer les réservations eSeason ;
5. lancer `testerCampManagerV4()` pour contrôler l'installation.

## Objectif futur

Automatiser davantage la création initiale du Google Sheet afin que l'utilisateur n'ait pas à effectuer lui-même une copie manuelle du MASTER.
