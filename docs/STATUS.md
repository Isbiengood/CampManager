# État du projet

## Référence fonctionnelle actuelle

La référence validée est issue de **Test CampManager Supabase indépendant**, puis figée dans **CampManager – MASTER Open Source**.

Version métier de référence : **V4.2.7 — départs anticipés protégés**.

## Tests validés

- installation établissement sur backend Supabase indépendant ;
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

Le retour mobile → Google Sheets est asynchrone. En pratique, un délai proche de 1 à 2 minutes peut être observé selon le moment où passe le déclencheur Apps Script.

Ce comportement est acceptable pour l'usage terrain actuel et n'est pas traité comme un bug bloquant.

## À faire avant publication publique

1. Exporter tous les fichiers Apps Script du MASTER.
2. Vérifier l'absence de secrets et d'identifiants historiques.
3. Nettoyer les derniers noms internes hérités qui ne doivent plus apparaître publiquement.
4. Finaliser l'identité OAuth Google CampManager.
5. Faire un test avec un compte Google neuf.
6. Créer un second établissement et confirmer l'isolation croisée.
7. Tester la révocation d'un jeton de pont.
8. Confirmer la licence finale.
