# Synchronisation GitHub vers le MASTER Apps Script

Le depot GitHub `main` contient les modules CampManager de reference.

Le workflow GitHub Actions **Mettre a jour le MASTER Apps Script** permet de
mettre a jour le projet Apps Script lie au tableur **CampManager - MASTER Open Source**
sans recopier les fichiers un par un.

## Principe de securite

Le workflow commence toujours par cloner le MASTER actuel.

Il conserve donc :

- le manifeste `appsscript.json` reel du MASTER ;
- les fichiers locaux qui ne sont pas geres par le depot ;
- notamment `04_Configuration_CampManager.gs`.

Ensuite, il remplace uniquement les fichiers `.gs` presents a la racine de
`apps-script/`.

Le fichier :

`04_Configuration_CampManager.example.gs`

est volontairement ignore afin de ne jamais ecraser la configuration reelle
du MASTER.

Les fichiers du dossier `apps-script/legacy/` ne sont jamais deployes.

## Authentification Google

Le workflow attend un secret GitHub nomme :

`CLASPRC_JSON`

Sa valeur doit etre le contenu complet du fichier `~/.clasprc.json` cree
apres une connexion `clasp login` avec le compte Google ayant acces au MASTER.

Ne jamais enregistrer ce contenu dans le depot GitHub.

## Utilisation

Dans GitHub :

1. ouvrir **Actions** ;
2. choisir **Mettre a jour le MASTER Apps Script** ;
3. cliquer sur **Run workflow** ;
4. choisir d'abord **verification** ;
5. si la verification est correcte, relancer avec **deploiement**.

Le mode `verification` ne modifie pas le MASTER.

Le mode `deploiement` execute `clasp push --force` vers le projet Apps Script
du MASTER.

## Identifiant du MASTER

Le workflow cible actuellement le projet Apps Script :

`1tLlIsjUxATHQkWVXwrzCaBcyUvxqeI1Uh5vb7oqVD9fK_GSJ_vatgQB1`

L'identifiant de script n'est pas une cle d'authentification. L'acces reste
protege par l'autorisation Google contenue dans le secret `CLASPRC_JSON`.

## Regle de travail

Tant que CampManager n'est pas passe en processus de release stable, le
deploiement reste volontairement manuel depuis GitHub Actions.

Cela evite qu'un commit encore en cours de test modifie automatiquement le
MASTER.
