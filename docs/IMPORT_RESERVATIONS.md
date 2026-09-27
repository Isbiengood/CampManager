# Import des réservations

## Formats pris en charge actuellement

Le module actif `20_Import.gs` accepte directement les exports de réservations suivants :

- `.txt` ;
- `.xlsx` ;
- `.csv`.

Le format historique `.xls` n'est pas pris en charge par le module actuel. Un ancien fichier `.xls` doit être enregistré en `.xlsx` avant import.

## Fonctionnement actuel

Le circuit métier est intégré au MASTER Open Source :

1. sélectionner le fichier ;
2. analyser son contenu sans modifier les réservations ;
3. afficher un bilan avant import ;
4. confirmer ou annuler ;
5. remplir la feuille `Import` ;
6. synchroniser `Import → Base` ;
7. actualiser les vues CampManager sans reconstruire inutilement la feuille Réception.

## Fichiers TXT / CSV

Le lecteur texte :

- accepte UTF-8 avec repli Windows-1252 ;
- détecte automatiquement le séparateur parmi tabulation, point-virgule, virgule et `|` ;
- recherche la ligne d'en-têtes dans les 30 premières lignes ;
- recherche les colonnes par leurs noms plutôt que par leur position fixe.

Les cinq informations nécessaires restent :

- nom client ;
- date d'arrivée ;
- date de départ ;
- numéro d'hébergement / emplacement ;
- catégorie.

## Fichiers XLSX

Les fichiers `.xlsx` sont convertis temporairement en Google Sheets afin de réutiliser le même lecteur de colonnes.

Cette conversion nécessite le service avancé Google Drive dans Apps Script :

`Services → + → Drive API → Ajouter`

Le fichier temporaire est supprimé à la fin du traitement.

## Sécurité métier

L'analyse précède toujours l'écriture définitive.

Le bilan d'import peut notamment distinguer :

- nouveaux séjours ;
- séjours modifiés ;
- séjours inchangés ;
- réactivations ;
- rapprochements avec réservations manuelles ;
- groupes multi-hébergements ;
- annulations détectées.

L'application de l'import utilise le verrou CampManager prévu par le module actif afin d'éviter deux traitements concurrents.

## Validation

Le parseur TXT / CSV est intégré dans `20_Import.gs` et l'ancienne version expérimentale autonome a été archivée dans `apps-script/legacy/`.

Avant publication publique, il reste utile de valider le fonctionnement avec des exports réels représentatifs, notamment :

1. un vrai export de réservations `.txt` ;
2. un vrai export de réservations `.xlsx` ;
3. un `.csv` ;
4. les accents et caractères français ;
5. un séjour multi-hébergements ;
6. un changement de logement ;
7. une annulation ;
8. un départ anticipé déjà en cours, afin de vérifier que l'import conserve la logique métier actuelle.

Le fichier du logiciel de réservation réel de test peut être anonymisé : les noms clients ne sont pas nécessaires pour vérifier le format.
