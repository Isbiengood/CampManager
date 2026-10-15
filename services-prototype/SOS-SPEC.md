# CampManager SOS — spécification de sécurité (projet)

## Principe
Accessible au personnel et aux clients, visible sur le portail mobile. Ne remplace jamais les secours (112, 18, 15). Ne pas présenter une demande comme reçue sans accusé de réception du serveur.

## Parcours
1. Afficher immédiatement **Appeler le 112** (lien `tel:112`) et consignes de sécurité adaptées, sans retarder l'appel.
2. Proposer une alerte interne complémentaire : incendie/fumée, accident/blessure, personne en danger, autre urgence.
3. Demander emplacement et description courte ; ne pas bloquer l'appel aux secours si ces champs manquent.
4. À l'envoi : obtenir confirmation du serveur, ID d'alerte et heure ; en cas d'échec réseau, afficher **Alerte NON transmise — appelez le 112 et la réception**.
5. Diffuser aux responsables habilités via plusieurs canaux configurés et surveillés, avec accusé de prise en charge et escalade si absence de réponse.
6. Conserver une piste d'audit et protéger les données sensibles, limiter les faux signalements, contrôler les accès et la rétention.

## Conditions avant activation réelle
Tests de bout en bout, procédures de permanence et d'escalade, formation, contacts vérifiés, vérification juridique/RGPD, scénarios hors ligne, test de charge, prévention des doublons et tests de sécurité. **Aucun bouton d'alerte interne actif dans le prototype tant que ces conditions ne sont pas remplies.**
