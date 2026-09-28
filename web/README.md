# Application mobile web

Cette partie contient l'interface mobile CampManager utilisée par le personnel de ménage et les gouvernantes.

## Fichiers

- `index.html` — interface mobile ;
- `app-v4.js` — connexion, affichage des tâches et validations ;
- `pin-v4.js` — première activation et création du PIN ;
- `config.example.js` — modèle de configuration multi-établissement.

## Configuration

1. Copier `config.example.js` vers `config.js`.
2. Renseigner :
   - l'URL du projet Supabase ;
   - la clé Supabase **publishable**.
3. Héberger les quatre fichiers sur un site statique HTTPS.
4. Ouvrir l'application avec :
   `?camping=code-etablissement`.

Exemple :

```text
https://example.org/campmanager/?camping=etablissement-du-lac
```

## API utilisée

L'application appelle directement les RPC multi-établissement actuels :

- `connexion_multicamping_v4` ;
- `creer_pin_avec_activation_multicamping_v4` ;
- `charger_logements_multicamping_v4` ;
- `avancer_etat_menage_multicamping_v4` ;
- `deconnexion_multicamping_v4`.

Il n'y a plus de couche de compatibilité avec les anciens RPC `*_preprod_v4`.

Le paramètre technique `?camping=` est conservé pour compatibilité avec les liens générés par CampManager, mais il représente le code de l'établissement.

## Sécurité

Le navigateur peut contenir une clé Supabase **publishable**.

Il ne doit jamais contenir :

- de clé `service_role` ;
- de clé `sb_secret_...` ;
- de jeton privé Apps Script / bridge ;
- de code d'installation actif.

Le contexte de l'établissement est contrôlé côté serveur par CampManager ; le paramètre technique `camping` de l'URL n'est pas, à lui seul, une preuve d'autorisation.

## Fonctions validées

- première activation ;
- connexion PIN ;
- oubli / renouvellement d'accès ;
- verrouillage après erreurs ;
- réactivation ;
- liste des tâches ;
- À faire → À vérifier ;
- À vérifier → Prêt ;
- fonctionnement multi-établissement.

## Synchronisation

Le mobile écrit dans Supabase immédiatement. Le retour vers Google Sheets est asynchrone et peut prendre environ **1 à 2 minutes** suivant le passage du déclencheur Apps Script.
