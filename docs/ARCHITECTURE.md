# Architecture autonome

## Google Sheets

Source de vérité opérationnelle pour :

- réservations ;
- état Réception ;
- affectations ;
- logements ;
- personnel ;
- suivi du ménage.

## Supabase

Couche mobile et multi-établissement pour :

- comptes PIN ;
- sessions ;
- tâches ;
- validations mobile ;
- file d'actions vers Google Sheets ;
- séparation des établissements.

## Edge Function

Le pont Edge évite qu'un Google Sheet possède une clé serveur Supabase.

Chaque classeur possède uniquement un jeton CampManager privé dans les Propriétés du script. Le pont convertit ce jeton en contexte établissement côté serveur.

## Isolation

Le navigateur n'écrit pas directement dans les tables sensibles.

Apps Script n'utilise pas de clé `service_role` côté classeur.

Un jeton de pont d'un établissement A ne doit jamais permettre d'accéder aux données de B : le contexte établissement est résolu côté serveur.

## Installation

Un code d'installation :

- est aléatoire ;
- expire ;
- n'est utilisable qu'une fois ;
- est stocké en base uniquement sous forme d'empreinte.

Le bootstrap crée l'établissement et son jeton de pont.

## Modèle

Le schéma open source ne doit contenir aucun établissement réel précréé ni aucune donnée réelle.
