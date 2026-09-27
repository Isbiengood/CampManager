# Apps Script

Ce dossier contient l'export propre du projet Apps Script lié au **MASTER Open Source** de CampManager.

## Référence actuelle

Architecture actuelle : **CampManager V4 Open Source multi-établissement**.

Référence de diagnostic : **99_Tests.gs — V4.3 Open Source (26/09/2026)**.

Le MASTER sert de modèle propre : il ne doit contenir ni association à un établissement, ni jeton privé d'établissement, ni déclencheur installable d'exploitation.

## Modules actifs

- `00_Constantes.gs` — constantes métier communes
- `04_Configuration_CampManager.example.gs` — exemple public de configuration, sans secret
- `05_Installation_CampManager.gs` — installation guidée d'un établissement
- `10_Menu.gs` — menus CampManager
- `16_Nettoyage_Personnel_17h.gs` — nettoyage automatique ciblé
- `20_Import.gs` — import eSeason XLSX / TXT / CSV
- `22_Synchronisation.gs` — synchronisation Import vers Base
- `23_Sauvegarde.gs` — sauvegardes et réinitialisation
- `30_Reception.gs` — feuille Réception
- `31_Menage.gs` — feuille Ménage
- `32_Planning_Arrivees_Reception_V1.gs` — planning arrivées / départs
- `33_Statistiques.gs` — statistiques
- `34_Tableau_Bord.gs` — tableau de bord
- `40_Historique_Menage.gs` — historique ménage
- `50_Rapport_Menage.gs` — rapport ménage
- `75_MiseEnForme.gs` — mise en forme
- `80_Utilitaires.gs` — utilitaires
- `90_OnEdit.gs` — logique onEdit principale
- `91_Menage_Secours_Drive.gs` — mode de secours Ménage sur Drive
- `94_Controle_Gouvernante_Manuel_V4.gs` — contrôle gouvernante manuel
- `95_Aide.gs` — page d'aide par rôle
- `95b_Client_Attente.gs` — gestion client en attente
- `96_Supabase_V4_Synchronisation.gs` — logique métier de synchronisation V4
- `96_Supabase_V4_Synchronisation_Drive.gs` — ancien point d'entrée neutralisé
- `96b_Pont_Supabase_OpenSource.gs` — client du pont Supabase sécurisé
- `97_Maintenance.gs` — maintenance et back-office des accès
- `98_Multi_Camping_OpenSource.gs` — synchronisation sécurisée multi-établissement
- `99_Tests.gs` — diagnostics non destructifs

## Règles de sécurité

- aucun `service_role` ou secret Supabase ne doit être codé dans Apps Script ;
- le jeton privé d'un établissement est stocké uniquement dans les **Propriétés du script** ;
- le MASTER ne doit pas contenir `CAMPMANAGER_V4_CAMPING_CODE`, `CAMPMANAGER_V4_SPREADSHEET_ID` ni `CAMPMANAGER_V4_BRIDGE_TOKEN` ;
- aucun déclencheur installable d'établissement ne doit être présent dans le MASTER ;
- la synchronisation automatique sécurisée ne doit pas reconstruire globalement la feuille Réception.

## Compatibilité

Certains noms de fonctions internes conservent volontairement des suffixes historiques afin d'éviter des régressions entre modules.

Les anciens modules qui ne sont plus actifs sont conservés dans `legacy/`.

Le parseur texte expérimental a été intégré dans `20_Import.gs` ; son ancienne version autonome est désormais archivée dans `legacy/`.
