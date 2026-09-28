# Tests CampManager

Ce dossier regroupe les ressources de test qui ne font pas partie du code métier actif.

## Diagnostic Apps Script

Le diagnostic non destructif principal se trouve dans :

`apps-script/99_Tests.gs`

Fonctions principales :

- `testerCampManagerV4()` — cohérence générale du MASTER ou d'un établissement installé ;
- `testerDoubleRoleCampManagerV4()` — logique des doubles rôles ménage / gouvernante ;
- `testerImportMultiformatCampManagerV4()` — parseur TXT / CSV multi-format.

Ces diagnostics ne doivent pas modifier les réservations, Réception, Ménage ni Supabase.

## Fixtures d'import

Le dossier `import-fixtures/` contient uniquement des exports synthétiques et anonymes destinés au développement et à la vérification du parseur de réservations.

Ils sont volontairement indépendants d'un logiciel de réservation particulier.

Voir `import-fixtures/README.md` pour le détail.
