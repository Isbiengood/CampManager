# Jeux de tests d'import

Ces fichiers sont **entièrement fictifs**.

Ils servent uniquement à développer le futur import multi-format sans disposer actuellement d'un véritable export eSeason.

## Couverture actuelle

- TXT séparé par tabulations avec deux lignes de préambule ;
- TXT séparé par point-virgule ;
- TXT séparé par `|` avec champs entre guillemets ;
- CSV séparé par virgules.

Le parseur expérimental doit reconnaître dans chaque cas :

- client ;
- arrivée ;
- départ ;
- hébergement / emplacement ;
- catégorie.

## Ce que ces tests ne prouvent pas

Ils ne prouvent **pas** encore la compatibilité réelle avec l'export TXT eSeason.

Cette compatibilité sera marquée validée uniquement après essai sur un véritable export eSeason, de préférence anonymisé.

Les tests binaires `.xls` et `.xlsx` seront ajoutés lors de l'intégration du module complet d'import.
