# Import des réservations

## Formats à prendre en charge

CampManager doit accepter directement les exports de réservations suivants :

- `.txt` — format utilisé par eSeason ;
- `.xls` — ancien format Excel ;
- `.xlsx` — format Excel actuel ;
- `.csv` — accepté en complément.

## Situation actuelle

L'ancien module d'import eSeason était limité au format `.xlsx`.

Le module multi-format doit conserver le même circuit métier :

1. sélectionner le fichier ;
2. analyser son contenu sans modifier les réservations ;
3. afficher un bilan avant import ;
4. confirmer ou annuler ;
5. remplir la feuille `Import` ;
6. synchroniser `Import → Base` ;
7. actualiser les vues CampManager sans réintroduire les anciennes régressions de Réception.

## Fichiers TXT / CSV

Le lecteur texte doit :

- accepter UTF-8 et Windows-1252 ;
- détecter automatiquement le séparateur parmi tabulation, point-virgule, virgule et `|` ;
- tolérer quelques lignes de préambule avant les en-têtes ;
- rechercher les colonnes par leurs noms plutôt que par leur position fixe.

Les cinq informations nécessaires restent :

- nom client ;
- date d'arrivée ;
- date de départ ;
- numéro d'hébergement / emplacement ;
- catégorie.

## Fichiers XLS / XLSX

Les fichiers Excel peuvent être convertis temporairement en Google Sheets pour réutiliser le même lecteur de colonnes.

Le fichier temporaire doit être supprimé après confirmation ou annulation.

## Sécurité métier

L'analyse doit toujours précéder l'écriture définitive.

Le bilan doit notamment indiquer :

- nombre de séjours ;
- période couverte ;
- nouveaux séjours ;
- séjours modifiés ;
- séjours inchangés ;
- réactivations ;
- rapprochements avec réservations manuelles ;
- groupes multi-hébergements ;
- annulations détectées.

## Validation requise

Avant d'intégrer le nouveau lecteur au MASTER, tester au minimum :

1. un vrai export eSeason `.txt` ;
2. un `.xls` ;
3. un `.xlsx` ;
4. les accents et caractères français ;
5. un séjour multi-hébergements ;
6. un changement de logement ;
7. une annulation ;
8. un départ anticipé déjà en cours, afin de vérifier qu'un import n'annule pas la logique V4.2.7.

Le fichier eSeason réel de test peut être anonymisé : les noms clients ne sont pas nécessaires pour vérifier le format.
