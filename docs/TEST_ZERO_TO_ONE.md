# Test zéro-à-un

Le test zéro-à-un vérifie qu'une installation CampManager peut fonctionner sans dépendre d'un ancien projet, d'un ancien jeton ou de données historiques.

## Scénario de référence

1. Créer un projet Supabase vierge.
2. Appliquer toutes les migrations.
3. Déployer `campmanager-v4-bridge`.
4. Exécuter le smoke test.
5. Créer un code d'installation.
6. Configurer l'application web avec la nouvelle URL et la clé publishable.
7. Prendre une copie propre du MASTER.
8. Lancer l'installation d'un établissement.
9. Ajouter des logements, du personnel et une gouvernante.
10. Générer un code d'activation.
11. Créer un PIN depuis l'application mobile.
12. Tester À faire → À vérifier.
13. Tester À vérifier → Prêt.
14. Vérifier le retour dans Google Sheets.
15. Tester code PIN oublié / réinitialisation.
16. Tester 5 erreurs de PIN et le verrouillage temporaire.
17. Tester la réactivation du compte.
18. Tester un départ anticipé puis une actualisation.
19. Vérifier qu'un second établissement ne voit jamais le premier.
20. Révoquer un jeton de pont et vérifier le refus de synchronisation.

## Déjà validé

Les étapes fonctionnelles principales, y compris le téléphone réel, le verrouillage PIN, la réactivation et le départ anticipé, ont été validées sur un backend Supabase indépendant.

Les tests d'isolation avec un second établissement et la validation finale avec un compte Google neuf restent à réaliser avant publication publique.
