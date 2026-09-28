# Jeux de tests d'import

Ces fichiers sont **entièrement fictifs** et ne contiennent aucune donnée réelle.

Ils servent à vérifier le parseur multi-format de CampManager indépendamment du logiciel de réservation utilisé par l'établissement.

## Couverture actuelle

- `generic-tabulations.txt` — TXT séparé par tabulations avec deux lignes de préambule ;
- `generic-point-virgule.txt` — TXT séparé par point-virgule ;
- `generic-pipe-preambule.txt` — TXT séparé par `|`, avec préambule et champ entre guillemets ;
- `generic-comma.csv` — CSV séparé par virgules.

Le parseur actif se trouve dans `apps-script/20_Import.gs`.

Il doit reconnaître dans chaque cas :

- client ;
- arrivée ;
- départ ;
- hébergement / emplacement ;
- catégorie.

## Ce que ces fichiers valident

Ils permettent de vérifier les cas synthétiques suivants :

- détection de la ligne d'en-têtes ;
- détection du séparateur ;
- lecture de plusieurs variantes de noms de colonnes ;
- gestion des champs entourés de guillemets ;
- lecture des accents et des caractères français.

Le diagnostic Apps Script `testerImportMultiformatCampManagerV4()` couvre également ces quatre familles de séparateurs sans modifier les données métier.

## Limites

Ces fixtures synthétiques ne prouvent pas à elles seules la compatibilité avec tous les logiciels de réservation.

Avant publication ou ajout d'un nouveau logiciel, il faut tester au moins un export réel anonymisé représentatif.

Le format `.xlsx` est pris en charge par `20_Import.gs`, avec le service avancé Google Drive activé dans Apps Script. Aucun fichier binaire `.xlsx` n'est conservé ici pour le moment.

Le format historique `.xls` n'est pas pris en charge directement.
