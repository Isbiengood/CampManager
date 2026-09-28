/**
 * =========================================================
 * CAMPMANAGER
 * CONSTANTES GÉNÉRALES DU PROJET
 * VERSION 4.1 OPEN SOURCE — 25/09/2026
 * =========================================================
 *
 * Constantes communes aux modules CampManager.
 *
 * La priorité ⚠️ « Client en attente » fait désormais partie
 * des constantes officielles du projet.
 */


/**
 * Noms exacts des feuilles Google Sheets.
 */
const FEUILLES = {
  IMPORT: "Import",
  BASE: "Base",
  RECEPTION: "Réception",
  MENAGE: "Ménage",
  STATISTIQUES: "Statistiques",
  TABLEAU_BORD: "Tableau de bord",
  PARAMETRES: "Paramètres",
  LOGEMENTS: "Logements"
};


/**
 * Organisation commune des feuilles.
 *
 * Ligne 4 : en-têtes
 * Ligne 5 : première ligne de données
 */
const LIGNES = {
  ENTETES: 4,
  DEBUT: 5
};


/**
 * Origine d'une réservation.
 */
const ORIGINE_RESERVATION = {
  IMPORT: "Import",
  MANUELLE: "Manuelle"
};


/**
 * Colonnes de la feuille Import.
 *
 * Quel que soit le format source (.xlsx / .txt / .csv),
 * le module 20_Import normalise les données dans ces cinq colonnes :
 *
 * A Nom client
 * B Date arrivée
 * C Date départ
 * D N° emplacement
 * E Catégorie
 */
const COLONNES_IMPORT = {
  NOM_CLIENT: 1,
  DATE_ARRIVEE: 2,
  DATE_DEPART: 3,
  LOGEMENT: 4,
  CATEGORIE: 5,

  NOMBRE_COLONNES: 5
};


/**
 * Colonnes de la feuille Base.
 *
 * A ID séjour technique
 * B Nom client
 * C Date arrivée
 * D Date départ
 * E N° emplacement
 * F Catégorie
 * G État réservation
 * H Dernière synchronisation
 * I Origine
 *
 * IMPORTANT :
 * NUMERO_RESERVATION reste volontairement défini comme alias
 * de ID_SEJOUR afin que les autres modules existants
 * (Réception, archivage, recontrôle...) continuent à fonctionner
 * sans modification.
 */
const COLONNES_BASE = {
  ID_SEJOUR: 1,

  /*
   * Alias de compatibilité.
   * Alias historique conservé pour compatibilité.
   */
  NUMERO_RESERVATION: 1,

  NOM_CLIENT: 2,
  DATE_ARRIVEE: 3,
  DATE_DEPART: 4,
  LOGEMENT: 5,
  CATEGORIE: 6,
  ETAT_RESERVATION: 7,
  DERNIERE_SYNCHRONISATION: 8,
  ORIGINE: 9,

  NOMBRE_COLONNES: 9
};


/**
 * Colonnes de la feuille Réception.
 *
 * A Priorité
 * B N° logement
 * C Catégorie
 * D Client actuel
 * E Départ
 * F Client suivant
 * G Arrivée suivante
 * H État
 * I Personnel
 * J Gouvernante
 * K Téléphone attente
 * L Dernier contrôle
 * M Départ réel — colonne technique masquée
 */
const COLONNES_RECEPTION = {
  PRIORITE: 1,
  LOGEMENT: 2,
  CATEGORIE: 3,
  CLIENT_ACTUEL: 4,
  DEPART: 5,
  CLIENT_SUIVANT: 6,
  ARRIVEE_SUIVANTE: 7,
  ETAT: 8,
  PERSONNEL: 9,
  GOUVERNANTE: 10,
  TELEPHONE_ATTENTE: 11,
  DERNIER_CONTROLE: 12,
  DEPART_REEL: 13,

  NOMBRE_COLONNES: 13
};


/**
 * Colonnes de la feuille Logements.
 *
 * A N° logement
 * B Catégorie
 */
const COLONNES_LOGEMENTS = {
  LOGEMENT: 1,
  CATEGORIE: 2,

  NOMBRE_COLONNES: 2
};


/**
 * Colonnes de la feuille Paramètres.
 *
 * A États réception
 * C États ménage
 * E Priorités
 *
 * G Personnel
 * H Statut personnel
 * I Personnel disponible
 *
 * K Paramètre
 * L Valeur
 *
 * N Gouvernantes
 * O Statut gouvernante
 * P Gouvernantes disponibles
 */
const COLONNES_PARAMETRES = {
  ETATS_RECEPTION: 1,
  ETATS_MENAGE: 3,
  PRIORITES: 5,

  PERSONNEL: 7,
  STATUT_PERSONNEL: 8,
  PERSONNEL_DISPONIBLE: 9,

  PARAMETRE: 11,
  VALEUR_PARAMETRE: 12,

  GOUVERNANTES: 14,
  STATUT_GOUVERNANTE: 15,
  GOUVERNANTES_DISPONIBLES: 16
};


/**
 * Emplacements des paramètres généraux.
 */
const CELLULES_PARAMETRES = {
  LIBELLE_DELAI_RECONTROLE: "K4",
  DELAI_RECONTROLE: "L4"
};


/**
 * Valeurs par défaut.
 */
const CONFIGURATION = {
  DELAI_RECONTROLE_JOURS: 2
};


/**
 * Statuts possibles du personnel.
 */
const STATUT_PERSONNEL = {
  ACTIF: "Actif",
  EXTRA: "Extra",
  INACTIF: "Inactif"
};


/**
 * Statuts possibles des gouvernantes.
 */
const STATUT_GOUVERNANTE = {
  ACTIF: "Actif",
  EXTRA: "Extra",
  INACTIF: "Inactif"
};


/**
 * Configuration du personnel.
 */
const PERSONNEL = {
  SEPARATEUR: "/"
};


/**
 * Configuration des gouvernantes.
 */
const GOUVERNANTES = {
  SEPARATEUR: "/"
};


/**
 * Colonnes métier principales de la feuille Ménage.
 *
 * A N° logement
 * B Personnel
 * C Priorité
 * D Accès
 * E État ménage
 * F État réception — colonne technique cachée
 *
 * IMPORTANT :
 * NOMBRE_COLONNES reste volontairement à 6.
 * Les colonnes physiques G/H utilisées par le secours Drive
 * sont gérées séparément par le module Ménage et ne font pas
 * partie de la structure métier principale.
 */
const COLONNES_MENAGE = {
  LOGEMENT: 1,
  PERSONNEL: 2,
  PRIORITE: 3,
  ACCES: 4,
  ETAT_MENAGE: 5,
  ETAT_RECEPTION: 6,

  NOMBRE_COLONNES: 6
};


/**
 * États d'accès au logement dans la feuille Ménage.
 */
const ACCES_MENAGE = {
  PRESENT: "🟨",
  PARTI: "🟩",
  PRET: "⬜"
};


/**
 * Légende Ménage.
 */
const LEGENDE_MENAGE = {
  PRIORITES:
    "Priorités : ⚠️ Client en attente | 🔴 Départ + arrivée | " +
    "🔵 À faire | 🟣 À recontrôler | ⚪ Prêt",

  ACCES:
    "Accès : 🟨 Client présent | 🟩 Client parti | " +
    "⬜ Logement prêt"
};


/**
 * États possibles d'une réservation dans Base.
 */
const ETAT_RESERVATION = {
  ACTIVE: "Active",
  ANNULEE: "Annulée",
  ARCHIVEE: "Archivée"
};


/**
 * Configuration de l'archivage annuel.
 */
const ARCHIVAGE = {
  MOT_CONFIRMATION_SUPPRESSION: "SUPPRIMER"
};


/**
 * États utilisés par la réception.
 */
const ETAT_RECEPTION = {
  OCCUPE: "Occupé",
  PARTI: "Parti",
  LIBRE: "Libre",
  INDISPONIBLE: "Indisponible",
  PRET: "Prêt",
  A_RECONTROLER: "À recontrôler"
};


/**
 * États utilisés par le ménage.
 */
const ETAT_MENAGE = {
  A_FAIRE: "À faire",
  A_VERIFIER: "À vérifier",
  PRET: "Prêt",
  A_RECONTROLER: "À recontrôler"
};


/**
 * Niveaux de priorité.
 *
 * Attente : client déjà présent, logement pas encore prêt.
 * Rouge   : départ et arrivée le même jour.
 * Violet  : logement à recontrôler.
 * Bleu    : ménage à faire.
 * Blanc   : logement prêt.
 * Noir    : logement indisponible.
 */
const PRIORITE = {
  ATTENTE: "⚠️",
  ROUGE: "🔴",
  VIOLET: "🟣",
  BLEU: "🔵",
  BLANC: "⚪",
  NOIR: "⚫"
};


/**
 * Ordre de tri des priorités dans Réception.
 *
 * ATTENTE doit toujours passer avant les autres priorités.
 */
const ORDRE_PRIORITE_RECEPTION = {
  ATTENTE: 0,
  ROUGE: 1,
  VIOLET: 2,
  BLEU: 3,
  BLANC: 4,
  NOIR: 5,
  SANS_PRIORITE: 6
};


/**
 * Ordre de tri des priorités dans Ménage.
 *
 * ATTENTE doit toujours passer avant les autres priorités.
 */
const ORDRE_PRIORITE_MENAGE = {
  ATTENTE: 0,
  ROUGE: 1,
  VIOLET: 2,
  BLEU: 3,
  BLANC: 4,
  NOIR: 5,
  SANS_PRIORITE: 6
};


/**
 * Lignes utilisées dans Statistiques.
 */
const LIGNES_STATISTIQUES = {
  DERNIERE_MAJ: 3,

  TOTAL_LOGEMENTS: 5,
  OCCUPES: 6,
  LIBRES: 7,
  INDISPONIBLES: 8,
  PARTIS: 9,
  PRETS: 10,
  DEPARTS_JOUR: 11,
  ARRIVEES_JOUR: 12,
  MENAGE_A_FAIRE: 13,
  MENAGE_A_VERIFIER: 14,
  PRIORITES_ROUGES: 15,
  PRIORITES_BLEUES: 16,
  A_RECONTROLER: 17,

  /*
   * Lignes complémentaires utilisées par les statistiques
   * et le tableau de bord actuels.
   */
  MENAGE_PRETS: 18,
  PRIORITES_VIOLETTES: 19,

  PREMIERE_LIGNE_PERSONNEL: 5
};


/**
 * Couleurs utilisées dans le logiciel.
 */
const COULEURS = {
  ROUGE: "#ff0000",
  VERT: "#00ff00",
  BLEU: "#4285f4",
  BLANC: "#ffffff",
  NOIR: "#000000",
  VIOLET: "#a64dff",

  ORANGE: "#fbbc04",
  GRIS: "#d9d9d9",

  /*
   * Fond utilisé pour la priorité ⚠️ Client en attente.
   */
  JAUNE_ATTENTE: "#FFD54F"
};


/**
 * Couleurs de texte.
 */
const COULEURS_TEXTE = {
  NOIR: "#000000",
  BLANC: "#ffffff"
};