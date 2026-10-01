/**
 * =========================================================
 * CAMPMANAGER
 * MISE EN FORME AUTOMATIQUE — VERSION V2
 * =========================================================
 *
 * Ce fichier gère les couleurs des feuilles :
 *
 * - Réception
 * - Ménage
 *
 * Codes couleurs :
 *
 * 🔴 Rouge  : urgence départ + arrivée
 * 🟣 Violet : logement à recontrôler
 * 🔵 Bleu   : ménage à faire
 * ⚪ Blanc  : logement prêt
 * 🟢 Vert   : client parti
 * ⚫ Noir   : logement indisponible
 */


/**
 * Applique toutes les mises en forme.
 *
 * Cette fonction peut être lancée manuellement
 * depuis Apps Script pour rafraîchir les couleurs.
 */
function appliquerToutesLesCouleurs() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  const feuilleMenage =
    classeur.getSheetByName(
      FEUILLES.MENAGE
    );

  if (feuilleReception) {
    appliquerCouleursReception(
      feuilleReception
    );
  }

  /*
   * appliquerCouleursMenage()
   * est définie dans 31_Menage.gs.
   *
   * Elle applique :
   *
   * - la couleur générale des lignes ;
   * - la couleur des priorités ;
   * - la couleur des états ménage.
   */
  if (
    feuilleMenage &&
    typeof appliquerCouleursMenage ===
      "function"
  ) {
    appliquerCouleursMenage(
      feuilleMenage
    );
  }

  SpreadsheetApp.flush();

  classeur.toast(
    "Les couleurs ont été mises à jour.",
    "🎨 Mise en forme",
    3
  );
}


/* =========================================================
 * RÉCEPTION
 * =========================================================
 */

/**
 * Applique toutes les couleurs
 * de la feuille Réception.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuilleReception
 */
function appliquerCouleursReception(
  feuilleReception
) {
  if (!feuilleReception) {
    feuilleReception =
      SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName(
          FEUILLES.RECEPTION
        );
  }

  if (!feuilleReception) {
    return;
  }

  const derniereLigne =
    feuilleReception.getLastRow();

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return;
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  appliquerCouleursPrioritesReception(
    feuilleReception,
    nombreLignes
  );

  appliquerCouleursEtatsReception(
    feuilleReception,
    nombreLignes
  );
}


/**
 * Applique les couleurs
 * dans la colonne Priorité de Réception.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuilleReception
 * @param {number} nombreLignes
 */
function appliquerCouleursPrioritesReception(
  feuilleReception,
  nombreLignes
) {
  if (
    !feuilleReception ||
    nombreLignes <= 0
  ) {
    return;
  }

  const plage =
    feuilleReception.getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.PRIORITE,
      nombreLignes,
      1
    );

  const valeurs =
    plage.getValues();

  const fonds =
    valeurs.map(
      function(ligne) {
        return [
          obtenirCouleurPriorite(
            ligne[0]
          )
        ];
      }
    );

  const couleursTexte =
    valeurs.map(
      function(ligne) {
        return [
          obtenirCouleurTextePriorite(
            ligne[0]
          )
        ];
      }
    );

  plage
    .setBackgrounds(
      fonds
    )
    .setFontColors(
      couleursTexte
    )
    .setHorizontalAlignment(
      "center"
    )
    .setFontSize(
      14
    )
    .setFontWeight(
      "bold"
    );
}


/**
 * Applique les couleurs
 * dans la colonne État de Réception.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuilleReception
 * @param {number} nombreLignes
 */
function appliquerCouleursEtatsReception(
  feuilleReception,
  nombreLignes
) {
  if (
    !feuilleReception ||
    nombreLignes <= 0
  ) {
    return;
  }

  const plage =
    feuilleReception.getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.ETAT,
      nombreLignes,
      1
    );

  const valeurs =
    plage.getValues();

  const fonds =
    valeurs.map(
      function(ligne) {
        return [
          obtenirCouleurEtatReception(
            ligne[0]
          )
        ];
      }
    );

  const couleursTexte =
    valeurs.map(
      function(ligne) {
        return [
          obtenirCouleurTexteEtatReception(
            ligne[0]
          )
        ];
      }
    );

  plage
    .setBackgrounds(
      fonds
    )
    .setFontColors(
      couleursTexte
    )
    .setHorizontalAlignment(
      "center"
    )
    .setFontWeight(
      "bold"
    );
}


/* =========================================================
 * MÉNAGE
 * =========================================================
 */

/**
 * Applique les couleurs de priorité
 * dans la feuille Ménage.
 *
 * Cette fonction est appelée
 * depuis appliquerCouleursMenage()
 * dans 31_Menage.gs.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuilleMenage
 * @param {number} nombreLignes
 */
function appliquerCouleursPrioritesMenage(
  feuilleMenage,
  nombreLignes
) {
  if (
    !feuilleMenage ||
    nombreLignes <= 0
  ) {
    return;
  }

  const plage =
    feuilleMenage.getRange(
      LIGNES.DEBUT,
      COLONNES_MENAGE.PRIORITE,
      nombreLignes,
      1
    );

  const valeurs =
    plage.getValues();

  const fonds =
    valeurs.map(
      function(ligne) {
        return [
          obtenirCouleurPriorite(
            ligne[0]
          )
        ];
      }
    );

  const couleursTexte =
    valeurs.map(
      function(ligne) {
        return [
          obtenirCouleurTextePriorite(
            ligne[0]
          )
        ];
      }
    );

  plage
    .setBackgrounds(
      fonds
    )
    .setFontColors(
      couleursTexte
    )
    .setHorizontalAlignment(
      "center"
    )
    .setFontSize(
      14
    )
    .setFontWeight(
      "bold"
    );
}


/**
 * Applique les couleurs
 * dans la colonne État ménage.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuilleMenage
 * @param {number} nombreLignes
 */
function appliquerCouleursEtatsMenage(
  feuilleMenage,
  nombreLignes
) {
  if (
    !feuilleMenage ||
    nombreLignes <= 0
  ) {
    return;
  }

  const plage =
    feuilleMenage.getRange(
      LIGNES.DEBUT,
      COLONNES_MENAGE.ETAT_MENAGE,
      nombreLignes,
      1
    );

  const valeurs =
    plage.getValues();

  const fonds =
    valeurs.map(
      function(ligne) {
        return [
          obtenirCouleurEtatMenage(
            ligne[0]
          )
        ];
      }
    );

  const couleursTexte =
    valeurs.map(
      function(ligne) {
        return [
          obtenirCouleurTexteEtatMenage(
            ligne[0]
          )
        ];
      }
    );

  plage
    .setBackgrounds(
      fonds
    )
    .setFontColors(
      couleursTexte
    )
    .setHorizontalAlignment(
      "center"
    )
    .setFontWeight(
      "bold"
    );
}


/* =========================================================
 * COULEURS DES PRIORITÉS
 * =========================================================
 */

/**
 * Retourne la couleur de fond
 * correspondant à une priorité.
 *
 * @param {*} priorite
 *
 * @return {string}
 */
function obtenirCouleurPriorite(
  priorite
) {
  const valeur =
    String(
      priorite || ""
    ).trim();

  switch (valeur) {
    /*
     * Client déjà arrivé et en attente.
     * Cette priorité est volontairement indépendante
     * des constantes historiques PRIORITE.
     */
    case "⚠️":
      return "#FFD54F";

    case PRIORITE.ROUGE:
      return "#f4cccc";

    case PRIORITE.VIOLET:
      return "#d9b3ff";

    case PRIORITE.BLEU:
      return "#cfe2f3";

    case PRIORITE.BLANC:
      return "#ffffff";

    case PRIORITE.NOIR:
      return "#000000";

    default:
      return "#ffffff";
  }
}


/**
 * Retourne la couleur du texte
 * correspondant à une priorité.
 *
 * @param {*} priorite
 *
 * @return {string}
 */
function obtenirCouleurTextePriorite(
  priorite
) {
  const valeur =
    String(
      priorite || ""
    ).trim();

  if (
    valeur ===
    PRIORITE.NOIR
  ) {
    return "#ffffff";
  }

  return "#000000";
}


/* =========================================================
 * COULEURS DES ÉTATS RÉCEPTION
 * =========================================================
 */

/**
 * Retourne la couleur correspondant
 * à un état Réception.
 *
 * @param {*} etat
 *
 * @return {string}
 */
function obtenirCouleurEtatReception(
  etat
) {
  const valeur =
    (
      typeof normaliserEtatMenageDrive_ ===
        "function"
    )
      ? normaliserEtatMenageDrive_(
          etat
        )
      : String(
          etat || ""
        ).trim();

  switch (valeur) {
    /*
     * Client actuellement présent.
     */
    case ETAT_RECEPTION.OCCUPE:
      return "#f4cccc";

    /*
     * Client parti :
     * logement accessible au ménage.
     */
    case ETAT_RECEPTION.PARTI:
      return "#d9ead3";

    /*
     * Logement libre sans ménage en attente.
     */
    case ETAT_RECEPTION.LIBRE:
      return "#ffffff";

    /*
     * Logement volontairement bloqué.
     */
    case ETAT_RECEPTION.INDISPONIBLE:
      return "#000000";

    /*
     * Logement validé et prêt.
     */
    case ETAT_RECEPTION.PRET:
      return "#ffffff";

    /*
     * Logement prêt depuis au moins deux jours
     * et devant être vérifié à nouveau.
     */
    case ETAT_RECEPTION.A_RECONTROLER:
      return "#d9b3ff";

    default:
      return "#ffffff";
  }
}


/**
 * Retourne la couleur du texte
 * correspondant à un état Réception.
 *
 * @param {*} etat
 *
 * @return {string}
 */
function obtenirCouleurTexteEtatReception(
  etat
) {
  const valeur =
    String(
      etat || ""
    ).trim();

  if (
    valeur ===
    ETAT_RECEPTION.INDISPONIBLE
  ) {
    return "#ffffff";
  }

  return "#000000";
}


/* =========================================================
 * COULEURS DES ÉTATS MÉNAGE
 * =========================================================
 */

/**
 * Retourne la couleur correspondant
 * à un état Ménage.
 *
 * @param {*} etat
 *
 * @return {string}
 */
function obtenirCouleurEtatMenage(
  etat
) {
  const valeur =
    String(
      etat || ""
    ).trim();

  switch (valeur) {
    case ETAT_MENAGE.A_FAIRE:
      return "#cfe2f3";

    case ETAT_MENAGE.A_VERIFIER:
      return "#fce5cd";

    case ETAT_MENAGE.PRET:
      return "#ffffff";

    case ETAT_MENAGE.A_RECONTROLER:
      return "#d9b3ff";

    default:
      return "#ffffff";
  }
}


/**
 * Retourne la couleur du texte
 * correspondant à un état Ménage.
 *
 * @param {*} etat
 *
 * @return {string}
 */
function obtenirCouleurTexteEtatMenage(
  etat
) {
  return "#000000";
}


/* =========================================================
 * MODIFICATION IMMÉDIATE
 * =========================================================
 */

/**
 * Actualise immédiatement la couleur
 * lorsqu’un état est modifié manuellement.
 *
 * Cette fonction doit être appelée
 * depuis onEdit(e).
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} evenement
 */
function appliquerCouleurApresModification(
  evenement
) {
  if (
    !evenement ||
    !evenement.range
  ) {
    return;
  }

  const cellule =
    evenement.range;

  const feuille =
    cellule.getSheet();

  const nomFeuille =
    feuille.getName();

  const ligne =
    cellule.getRow();

  const colonne =
    cellule.getColumn();

  if (
    ligne <
    LIGNES.DEBUT
  ) {
    return;
  }

  /*
   * Modification de l’état Réception.
   */
  if (
    nomFeuille ===
      FEUILLES.RECEPTION &&
    colonne ===
      COLONNES_RECEPTION.ETAT
  ) {
    const etat =
      String(
        cellule.getValue() || ""
      ).trim();

    cellule
      .setBackground(
        obtenirCouleurEtatReception(
          etat
        )
      )
      .setFontColor(
        obtenirCouleurTexteEtatReception(
          etat
        )
      )
      .setFontWeight(
        "bold"
      );

    /*
     * À recontrôler :
     * la priorité devient violette.
     *
     * Cette priorité peut ensuite être recalculée
     * par les moteurs métier de Réception,
     * notamment selon les dates de séjour.
     */
    if (
      etat ===
      ETAT_RECEPTION.A_RECONTROLER
    ) {
      const cellulePriorite =
        feuille.getRange(
          ligne,
          COLONNES_RECEPTION.PRIORITE
        );

      cellulePriorite
        .setValue(
          PRIORITE.VIOLET
        )
        .setBackground(
          obtenirCouleurPriorite(
            PRIORITE.VIOLET
          )
        )
        .setFontColor(
          obtenirCouleurTextePriorite(
            PRIORITE.VIOLET
          )
        )
        .setFontWeight(
          "bold"
        )
        .setHorizontalAlignment(
          "center"
        );
    }

    /*
     * Prêt :
     * priorité blanche.
     */
    if (
      etat ===
      ETAT_RECEPTION.PRET
    ) {
      const cellulePriorite =
        feuille.getRange(
          ligne,
          COLONNES_RECEPTION.PRIORITE
        );

      cellulePriorite
        .setValue(
          PRIORITE.BLANC
        )
        .setBackground(
          obtenirCouleurPriorite(
            PRIORITE.BLANC
          )
        )
        .setFontColor(
          obtenirCouleurTextePriorite(
            PRIORITE.BLANC
          )
        )
        .setFontWeight(
          "bold"
        )
        .setHorizontalAlignment(
          "center"
        );
    }

    /*
     * Indisponible :
     * priorité noire.
     */
    if (
      etat ===
      ETAT_RECEPTION.INDISPONIBLE
    ) {
      const cellulePriorite =
        feuille.getRange(
          ligne,
          COLONNES_RECEPTION.PRIORITE
        );

      cellulePriorite
        .setValue(
          PRIORITE.NOIR
        )
        .setBackground(
          obtenirCouleurPriorite(
            PRIORITE.NOIR
          )
        )
        .setFontColor(
          obtenirCouleurTextePriorite(
            PRIORITE.NOIR
          )
        )
        .setFontWeight(
          "bold"
        )
        .setHorizontalAlignment(
          "center"
        );
    }

    return;
  }

  /*
   * Modification de l’état Ménage.
   */
  if (
    nomFeuille ===
      FEUILLES.MENAGE &&
    colonne ===
      COLONNES_MENAGE.ETAT_MENAGE
  ) {
    const etat =
      String(
        cellule.getValue() || ""
      ).trim();

    cellule
      .setBackground(
        obtenirCouleurEtatMenage(
          etat
        )
      )
      .setFontColor(
        obtenirCouleurTexteEtatMenage(
          etat
        )
      )
      .setFontWeight(
        "bold"
      );

    let nouvellePriorite = null;

    if (
      etat ===
      ETAT_MENAGE.PRET
    ) {
      nouvellePriorite =
        PRIORITE.BLANC;
    }

    if (
      etat ===
      ETAT_MENAGE.A_RECONTROLER
    ) {
      nouvellePriorite =
        PRIORITE.VIOLET;
    }

    if (
      nouvellePriorite
    ) {
      const cellulePriorite =
        feuille.getRange(
          ligne,
          COLONNES_MENAGE.PRIORITE
        );

      cellulePriorite
        .setValue(
          nouvellePriorite
        )
        .setBackground(
          obtenirCouleurPriorite(
            nouvellePriorite
          )
        )
        .setFontColor(
          obtenirCouleurTextePriorite(
            nouvellePriorite
          )
        )
        .setFontWeight(
          "bold"
        )
        .setHorizontalAlignment(
          "center"
        );
    }
  }
}