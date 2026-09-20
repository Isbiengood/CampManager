# Security

## Secrets à ne jamais publier

Ne jamais committer :

- clés Supabase `service_role` ;
- clés `sb_secret_...` ;
- `CAMPMANAGER_V4_BRIDGE_TOKEN` ;
- codes d'installation actifs ;
- données réelles de clients ou de personnel ;
- exports réels de réservations.

## Configuration navigateur

Une clé Supabase **publishable** / **anon** est conçue pour être utilisée côté navigateur.

CampManager ne repose pas sur cette clé pour prouver l'identité d'un établissement : l'autorisation sensible est effectuée par les RPC, les sessions PIN, le RLS et le pont serveur.

## Pont Edge

`campmanager-v4-bridge` utilise une authentification CampManager dédiée :

- bootstrap par code d'installation aléatoire à usage unique ;
- trafic Apps Script normal via `x-campmanager-token` ;
- le jeton brut n'est pas stocké en base : seule son empreinte est conservée ;
- le jeton est résolu côté serveur vers un seul établissement ;
- le code établissement fourni par l'appelant n'est pas une preuve d'autorisation.

## Base de données

Les tables CampManager utilisent RLS.

Les appels mobiles autorisés sont limités aux RPC explicitement prévus pour l'application. Les fonctions Drive, administration et bootstrap restent côté serveur.

## Signalement d'une vulnérabilité

Le dépôt est encore privé. Avant publication publique, un canal de signalement privé sera indiqué ici.
