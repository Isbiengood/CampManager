# Test zéro-à-un

Le test zéro-à-un vérifie qu'une installation CampManager peut fonctionner à partir de l'état actuel du dépôt, sans dépendre d'un ancien projet, d'un ancien jeton ou de données historiques.

## Préconditions

- dépôt CampManager à jour ;
- projet Supabase vierge ;
- migrations du dossier `supabase/migrations/` disponibles ;
- fonction Edge `campmanager-v4-bridge` disponible ;
- MASTER Open Source propre ;
- aucun code établissement, identifiant de classeur, jeton privé ni déclencheur installable dans le MASTER ;
- service avancé **Drive** activé dans Apps Script si l'on veut tester l'import `.xlsx`.

## Scénario de référence

1. Créer un projet Supabase vierge.
2. Appliquer toutes les migrations dans l'ordre.
3. Déployer `campmanager-v4-bridge`.
4. Exécuter le smoke test fourni dans `supabase/scripts/`.
5. Créer un code d'installation à usage unique.
6. Configurer l'application web avec la nouvelle URL Supabase et la clé publishable.
7. Prendre une copie propre du MASTER.
8. Lancer `testerCampManagerV4()` sur le MASTER et vérifier le mode MASTER.
9. Lancer l'installation d'un nouvel établissement depuis le menu CampManager.
10. Vérifier que le pont sécurisé confirme l'établissement.
11. Vérifier l'installation des déclencheurs.
12. Lancer de nouveau `testerCampManagerV4()` et vérifier le mode ÉTABLISSEMENT.
13. Ajouter des logements, du personnel et une gouvernante.
14. Générer un code d'activation.
15. Créer un PIN depuis l'application mobile.
16. Tester À faire → À vérifier.
17. Tester À vérifier → Prêt.
18. Vérifier le retour dans Google Sheets.
19. Tester Client en attente et la priorité ⚠️.
20. Tester le Secours Ménage Drive.
21. Tester code PIN oublié / réinitialisation.
22. Tester 5 erreurs de PIN et le verrouillage temporaire.
23. Tester la réactivation du compte.
24. Tester un départ anticipé puis une actualisation.
25. Tester au moins un import eSeason `.txt`.
26. Tester au moins un import eSeason `.xlsx` avec le service Drive actif.
27. Tester un import `.csv`.
28. Vérifier qu'un second établissement ne voit jamais le premier.
29. Révoquer un jeton de pont et vérifier le refus de synchronisation.

## Critères MASTER

Avant installation, `testerCampManagerV4()` doit notamment confirmer :

- absence de `CAMPMANAGER_V4_CAMPING_CODE` ;
- absence de `CAMPMANAGER_V4_SPREADSHEET_ID` ;
- absence de `CAMPMANAGER_V4_BRIDGE_TOKEN` ;
- absence de déclencheur installable ;
- absence d'ancienne propriété `service_role` ;
- absence de propriété `sb_secret`.

## Critères établissement

Après installation, le diagnostic doit retrouver une occurrence de chacun des déclencheurs attendus :

- `synchroniserCampManagerV4BidirectionnelSecurise20260827` ;
- `traiterControleGouvernanteManuelV4_20260907` ;
- `gererEditionSecoursDriveMenageV3210` ;
- `gererClientAttenteCampManager` ;
- `executerBasculeQuotidienneClientsReceptionV4` ;
- `nettoyagePersonnelAutomatique17h` ;
- `construireMenusCampManagerV4`.

## Déjà validé

Les étapes fonctionnelles principales ont déjà été validées sur un backend Supabase indépendant, notamment :

- téléphone réel ;
- verrouillage PIN ;
- réactivation ;
- transitions Ménage ;
- synchronisation Google Sheets ;
- départ anticipé.

## À réaliser pour la validation finale

La validation zéro-à-un complète doit encore être rejouée depuis l'état actuel du dépôt.

Les points particulièrement importants avant publication publique restent :

- compte Google neuf ;
- deuxième établissement réellement isolé ;
- révocation d'un jeton de pont ;
- imports eSeason réels représentatifs ;
- vérification finale de l'application web et du backend Supabase.
