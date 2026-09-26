/**
 * ============================================================
 * CAMPMANAGER
 * NETTOYAGE SÉLECTIF DU PERSONNEL À 17 H
 * VERSION 1.2 OPEN SOURCE — 25/09/2026
 * ============================================================
 *
 * Objectif :
 * supprimer uniquement les affectations devenues inutiles,
 * sans effacer un planning déjà préparé pour une arrivée J+1.
 *
 * À 17 h :
 *
 * - Libre          → personnel effacé SAUF arrivée demain
 * - Prêt           → personnel effacé SAUF arrivée demain
 * - Indisponible   → personnel effacé SAUF arrivée demain
 *
 * - Parti          → personnel conservé
 * - À recontrôler  → personnel conservé
 * - Occupé         → personnel conservé
 *
 * Le module :
 * - utilise le verrou global CampManager pour éviter une collision V4 ;
 * - fonctionne aussi avec un déclencheur sans classeur actif ;
 * - remet en évidence les arrivées de demain après 17 h ;
 * - ne reconstruit Ménage que si une affectation a réellement été effacée.
 */

const NETTOYAGE_PERSONNEL_17H_CAMPMANAGER =
  Object.freeze({
    VERSION:
      "1.2.0-opensource",

    HANDLER:
      "nettoyagePersonnelAutomatique17h",

    PROP_SPREADSHEET_ID:
      "CAMPMANAGER_V4_SPREADSHEET_ID",

    PROP_CAMPING_CODE:
      "CAMPMANAGER_V4_CAMPING_CODE"
  });


/**
 * Exécutée automatiquement par le déclencheur quotidien.
 *
 * @return {number}
 */
function nettoyagePersonnelAutomatique17h() {
  return executerNettoyagePersonnel17h_(
    false,
    true
  );
}


/**
 * Permet de tester manuellement le nettoyage.
 *
 * @return {number}
 */
function testerNettoyagePersonnel17h() {
  return executerNettoyagePersonnel17h_(
    true,
    true
  );
}


/**
 * Compatibilité avec les anciens appels :
 * nettoie le personnel sans forcer l'alerte visuelle J+1.
 *
 * @param {boolean} afficherMessage
 * @return {number}
 */
function nettoyerPersonnelTermine17h_(
  afficherMessage = false
) {
  return executerNettoyagePersonnel17h_(
    afficherMessage,
    false
  );
}


/**
 * Exécute le traitement sous verrou global.
 *
 * @param {boolean} afficherMessage
 * @param {boolean} appliquerAlerteJ1
 * @return {number}
 */
function executerNettoyagePersonnel17h_(
  afficherMessage,
  appliquerAlerteJ1
) {
  const verrou =
    LockService.getScriptLock();

  if (
    !verrou.tryLock(
      30000
    )
  ) {
    if (
      afficherMessage
    ) {
      SpreadsheetApp
        .getActiveSpreadsheet()
        .toast(
          "Une autre opération CampManager est en cours. Réessaie dans quelques instants.",
          "⚠️ Nettoyage 17 h",
          7
        );
    }

    return 0;
  }

  try {
    const classeur =
      obtenirClasseurNettoyagePersonnel17h_();

    const nombreEffaces =
      nettoyerPersonnelTermine17hSansVerrou_(
        classeur,
        afficherMessage
      );

    if (
      appliquerAlerteJ1
    ) {
      const feuilleReception =
        classeur.getSheetByName(
          FEUILLES.RECEPTION
        );

      if (
        feuilleReception
      ) {
        appliquerAlerteArriveesDemainReception_(
          feuilleReception
        );
      }
    }

    SpreadsheetApp.flush();

    return nombreEffaces;

  } finally {
    verrou.releaseLock();
  }
}


/**
 * Retrouve le classeur CampManager même lorsqu'un déclencheur
 * horaire ne possède pas de classeur actif.
 *
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function obtenirClasseurNettoyagePersonnel17h_() {
  let classeur =
    SpreadsheetApp
      .getActiveSpreadsheet();

  if (
    classeur
  ) {
    return classeur;
  }

  const id =
    String(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          NETTOYAGE_PERSONNEL_17H_CAMPMANAGER
            .PROP_SPREADSHEET_ID
        ) || ""
    ).trim();

  if (!id) {
    throw new Error(
      "Identifiant du classeur CampManager absent. " +
      "Réparez l'installation de l'établissement."
    );
  }

  classeur =
    SpreadsheetApp.openById(
      id
    );

  /*
   * Les modules historiques utilisent encore
   * SpreadsheetApp.getActiveSpreadsheet().
   */
  SpreadsheetApp.setActiveSpreadsheet(
    classeur
  );

  return classeur;
}


/**
 * Nettoie sélectivement la colonne Personnel de Réception.
 *
 * Une affectation préparée pour une arrivée du lendemain
 * est volontairement conservée.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} classeur
 * @param {boolean} afficherMessage
 * @return {number}
 */
function nettoyerPersonnelTermine17hSansVerrou_(
  classeur,
  afficherMessage
) {
  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  if (!feuilleReception) {
    throw new Error(
      "La feuille Réception est introuvable."
    );
  }

  const derniereLigne =
    feuilleReception.getLastRow();

  if (
    derniereLigne <
      LIGNES.DEBUT
  ) {
    return 0;
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const etats =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.ETAT,
        nombreLignes,
        1
      )
      .getDisplayValues();

  const plagePersonnel =
    feuilleReception.getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.PERSONNEL,
      nombreLignes,
      1
    );

  const personnels =
    plagePersonnel.getValues();

  const arriveesSuivantes =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.ARRIVEE_SUIVANTE,
        nombreLignes,
        1
      )
      .getValues();

  let nombreEffaces =
    0;

  for (
    let index = 0;
    index < nombreLignes;
    index++
  ) {
    const etat =
      String(
        etats[index][0] || ""
      ).trim();

    const personnel =
      String(
        personnels[index][0] || ""
      ).trim();

    if (
      personnel === ""
    ) {
      continue;
    }

    const etatTermine =
      etat ===
        ETAT_RECEPTION.LIBRE ||
      etat ===
        ETAT_RECEPTION.PRET ||
      etat ===
        ETAT_RECEPTION.INDISPONIBLE;

    if (
      !etatTermine
    ) {
      continue;
    }

    const arriveeDemain =
      estDateDemainNettoyagePersonnel17h_(
        arriveesSuivantes[index][0],
        classeur
      );

    /*
     * Planning déjà préparé pour J+1 :
     * on ne touche pas à l'affectation.
     */
    if (
      arriveeDemain
    ) {
      continue;
    }

    personnels[index][0] =
      "";

    nombreEffaces++;
  }

  if (
    nombreEffaces >
      0
  ) {
    plagePersonnel.setValues(
      personnels
    );

    /*
     * Répercussion uniquement lorsqu'une modification réelle
     * a été effectuée.
     */
    if (
      typeof mettreAJourMenage ===
        "function"
    ) {
      mettreAJourMenage(
        false
      );
    }
  }

  SpreadsheetApp.flush();

  if (
    afficherMessage
  ) {
    classeur.toast(
      nombreEffaces === 0
        ? "Aucune affectation terminée à effacer."
        : nombreEffaces +
          " affectation(s) terminée(s) effacée(s).",
      "👥 Nettoyage personnel 17 h",
      5
    );
  }

  return nombreEffaces;
}


/**
 * Indique si une valeur correspond à demain
 * dans le fuseau du classeur.
 *
 * @param {*} valeur
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} classeur
 * @return {boolean}
 */
function estDateDemainNettoyagePersonnel17h_(
  valeur,
  classeur
) {
  if (
    !(valeur instanceof Date) ||
    isNaN(
      valeur.getTime()
    )
  ) {
    return false;
  }

  const fuseau =
    classeur.getSpreadsheetTimeZone();

  const maintenant =
    new Date();

  const demain =
    new Date(
      maintenant.getTime() +
      24 * 60 * 60 * 1000
    );

  return (
    Utilities.formatDate(
      valeur,
      fuseau,
      "yyyyMMdd"
    ) ===
    Utilities.formatDate(
      demain,
      fuseau,
      "yyyyMMdd"
    )
  );
}


/**
 * Met en évidence les arrivées du lendemain après 17 h.
 *
 * Cette fonction était historiquement située dans Réception.
 * Elle vit désormais ici avec le déclencheur qui l'utilise,
 * afin de supprimer la dépendance à une ancienne version de 30_Reception.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuilleReception
 */
function appliquerAlerteArriveesDemainReception_(
  feuilleReception
) {
  if (
    !feuilleReception
  ) {
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

  const plage =
    feuilleReception.getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.ARRIVEE_SUIVANTE,
      nombreLignes,
      1
    );

  const valeurs =
    plage.getValues();

  const maintenant =
    new Date();

  const apres17h =
    Number(
      Utilities.formatDate(
        maintenant,
        feuilleReception
          .getParent()
          .getSpreadsheetTimeZone(),
        "H"
      )
    ) >= 17;

  const couleurRouge =
    (
      typeof COULEURS !==
        "undefined" &&
      COULEURS &&
      COULEURS.ROUGE
    )
      ? COULEURS.ROUGE
      : "#ff0000";

  const couleurNoire =
    (
      typeof COULEURS_TEXTE !==
        "undefined" &&
      COULEURS_TEXTE &&
      COULEURS_TEXTE.NOIR
    )
      ? COULEURS_TEXTE.NOIR
      : "#000000";

  const classeur =
    feuilleReception.getParent();

  const couleurs = [];
  const graisses = [];

  valeurs.forEach(
    function(ligne) {
      const estDemain =
        apres17h &&
        estDateDemainNettoyagePersonnel17h_(
          ligne[0],
          classeur
        );

      couleurs.push([
        estDemain
          ? couleurRouge
          : couleurNoire
      ]);

      graisses.push([
        estDemain
          ? "bold"
          : "normal"
      ]);
    }
  );

  plage.setFontColors(
    couleurs
  );

  plage.setFontWeights(
    graisses
  );
}


/**
 * Installe le déclencheur quotidien du nettoyage vers 17 h 05.
 *
 * À utiliser sur un établissement installé, jamais sur le MASTER.
 */
function installerDeclencheurNettoyagePersonnel17h() {
  const classeur =
    SpreadsheetApp
      .getActiveSpreadsheet();

  if (!classeur) {
    throw new Error(
      "Aucun classeur CampManager actif."
    );
  }

  const proprietes =
    PropertiesService
      .getScriptProperties();

  const codeEtablissement =
    String(
      proprietes.getProperty(
        NETTOYAGE_PERSONNEL_17H_CAMPMANAGER
          .PROP_CAMPING_CODE
      ) || ""
    ).trim();

  if (!codeEtablissement) {
    throw new Error(
      "Aucun établissement n'est configuré. " +
      "Le déclencheur 17 h ne doit pas être installé dans CampManager-MASTER."
    );
  }

  proprietes.setProperty(
    NETTOYAGE_PERSONNEL_17H_CAMPMANAGER
      .PROP_SPREADSHEET_ID,
    classeur.getId()
  );

  supprimerDeclencheurNettoyagePersonnel17h_();

  ScriptApp
    .newTrigger(
      NETTOYAGE_PERSONNEL_17H_CAMPMANAGER
        .HANDLER
    )
    .timeBased()
    .atHour(
      17
    )
    .nearMinute(
      5
    )
    .everyDays(
      1
    )
    .create();

  classeur.toast(
    "Le nettoyage sélectif du personnel vers 17 h 05 est installé.",
    "✅ Déclencheur 17 h",
    6
  );
}


/**
 * Supprime uniquement les déclencheurs liés
 * au nettoyage sélectif de 17 h.
 */
function supprimerDeclencheurNettoyagePersonnel17h_() {
  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        if (
          declencheur.getHandlerFunction() ===
            NETTOYAGE_PERSONNEL_17H_CAMPMANAGER
              .HANDLER
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );
}


/**
 * Désinstalle volontairement le déclencheur de 17 h.
 */
function desinstallerDeclencheurNettoyagePersonnel17h() {
  supprimerDeclencheurNettoyagePersonnel17h_();

  const classeur =
    SpreadsheetApp
      .getActiveSpreadsheet();

  if (
    classeur
  ) {
    classeur.toast(
      "Le nettoyage automatique du personnel à 17 h a été supprimé.",
      "Déclencheur 17 h",
      5
    );
  }
}