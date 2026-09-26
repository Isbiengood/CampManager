/**
 * ============================================================
 * CAMPMANAGER
 * UTILITAIRES GÉNÉRAUX
 * VERSION 2.2 OPEN SOURCE — 26/09/2026
 * ============================================================
 */


/**
 * Lit les données d’une feuille à partir d’une ligne donnée.
 *
 * Les lignes dont la première colonne est vide ne sont pas
 * retournées.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille
 *        Feuille à lire.
 * @param {number} ligneDebut
 *        Première ligne contenant les données.
 *
 * @return {Array<Array<*>>}
 *         Tableau contenant les lignes non vides.
 */
function lireDonnees(feuille, ligneDebut) {

  if (!feuille) {
    throw new Error(
      "lireDonnees : la feuille transmise est introuvable."
    );
  }

  if (!ligneDebut || ligneDebut < 1) {
    throw new Error(
      "lireDonnees : le numéro de la première ligne est invalide."
    );
  }

  const derniereLigne = feuille.getLastRow();
  const derniereColonne = feuille.getLastColumn();

  // Aucune donnée à lire.
  if (
    derniereLigne < ligneDebut ||
    derniereColonne < 1
  ) {
    return [];
  }

  const nombreLignes =
    derniereLigne - ligneDebut + 1;

  const donnees = feuille
    .getRange(
      ligneDebut,
      1,
      nombreLignes,
      derniereColonne
    )
    .getValues();

  // La première colonne doit contenir une valeur.
  return donnees.filter(function(ligne) {
    return String(ligne[0] || "").trim() !== "";
  });
}


/**
 * Crée un index des séjours présents dans Base.
 *
 * Clé :
 * ID séjour technique.
 *
 * COLONNES_BASE.NUMERO_RESERVATION reste un alias historique
 * de COLONNES_BASE.ID_SEJOUR dans les constantes actuelles.
 *
 * Valeur :
 * numéro réel de la ligne dans la feuille Base.
 *
 * IMPORTANT V2.2 :
 * on lit ici les lignes physiques de Base sans passer par
 * lireDonnees(), car cette fonction retire les lignes vides.
 * Sans cette précaution, une ligne vide au milieu de Base
 * décalerait tous les numéros de lignes suivants dans l'index.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuilleBase
 *        Feuille Base.
 *
 * @return {Object}
 *         Index des séjours.
 */
function creerIndexBase(feuilleBase) {

  if (!feuilleBase) {
    throw new Error(
      "creerIndexBase : la feuille Base est introuvable."
    );
  }

  const derniereLigne =
    feuilleBase.getLastRow();

  const index = {};

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return index;
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const identifiants =
    feuilleBase
      .getRange(
        LIGNES.DEBUT,
        COLONNES_BASE.NUMERO_RESERVATION,
        nombreLignes,
        1
      )
      .getValues();

  identifiants.forEach(
    function(ligne, position) {

      const cleReservation =
        String(
          ligne[0] || ""
        ).trim();

      if (
        cleReservation !== ""
      ) {
        index[
          cleReservation
        ] =
          LIGNES.DEBUT +
          position;
      }
    }
  );

  return index;
}


/**
 * Normalise le nom du personnel et des binômes.
 *
 * Les prénoms sont :
 * - séparés correctement ;
 * - nettoyés des espaces inutiles ;
 * - classés par ordre alphabétique ;
 * - réunis avec le séparateur défini dans PERSONNEL.
 *
 * Exemples :
 *
 * Sam et Alicia  → Alicia/Sam
 * Alicia/Sam     → Alicia/Sam
 * Sam, Alicia    → Alicia/Sam
 * Sam            → Sam
 *
 * @param {*} valeur
 *        Personnel à normaliser.
 *
 * @return {string}
 *         Personnel normalisé.
 */
function normaliserPersonnel(valeur) {

  if (
    valeur === null ||
    valeur === undefined ||
    String(valeur).trim() === ""
  ) {
    return "";
  }

  const prenoms = String(valeur)

    // Accepte plusieurs séparateurs de saisie.
    .split(/\s*(?:\bet\b|,|\/|&|\+)\s*/i)

    // Supprime les espaces inutiles.
    .map(function(prenom) {
      return prenom.trim();
    })

    // Supprime les éléments vides.
    .filter(function(prenom) {
      return prenom !== "";
    });

  // Supprime les éventuels doublons.
  const prenomsUniques = prenoms.filter(
    function(prenom, index, tableau) {

      return tableau.findIndex(
        function(autrePrenom) {
          return autrePrenom.localeCompare(
            prenom,
            "fr",
            {
              sensitivity: "base"
            }
          ) === 0;
        }
      ) === index;

    }
  );

  // Classe les prénoms par ordre alphabétique.
  prenomsUniques.sort(function(a, b) {
    return a.localeCompare(
      b,
      "fr",
      {
        sensitivity: "base"
      }
    );
  });

  return prenomsUniques.join(
    PERSONNEL.SEPARATEUR
  );
}