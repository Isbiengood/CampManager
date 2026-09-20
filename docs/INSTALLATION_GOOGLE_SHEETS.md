# Installation Google Sheets / Apps Script

## Parcours cible

L'utilisateur final ne devrait pas avoir à modifier manuellement du code.

Parcours souhaité :

```text
Installer CampManager
→ nom de l'établissement
→ autorisation Google
→ code d'installation
→ création / configuration
→ utilisation
```

## Modèle de référence

Le fichier **CampManager – MASTER Open Source** sert de modèle technique.

Il doit rester :

- sans données réelles ;
- sans jeton d'établissement ;
- sans propriétés de script privées ;
- sans déclencheur installé appartenant au développeur.

## Installation technique actuelle

Une copie du modèle reçoit sa propre configuration d'établissement.

L'installateur doit ensuite :

- créer l'établissement dans le backend ;
- recevoir un jeton privé distinct ;
- stocker ce jeton uniquement dans les Propriétés du script ;
- créer les déclencheurs Apps Script sous le compte de l'utilisateur ;
- produire le lien / QR code de l'application mobile.

## Objectif futur

Automatiser la création du Google Sheet afin que l'utilisateur n'ait pas à effectuer lui-même une copie manuelle du modèle.
