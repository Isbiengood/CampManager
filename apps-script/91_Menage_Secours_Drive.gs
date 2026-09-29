/**
 * ============================================================
 * CAMPMANAGER
 * MÉNAGE — SECOURS GOOGLE SHEETS V3.2.12 OPEN SOURCE
 * ============================================================
 *
 * Objectif :
 * - conserver CampManager Mobile inchangé ;
 * - rester compatible avec 90_OnEdit V2.34 ;
 * - ajouter dans Ménage :
 *     G = Check  -> uniquement les gouvernantes disponibles
 *     H = État   -> À vérifier / À recontrôler / Prêt
 * - synchroniser Check avec la gouvernante de Réception ;
 * - conserver H comme colonne de secours pour le contrôle ;
 * - déléguer EXCLUSIVEMENT la validation "Prêt" en H au fichier 94.
 *
 * IMPORTANT :
 * - ce fichier utilise un déclencheur installable séparé pour le secours Drive ;
 * - la colonne G (Check) est gérée ici ;
 * - en H, les états d'attente restent contrôlés ici ;
 * - le choix "Prêt" en H est géré EXCLUSIVEMENT par
 *   94_Controle_Gouvernante_Manuel_V4.gs ;
 * - il ne faut PAS créer un deuxième simple function onEdit(e).
 * ============================================================
 */

const MENAGE_SECOURS_V3210 = {
  COLONNE_CHECK: 7,
  COLONNE_ETAT: 8,
  NOMBRE_COLONNES: 8,
  ETAT_A_VERIFIER: "À vérifier",
  ETAT_A_RECONTROLER: "À recontrôler",
  ETAT_PRET: "Prêt"
};


/**
 * Reconstruit les deux colonnes de secours après chaque
 * mettreAJourMenage().
 *
 * À appeler à la fin de mettreAJourMenage(), juste avant
 * SpreadsheetApp.flush().
 */
function appliquerSecoursDriveMenageV3210_(
  feuilleMenage
) {
  if (!feuilleMenage) {
    return;
  }

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  const feuilleParametres =
    classeur.getSheetByName(
      FEUILLES.PARAMETRES
    );

  if (
    !feuilleReception ||
    !feuilleParametres
  ) {
    return;
  }

  /*
   * On garantit au moins 8 colonnes.
   */
  const colonnesActuelles =
    feuilleMenage.getMaxColumns();

  if (
    colonnesActuelles <
      MENAGE_SECOURS_V3210.NOMBRE_COLONNES
  ) {
    feuilleMenage.insertColumnsAfter(
      colonnesActuelles,
      MENAGE_SECOURS_V3210.NOMBRE_COLONNES -
        colonnesActuelles
    );
  }

  /*
   * En-têtes G / H.
   */
  feuilleMenage
    .getRange(
      LIGNES.ENTETES,
      MENAGE_SECOURS_V3210.COLONNE_CHECK,
      1,
      2
    )
    .setValues([[
      "Check",
      "État"
    ]])
    .setBackground("#17365d")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(12)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  /*
   * Première colonne figée.
   */
  feuilleMenage.setFrozenColumns(
    1
  );

  /*
   * V3.2.11 — nettoyage visuel complet des colonnes de secours.
   *
   * Lorsqu'une dernière tâche passe sur Prêt, getLastRow() peut
   * retomber sur la ligne d'en-tête. Sans ce nettoyage préalable,
   * G/H restent vides mais conservent la couleur de l'ancien état
   * (par exemple le jaune de « À vérifier »).
   *
   * On réinitialise donc toute la zone G:H sous les en-têtes avant
   * de reconstruire les éventuelles lignes encore actives.
   */
  const nombreLignesSecoursNettoyage =
    Math.max(
      feuilleMenage.getMaxRows() -
        LIGNES.DEBUT +
        1,
      1
    );

  feuilleMenage
    .getRange(
      LIGNES.DEBUT,
      MENAGE_SECOURS_V3210.COLONNE_CHECK,
      nombreLignesSecoursNettoyage,
      2
    )
    .clearContent()
    .clearDataValidations()
    .setBackground("#ffffff")
    .setFontColor("#000000")
    .setFontWeight("normal");

  /*
   * La colonne F reste technique et cachée.
   */
  try {
    feuilleMenage.hideColumns(
      COLONNES_MENAGE.ETAT_RECEPTION
    );
  } catch (erreur) {
    console.log(
      "Masquage colonne F impossible : " +
        erreur.message
    );
  }

  const derniereLigne =
    feuilleMenage.getLastRow();

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

  /*
   * Met à jour la liste des gouvernantes disponibles
   * déjà utilisée par Réception.
   */
  if (
    typeof mettreAJourGouvernantesDisponibles_ ===
      "function"
  ) {
    mettreAJourGouvernantesDisponibles_(
      feuilleParametres
    );
  }

  const gouvernantesDisponibles =
    lireGouvernantesDisponiblesMenageV3210_(
      feuilleParametres
    );

  /*
   * Carte logement -> gouvernante depuis Réception.
   */
  const gouvernanteParLogement =
    lireGouvernanteReceptionParLogementV3210_(
      feuilleReception
    );

  const donneesMenage =
    feuilleMenage
      .getRange(
        LIGNES.DEBUT,
        COLONNES_MENAGE.LOGEMENT,
        nombreLignes,
        COLONNES_MENAGE.ETAT_MENAGE
      )
      .getDisplayValues();

  const valeursCheck = [];
  const valeursEtat = [];

  donneesMenage.forEach(
    function(ligne) {
      const logement =
        String(
          ligne[
            COLONNES_MENAGE.LOGEMENT -
            COLONNES_MENAGE.LOGEMENT
          ] || ""
        ).trim();

      const indexEtatMenage =
        COLONNES_MENAGE.ETAT_MENAGE -
        COLONNES_MENAGE.LOGEMENT;

      const etatMenage =
        String(
          ligne[
            indexEtatMenage
          ] || ""
        ).trim();

      const gouvernante =
        String(
          gouvernanteParLogement[
            logement
          ] || ""
        ).trim();

      valeursCheck.push([
        gouvernante
      ]);

      const controleEnAttente =
        gouvernante !== "" &&
        (
          etatMenage ===
            ETAT_MENAGE.A_VERIFIER ||
          etatMenage ===
            ETAT_MENAGE.A_RECONTROLER
        );

      let etatControle = "";

      if (
        controleEnAttente
      ) {
        etatControle =
          etatMenage ===
            ETAT_MENAGE.A_RECONTROLER
            ? MENAGE_SECOURS_V3210.ETAT_A_RECONTROLER
            : MENAGE_SECOURS_V3210.ETAT_A_VERIFIER;
      }

      valeursEtat.push([
        etatControle
      ]);
    }
  );

  const plageCheck =
    feuilleMenage.getRange(
      LIGNES.DEBUT,
      MENAGE_SECOURS_V3210.COLONNE_CHECK,
      nombreLignes,
      1
    );

  const plageEtat =
    feuilleMenage.getRange(
      LIGNES.DEBUT,
      MENAGE_SECOURS_V3210.COLONNE_ETAT,
      nombreLignes,
      1
    );

  /*
   * On réécrit les valeurs à partir de Réception :
   * les lignes peuvent changer d'ordre à chaque actualisation.
   */
  plageCheck
    .clearContent()
    .clearDataValidations();

  plageEtat
    .clearContent()
    .clearDataValidations();

  plageCheck.setValues(
    valeursCheck
  );

  plageEtat.setValues(
    valeursEtat
  );

  /*
   * Liste Check : uniquement les gouvernantes disponibles.
   * Une cellule peut toujours être effacée manuellement.
   */
  if (
    gouvernantesDisponibles.length >
      0
  ) {
    const validationCheck =
      SpreadsheetApp
        .newDataValidation()
        .requireValueInList(
          gouvernantesDisponibles,
          true
        )
        .setAllowInvalid(false)
        .setHelpText(
          "Sélectionnez uniquement une gouvernante disponible."
        )
        .build();

    plageCheck.setDataValidation(
      validationCheck
    );
  }

  /*
   * Liste État gouvernante :
   * - À vérifier
   * - À recontrôler
   * - Prêt
   *
   * À recontrôler est normalement positionné automatiquement
   * par la règle métier de Réception.
   */
  const validationEtat =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          MENAGE_SECOURS_V3210.ETAT_A_VERIFIER,
          MENAGE_SECOURS_V3210.ETAT_A_RECONTROLER,
          MENAGE_SECOURS_V3210.ETAT_PRET
        ],
        true
      )
      .setAllowInvalid(false)
      .setHelpText(
        "Contrôle gouvernante : À vérifier, À recontrôler ou Prêt."
      )
      .build();

  plageEtat.setDataValidation(
    validationEtat
  );

  /*
   * Présentation.
   */
  feuilleMenage.setColumnWidth(
    MENAGE_SECOURS_V3210.COLONNE_CHECK,
    115
  );

  feuilleMenage.setColumnWidth(
    MENAGE_SECOURS_V3210.COLONNE_ETAT,
    115
  );

  plageCheck
    .setHorizontalAlignment("center")
    .setFontWeight("bold")
    .setWrap(true)
    .setBackground("#f3e5f5")
    .setFontColor("#4a235a");

  const etatsAffiches =
    plageEtat.getDisplayValues();

  etatsAffiches.forEach(
    function(ligne, index) {
      const cellule =
        feuilleMenage.getRange(
          LIGNES.DEBUT + index,
          MENAGE_SECOURS_V3210.COLONNE_ETAT
        );

      cellule
        .setHorizontalAlignment("center")
        .setFontWeight("bold")
        .setWrap(true);

      const etatAffiche =
        String(
          ligne[0] || ""
        ).trim();

      if (
        etatAffiche ===
          MENAGE_SECOURS_V3210.ETAT_A_VERIFIER
      ) {
        cellule
          .setBackground("#fff2cc")
          .setFontColor("#7f6000");

      } else if (
        etatAffiche ===
          MENAGE_SECOURS_V3210.ETAT_A_RECONTROLER
      ) {
        cellule
          .setBackground("#eadcf8")
          .setFontColor("#674ea7");

      } else {
        cellule
          .setBackground("#ffffff")
          .setFontColor("#000000");
      }
    }
  );
}


/**
 * Lit uniquement les gouvernantes disponibles.
 *
 * La configuration actuelle utilise la colonne P de Paramètres.
 * Si la constante existe, elle est utilisée ; sinon on retombe
 * sur la colonne 16 (= P).
 */
function lireGouvernantesDisponiblesMenageV3210_(
  feuilleParametres
) {
  if (!feuilleParametres) {
    return [];
  }

  const colonne =
    (
      typeof COLONNES_PARAMETRES !==
        "undefined" &&
      COLONNES_PARAMETRES.GOUVERNANTES_DISPONIBLES
    )
      ? COLONNES_PARAMETRES.GOUVERNANTES_DISPONIBLES
      : 16;

  const derniereLigne =
    feuilleParametres.getLastRow();

  if (
    derniereLigne <
      LIGNES.DEBUT
  ) {
    return [];
  }

  const valeurs =
    feuilleParametres
      .getRange(
        LIGNES.DEBUT,
        colonne,
        derniereLigne -
          LIGNES.DEBUT +
          1,
        1
      )
      .getDisplayValues()
      .map(
        function(ligne) {
          return String(
            ligne[0] || ""
          ).trim();
        }
      )
      .filter(
        function(valeur) {
          return valeur !== "";
        }
      );

  const uniques = [];

  valeurs.forEach(
    function(valeur) {
      if (
        uniques.indexOf(
          valeur
        ) === -1
      ) {
        uniques.push(
          valeur
        );
      }
    }
  );

  return uniques;
}


/**
 * Construit la carte logement -> gouvernante à partir de Réception.
 */
function lireGouvernanteReceptionParLogementV3210_(
  feuilleReception
) {
  const resultat = {};

  if (
    !feuilleReception ||
    feuilleReception.getLastRow() <
      LIGNES.DEBUT
  ) {
    return resultat;
  }

  const nombreLignes =
    feuilleReception.getLastRow() -
    LIGNES.DEBUT +
    1;

  const donnees =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.LOGEMENT,
        nombreLignes,
        COLONNES_RECEPTION.GOUVERNANTE -
          COLONNES_RECEPTION.LOGEMENT +
          1
      )
      .getDisplayValues();

  const indexGouvernante =
    COLONNES_RECEPTION.GOUVERNANTE -
    COLONNES_RECEPTION.LOGEMENT;

  donnees.forEach(
    function(ligne) {
      const logement =
        String(
          ligne[0] || ""
        ).trim();

      if (
        logement === ""
      ) {
        return;
      }

      resultat[logement] =
        String(
          ligne[
            indexGouvernante
          ] || ""
        ).trim();
    }
  );

  return resultat;
}


/**
 * Retrouve la ligne Réception correspondant à un logement.
 */
function trouverLigneReceptionMenageV3210_(
  feuilleReception,
  logement
) {
  if (
    !feuilleReception ||
    logement === ""
  ) {
    return null;
  }

  const derniereLigne =
    feuilleReception.getLastRow();

  if (
    derniereLigne <
      LIGNES.DEBUT
  ) {
    return null;
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const logements =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.LOGEMENT,
        nombreLignes,
        1
      )
      .getDisplayValues();

  const logementRecherche =
    String(
      logement || ""
    ).trim();

  for (
    let index = 0;
    index < logements.length;
    index++
  ) {
    if (
      String(
        logements[index][0] || ""
      ).trim() ===
        logementRecherche
    ) {
      return (
        LIGNES.DEBUT +
        index
      );
    }
  }

  return null;
}


/**
 * Déclencheur installable de secours pour les colonnes G / H.
 *
 * G est traité ici.
 * H reste cohérent avec l'état Ménage, mais la validation finale
 * "Prêt" est volontairement déléguée au fichier 94.
 *
 * Ne pas renommer en onEdit.
 */
function gererEditionSecoursDriveMenageV3210(
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

  const feuilleMenage =
    cellule.getSheet();

  if (
    feuilleMenage.getName() !==
      FEUILLES.MENAGE ||
    cellule.getRow() <
      LIGNES.DEBUT ||
    cellule.getNumRows() !== 1 ||
    cellule.getNumColumns() !== 1
  ) {
    return;
  }

  const colonne =
    cellule.getColumn();

  if (
    colonne !==
      MENAGE_SECOURS_V3210.COLONNE_CHECK &&
    colonne !==
      MENAGE_SECOURS_V3210.COLONNE_ETAT
  ) {
    return;
  }

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  if (!feuilleReception) {
    classeur.toast(
      "La feuille Réception est introuvable.",
      "❌ Secours Ménage",
      6
    );

    return;
  }

  const ligneMenage =
    cellule.getRow();

  const logement =
    String(
      feuilleMenage
        .getRange(
          ligneMenage,
          COLONNES_MENAGE.LOGEMENT
        )
        .getDisplayValue() || ""
    ).trim();

  if (
    logement === ""
  ) {
    return;
  }

  const ligneReception =
    trouverLigneReceptionMenageV3210_(
      feuilleReception,
      logement
    );

  if (!ligneReception) {
    classeur.toast(
      "Le logement " +
        logement +
        " est introuvable dans Réception.",
      "❌ Secours Ménage",
      6
    );

    return;
  }

  /*
   * ==========================================================
   * G = CHECK
   * ==========================================================
   *
   * Le choix est répercuté dans la colonne Gouvernante
   * de Réception pour rester cohérent avec CampManager Mobile.
   */
  if (
    colonne ===
      MENAGE_SECOURS_V3210.COLONNE_CHECK
  ) {
    const gouvernante =
      String(
        cellule.getDisplayValue() || ""
      ).trim();

    feuilleReception
      .getRange(
        ligneReception,
        COLONNES_RECEPTION.GOUVERNANTE
      )
      .setValue(
        gouvernante
      );

    const etatMenage =
      String(
        feuilleMenage
          .getRange(
            ligneMenage,
            COLONNES_MENAGE.ETAT_MENAGE
          )
          .getDisplayValue() || ""
      ).trim();

    const celluleEtatSecours =
      feuilleMenage.getRange(
        ligneMenage,
        MENAGE_SECOURS_V3210.COLONNE_ETAT
      );

    if (
      gouvernante !== "" &&
      (
        etatMenage ===
          ETAT_MENAGE.A_VERIFIER ||
        etatMenage ===
          ETAT_MENAGE.A_RECONTROLER
      )
    ) {
      celluleEtatSecours.setValue(
        etatMenage ===
          ETAT_MENAGE.A_RECONTROLER
          ? MENAGE_SECOURS_V3210.ETAT_A_RECONTROLER
          : MENAGE_SECOURS_V3210.ETAT_A_VERIFIER
      );
    } else {
      celluleEtatSecours.clearContent();
    }

    classeur.toast(
      gouvernante !== ""
        ? (
            logement +
            " : contrôle attribué à " +
            gouvernante +
            "."
          )
        : (
            logement +
            " : gouvernante retirée."
          ),
      "✅ Check",
      4
    );

    return;
  }

  /*
   * ==========================================================
   * H = ÉTAT
   * ==========================================================
   */
  const valeur =
    String(
      cellule.getDisplayValue() || ""
    ).trim();

  /*
   * À vérifier / À recontrôler sont des états d'attente.
   * H doit refléter exactement l'état réel de E.
   *
   * On ne permet donc pas de transformer manuellement
   * À vérifier en À recontrôler (ou inversement) depuis H.
   */
  if (
    valeur ===
      MENAGE_SECOURS_V3210.ETAT_A_VERIFIER ||
    valeur ===
      MENAGE_SECOURS_V3210.ETAT_A_RECONTROLER
  ) {
    const etatMenageActuel =
      String(
        feuilleMenage
          .getRange(
            ligneMenage,
            COLONNES_MENAGE.ETAT_MENAGE
          )
          .getDisplayValue() || ""
      ).trim();

    const valeurAttendue =
      etatMenageActuel ===
        ETAT_MENAGE.A_RECONTROLER
        ? MENAGE_SECOURS_V3210.ETAT_A_RECONTROLER
        : (
            etatMenageActuel ===
              ETAT_MENAGE.A_VERIFIER
              ? MENAGE_SECOURS_V3210.ETAT_A_VERIFIER
              : ""
          );

    if (
      valeurAttendue === ""
    ) {
      cellule.clearContent();

      classeur.toast(
        "Le logement n'est pas en attente de contrôle.",
        "⛔ Contrôle impossible",
        5
      );

    } else if (
      valeur !==
        valeurAttendue
    ) {
      cellule.setValue(
        valeurAttendue
      );

      classeur.toast(
        "L'état de contrôle est défini automatiquement : " +
          valeurAttendue +
          ".",
        "ℹ️ Contrôle gouvernante",
        5
      );
    }

    return;
  }

  /*
   * La validation finale "Prêt" n'est plus exécutée ici.
   *
   * Depuis la V4 Open Source :
   * - 90_OnEdit ignore volontairement la colonne H ;
   * - 91 maintient le secours Drive et la cohérence de G/H ;
   * - 94_Controle_Gouvernante_Manuel_V4 est l'unique moteur
   *   autorisé à traiter le choix "Prêt" en H.
   *
   * Ainsi, aucun double traitement n'est possible lorsque
   * les deux déclencheurs installables 91 et 94 sont présents.
   */
  if (
    valeur ===
      MENAGE_SECOURS_V3210.ETAT_PRET
  ) {
    return;
  }

  return;
}


/**
 * Installe une seule fois le déclencheur de secours.
 *
 * À exécuter manuellement après installation.
 */
function installerSecoursDriveMenageV3210() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!classeur) {
    throw new Error(
      "Aucun classeur CampManager actif."
    );
  }

  /*
   * Protection MASTER :
   * le secours Drive ne doit installer aucun déclencheur tant
   * qu'aucun établissement n'est configuré.
   */
  const codeEtablissement =
    String(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          "CAMPMANAGER_V4_CAMPING_CODE"
        ) || ""
    ).trim();

  if (!codeEtablissement) {
    throw new Error(
      "Installation du secours Drive bloquée : " +
      "aucun établissement n'est installé. " +
      "Ne lance pas cet installateur dans CampManager-MASTER."
    );
  }

  /*
   * La validation finale de H = "Prêt" appartient désormais au 94.
   * On refuse donc d'installer le secours Drive si le module 94
   * n'est pas présent dans le projet.
   */
  if (
    typeof traiterControleGouvernanteManuelV4_20260907 !==
      "function"
  ) {
    throw new Error(
      "Installation du secours Drive impossible : " +
      "94_Controle_Gouvernante_Manuel_V4 est introuvable."
    );
  }

  /*
   * Évite les doublons de déclencheur.
   */
  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        if (
          declencheur.getHandlerFunction() ===
            "gererEditionSecoursDriveMenageV3210"
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );

  ScriptApp
    .newTrigger(
      "gererEditionSecoursDriveMenageV3210"
    )
    .forSpreadsheet(
      classeur
    )
    .onEdit()
    .create();

  const feuilleMenage =
    classeur.getSheetByName(
      FEUILLES.MENAGE
    );

  if (
    typeof mettreAJourMenage ===
      "function"
  ) {
    mettreAJourMenage(
      false
    );
  } else if (
    feuilleMenage
  ) {
    appliquerSecoursDriveMenageV3210_(
      feuilleMenage
    );
  }

  classeur.toast(
    "Check + État installés. Première colonne figée.",
    "✅ Secours Ménage V3.2.12",
    6
  );
}


/**
 * Test rapide de l'installation.
 */
function testerSecoursDriveMenageV3210() {  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuille =
    classeur.getSheetByName(
      FEUILLES.MENAGE
    );

  const resultats = [];

  function test(
    libelle,
    condition
  ) {
    resultats.push(
      (condition ? "✅ " : "❌ ") +
      libelle
    );
  }

  test(
    "Feuille Ménage présente",
    !!feuille
  );

  if (feuille) {
    test(
      "Colonne Check présente",
      feuille
        .getRange(
          LIGNES.ENTETES,
          MENAGE_SECOURS_V3210.COLONNE_CHECK
        )
        .getDisplayValue() ===
          "Check"
    );

    test(
      "Colonne État présente",
      feuille
        .getRange(
          LIGNES.ENTETES,
          MENAGE_SECOURS_V3210.COLONNE_ETAT
        )
        .getDisplayValue() ===
          "État"
    );

    test(
      "Première colonne figée",
      feuille.getFrozenColumns() ===
        1
    );

    test(
      "État réception F caché",
      feuille.isColumnHiddenByUser(
        COLONNES_MENAGE.ETAT_RECEPTION
      )
    );
  }

  test(
    "Module 94 présent pour H = Prêt",
    typeof traiterControleGouvernanteManuelV4_20260907 ===
      "function"
  );

  const declencheurPresent =
    ScriptApp
      .getProjectTriggers()
      .some(
        function(declencheur) {
          return (
            declencheur.getHandlerFunction() ===
              "gererEditionSecoursDriveMenageV3210"
          );
        }
      );

  test(
    "Déclencheur secours installé",
    declencheurPresent
  );

  SpreadsheetApp
    .getUi()
    .alert(
      "CampManager — Secours Ménage V3.2.12\n\n" +
      resultats.join(
        "\n"
      )
    );

  return resultats;
}