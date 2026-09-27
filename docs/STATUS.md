# État du projet

## Référence actuelle

La base Apps Script du **CampManager – MASTER Open Source** a été nettoyée et synchronisée dans le dépôt.

Référence de diagnostic Apps Script : **`99_Tests.gs` — V4.3 Open Source (26/09/2026)**.

L'architecture actuelle est une version V4 Open Source multi-établissement avec :

- Google Sheets comme source opérationnelle ;
- Supabase pour la couche mobile et multi-établissement ;
- pont Edge sécurisé ;
- jeton privé par établissement stocké dans les Propriétés du script ;
- synchronisation automatique V4 sans reconstruction globale de Réception.

## Apps Script

Le noyau actif est présent dans `apps-script/`.

Les anciens modules qui ne sont plus actifs ont été déplacés dans `apps-script/legacy/`.

Le parseur TXT / CSV expérimental autonome a été intégré dans `20_Import.gs` puis archivé.

Le fichier historique `96_Supabase_V4_Synchronisation_Drive.gs` est conservé sous forme neutralisée ; le moteur actif est `96_Supabase_V4_Synchronisation.gs` avec le client sécurisé `96b_Pont_Supabase_OpenSource.gs`.

## Diagnostic MASTER

Le diagnostic V4.3 contrôle notamment que le MASTER :

- n'est associé à aucun établissement ;
- ne possède aucun déclencheur installable ;
- ne possède pas de `CAMPMANAGER_V4_SPREADSHEET_ID` ;
- ne possède pas de `CAMPMANAGER_V4_BRIDGE_TOKEN` ;
- ne contient pas d'ancienne propriété `service_role` ;
- ne contient pas de propriété `sb_secret`.

## Import des réservations

Le module actif accepte :

- `.txt` ;
- `.xlsx` ;
- `.csv`.

Le format `.xls` historique n'est pas pris en charge directement.

L'import `.xlsx` nécessite le service avancé Google Drive dans Apps Script.

Voir [Import des réservations](IMPORT_RESERVATIONS.md).

## Déjà validé dans l'environnement de test

Les validations déjà réalisées incluent notamment :

- installation d'un établissement sur backend Supabase indépendant ;
- ajout de logements et de personnel ;
- création d'accès mobile ;
- code PIN oublié / nouvel accès ;
- blocage après tentatives erronées ;
- réactivation du compte ;
- validation mobile depuis téléphone réel ;
- À faire → À vérifier ;
- À vérifier → Prêt ;
- synchronisation vers Google Sheets ;
- départ anticipé avant date théorique ;
- actualisation sans retour erroné vers Occupé ;
- conservation du nom et de la date théorique pendant l'état Parti.

## Délai de synchronisation

Le retour mobile → Google Sheets est asynchrone.

Avec le déclencheur Apps Script actuel, un délai proche de 1 à 2 minutes peut être observé selon le moment où passe la synchronisation automatique.

## Reste à vérifier avant publication publique

1. faire un test zéro-à-un complet depuis l'état actuel du dépôt ;
2. faire ce test avec un compte Google neuf ;
3. valider plusieurs exports eSeason réels (`.txt`, `.xlsx`, `.csv`) ;
4. créer un second établissement et confirmer l'isolation croisée ;
5. tester la révocation d'un jeton de pont ;
6. auditer la configuration Supabase et l'application web dans leur état actuel ;
7. finaliser l'identité OAuth Google CampManager ;
8. confirmer la licence finale.
