/**
 * =========================================================
 * CAMPMANAGER
 * STATISTIQUES — VERSION V2
 * =========================================================
 *
 * Ce fichier calcule :
 *
 * - le nombre total de logements ;
 * - les états de la Réception ;
 * - les départs et arrivées du jour ;
 * - les états du Ménage, y compris À recontrôler et Prêt ;
 * - les priorités du Ménage ;
 * - le nombre de logements attribués à chaque équipe.
 *
 * Chaque feuille source n'est lue qu'une seule fois.
 */


/**
 * Met à jour l'ensemble du module Statistiques.
 *
 * @param {boolean=} afficherMessage
 *        true  : affiche les notifications ;
 *        false : actualisation silencieuse.
 */
function mettreAJourStatistiques(
  afficherMessage = true
) {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  try {
    if (afficherMessage) {
      classeur.toast(
        "Calcul des statistiques en cours…",
        "CampManager",
        3
      );
    }

    const feuilles =
      obtenirFeuillesStatistiques_(
        classeur
      );

    /*
     * Lecture unique de chaque feuille.
     */
    const logements =
      lireDonneesStatistiques_(
        feuilles.logements,
        1
      );

    const reception =
      lireDonneesStatistiques_(
        feuilles.reception,
        COLONNES_RECEPTION.NOMBRE_COLONNES
      );

    const menage =
      lireDonneesStatistiques_(
        feuilles.menage,
        COLONNES_MENAGE.NOMBRE_COLONNES
      );

    /*
     * Calculs effectués uniquement en mémoire.
     */
    const statistiques = {
      totalLogements:
        compterLogementsStatistiques_(
          logements
        ),

      reception:
        calculerReceptionStatistiques_(
          reception
        ),

      menage:
        calculerMenageStatistiques_(
          menage
        )
    };

    /*
     * Écriture des résultats.
     */
    ecrireIndicateursStatistiques_(
      feuilles.statistiques,
      statistiques
    );

    ecrireEquipesStatistiques_(
      feuilles.statistiques,
      statistiques.menage.equipes
    );

    mettreAJourDateStatistiques_(
      feuilles.statistiques
    );

    SpreadsheetApp.flush();

    if (afficherMessage) {
      classeur.toast(
        "✅ Statistiques mises à jour",
        "CampManager",
        4
      );
    }

  } catch (erreur) {
    console.error(
      "Erreur Statistiques :",
      erreur
    );

    if (afficherMessage) {
      classeur.toast(
        "❌ Échec de la mise à jour des statistiques",
        "CampManager",
        7
      );
    }

    throw new Error(
      "Impossible de mettre à jour les statistiques : " +
      erreur.message
    );
  }
}


/**
 * Récupère et vérifie les feuilles nécessaires.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} classeur
 *
 * @return {{
 *   logements: GoogleAppsScript.Spreadsheet.Sheet,
 *   reception: GoogleAppsScript.Spreadsheet.Sheet,
 *   menage: GoogleAppsScript.Spreadsheet.Sheet,
 *   statistiques: GoogleAppsScript.Spreadsheet.Sheet
 * }}
 */
function obtenirFeuillesStatistiques_(
  classeur
) {
  const feuilles = {
    logements:
      classeur.getSheetByName(
        FEUILLES.LOGEMENTS
      ),

    reception:
      classeur.getSheetByName(
        FEUILLES.RECEPTION
      ),

    menage:
      classeur.getSheetByName(
        FEUILLES.MENAGE
      ),

    statistiques:
      classeur.getSheetByName(
        FEUILLES.STATISTIQUES
      )
  };

  verifierFeuilleStatistiques_(
    feuilles.logements,
    FEUILLES.LOGEMENTS
  );

  verifierFeuilleStatistiques_(
    feuilles.reception,
    FEUILLES.RECEPTION
  );

  verifierFeuilleStatistiques_(
    feuilles.menage,
    FEUILLES.MENAGE
  );

  verifierFeuilleStatistiques_(
    feuilles.statistiques,
    FEUILLES.STATISTIQUES
  );

  return feuilles;
}


/**
 * Lit les données d'une feuille à partir
 * de la première ligne de données.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille
 * @param {number} nombreColonnes
 *
 * @return {Array<Array<*>>}
 */
function lireDonneesStatistiques_(
  feuille,
  nombreColonnes
) {
  const derniereLigne =
    feuille.getLastRow();

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return [];
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  return feuille
    .getRange(
      LIGNES.DEBUT,
      1,
      nombreLignes,
      nombreColonnes
    )
    .getValues();
}


/**
 * Compte les logements renseignés
 * dans la première colonne.
 *
 * @param {Array<Array<*>>} donnees
 *
 * @return {number}
 */
function compterLogementsStatistiques_(
  donnees
) {
  return donnees.reduce(
    function(total, ligne) {
      return ligne[0] !== null &&
        String(ligne[0]).trim() !== ""
        ? total + 1
        : total;
    },
    0
  );
}


/**
 * Calcule les statistiques de Réception.
 *
 * @param {Array<Array<*>>} donnees
 *
 * @return {{
 *   occupes: number,
 *   libres: number,
 *   indisponibles: number,
 *   partis: number,
 *   prets: number,
 *   departsJour: number,
 *   arriveesJour: number
 * }}
 */
function calculerReceptionStatistiques_(
  donnees
) {
  const resultat = {
    occupes: 0,
    libres: 0,
    indisponibles: 0,
    partis: 0,
    prets: 0,
    departsJour: 0,
    arriveesJour: 0
  };

  donnees.forEach(
    function(ligne) {
      const logement =
        ligne[
          COLONNES_RECEPTION.LOGEMENT - 1
        ];

      if (
        logement === null ||
        String(logement).trim() === ""
      ) {
        return;
      }

      const etat =
        String(
          ligne[
            COLONNES_RECEPTION.ETAT - 1
          ] || ""
        ).trim();

      switch (etat) {
        case ETAT_RECEPTION.OCCUPE:
          resultat.occupes++;
          break;

        case ETAT_RECEPTION.LIBRE:
          resultat.libres++;
          break;

        case ETAT_RECEPTION.INDISPONIBLE:
          resultat.indisponibles++;
          break;

        case ETAT_RECEPTION.PARTI:
          resultat.partis++;
          break;

        case ETAT_RECEPTION.PRET:
          resultat.prets++;
          break;
      }

      const dateDepart =
        ligne[
          COLONNES_RECEPTION.DEPART - 1
        ];

      const dateArrivee =
        ligne[
          COLONNES_RECEPTION
            .ARRIVEE_SUIVANTE - 1
        ];

      if (
        estAujourdhuiStatistiques_(
          dateDepart
        )
      ) {
        resultat.departsJour++;
      }

      if (
        estAujourdhuiStatistiques_(
          dateArrivee
        )
      ) {
        resultat.arriveesJour++;
      }
    }
  );

  return resultat;
}


/**
 * Calcule les statistiques du Ménage.
 *
 * @param {Array<Array<*>>} donnees
 *
 * @return {{
 *   aFaire: number,
 *   aVerifier: number,
 *   aRecontroler: number,
 *   prets: number,
 *   prioritesRouges: number,
 *   prioritesBleues: number,
 *   prioritesViolettes: number,
 *   equipes: Object<string, number>
 * }}
 */
function calculerMenageStatistiques_(
  donnees
) {
  const resultat = {
    aFaire: 0,
    aVerifier: 0,
    aRecontroler: 0,
    prets: 0,
    prioritesRouges: 0,
    prioritesBleues: 0,
    prioritesViolettes: 0,
    equipes: {}
  };

  donnees.forEach(
    function(ligne) {
      const logement =
        ligne[
          COLONNES_MENAGE.LOGEMENT - 1
        ];

      if (
        logement === null ||
        String(logement).trim() === ""
      ) {
        return;
      }

      const etatMenage =
        String(
          ligne[
            COLONNES_MENAGE.ETAT_MENAGE - 1
          ] || ""
        ).trim();

      if (
        etatMenage ===
        ETAT_MENAGE.A_FAIRE
      ) {
        resultat.aFaire++;
      }

      if (
        etatMenage ===
        ETAT_MENAGE.A_VERIFIER
      ) {
        resultat.aVerifier++;
      }

      if (
        etatMenage ===
        ETAT_MENAGE.A_RECONTROLER
      ) {
        resultat.aRecontroler++;
      }

      if (
        etatMenage ===
        ETAT_MENAGE.PRET
      ) {
        resultat.prets++;
      }

      const priorite =
        String(
          ligne[
            COLONNES_MENAGE.PRIORITE - 1
          ] || ""
        ).trim();

      if (
        priorite ===
        PRIORITE.ROUGE
      ) {
        resultat.prioritesRouges++;
      }

      if (
        priorite ===
        PRIORITE.BLEU
      ) {
        resultat.prioritesBleues++;
      }

      if (
        priorite ===
        PRIORITE.VIOLET
      ) {
        resultat.prioritesViolettes++;
      }

      const personnel =
        ligne[
          COLONNES_MENAGE.PERSONNEL - 1
        ];

      ajouterEquipeStatistiques_(
        resultat.equipes,
        personnel
      );
    }
  );

  return resultat;
}


/**
 * Ajoute un logement au compteur
 * de l'équipe concernée.
 *
 * La fonction normaliserPersonnel()
 * provient de 80_Utilitaires.gs.
 *
 * @param {Object<string, number>} equipes
 * @param {*} personnel
 */
function ajouterEquipeStatistiques_(
  equipes,
  personnel
) {
  const equipe =
    normaliserPersonnel(
      personnel
    );

  if (!equipe) {
    return;
  }

  equipes[equipe] =
    (equipes[equipe] || 0) + 1;
}


/**
 * Écrit les indicateurs principaux
 * dans la colonne B.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille
 * @param {Object} statistiques
 */
function ecrireIndicateursStatistiques_(
  feuille,
  statistiques
) {
  const reception =
    statistiques.reception;

  const menage =
    statistiques.menage;

  const valeurs = [
    [statistiques.totalLogements],
    [reception.occupes],
    [reception.libres],
    [reception.indisponibles],
    [reception.partis],
    [reception.prets],
    [reception.departsJour],
    [reception.arriveesJour],
    [menage.aFaire],
    [menage.aVerifier],
    [menage.prioritesRouges],
    [menage.prioritesBleues],
    [menage.aRecontroler],
    [menage.prets],
    [menage.prioritesViolettes]
  ];

  feuille
    .getRange(
      LIGNES_STATISTIQUES.TOTAL_LOGEMENTS,
      2,
      valeurs.length,
      1
    )
    .setValues(
      valeurs
    );

  /*
   * Nouvelles lignes utilisées par le tableau de bord.
   *
   * B17 : logements à recontrôler
   * B18 : logements prêts dans la feuille Ménage
   * B19 : priorités violettes
   */
  feuille
    .getRange("A17:A19")
    .setValues([
      ["Ménage à recontrôler"],
      ["Ménage prêt"],
      ["Priorités violettes"]
    ]);

  feuille
    .getRange("A17:B19")
    .setFontWeight("normal");
}


/**
 * Efface puis écrit le tableau des équipes
 * dans les colonnes D et E.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille
 * @param {Object<string, number>} equipes
 */
function ecrireEquipesStatistiques_(
  feuille,
  equipes
) {
  const premiereLigne =
    LIGNES_STATISTIQUES
      .PREMIERE_LIGNE_PERSONNEL;

  const nombreLignesAEffacer =
    feuille.getMaxRows() -
    premiereLigne +
    1;

  if (
    nombreLignesAEffacer > 0
  ) {
    feuille
      .getRange(
        premiereLigne,
        4,
        nombreLignesAEffacer,
        2
      )
      .clearContent();
  }

  const tableau =
    Object.keys(equipes)
      .map(
        function(nomEquipe) {
          return [
            nomEquipe,
            equipes[nomEquipe]
          ];
        }
      )
      .sort(
        function(equipeA, equipeB) {
          /*
           * Les équipes ayant le plus
           * de logements sont placées en premier.
           */
          if (
            equipeB[1] !==
            equipeA[1]
          ) {
            return (
              equipeB[1] -
              equipeA[1]
            );
          }

          return equipeA[0]
            .localeCompare(
              equipeB[0],
              "fr",
              {
                sensitivity: "base"
              }
            );
        }
      );

  if (
    tableau.length === 0
  ) {
    return;
  }

  feuille
    .getRange(
      premiereLigne,
      4,
      tableau.length,
      2
    )
    .setValues(
      tableau
    );
}


/**
 * Inscrit la date et l'heure
 * de la dernière actualisation.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille
 */
function mettreAJourDateStatistiques_(
  feuille
) {
  feuille
    .getRange(
      LIGNES_STATISTIQUES.DERNIERE_MAJ,
      2
    )
    .setValue(
      new Date()
    )
    .setNumberFormat(
      "dd/MM/yyyy HH:mm:ss"
    );
}


/**
 * Vérifie si une date correspond
 * à la date du jour.
 *
 * @param {*} valeur
 *
 * @return {boolean}
 */
function estAujourdhuiStatistiques_(
  valeur
) {
  if (
    !(valeur instanceof Date) ||
    isNaN(valeur.getTime())
  ) {
    return false;
  }

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const fuseauHoraire =
    classeur.getSpreadsheetTimeZone();

  const format =
    "yyyy-MM-dd";

  const dateValeur =
    Utilities.formatDate(
      valeur,
      fuseauHoraire,
      format
    );

  const dateDuJour =
    Utilities.formatDate(
      new Date(),
      fuseauHoraire,
      format
    );

  return (
    dateValeur ===
    dateDuJour
  );
}


/**
 * Vérifie qu'une feuille existe.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet|null} feuille
 * @param {string} nomFeuille
 */
function verifierFeuilleStatistiques_(
  feuille,
  nomFeuille
) {
  if (!feuille) {
    throw new Error(
      'La feuille "' +
      nomFeuille +
      '" est introuvable.'
    );
  }
}}