/**
 * ============================================================
 * CAMPMANAGER V4 — CONTRÔLE GOUVERNANTE MANUEL
 * VERSION 2026-09-26c OPEN SOURCE
 * ============================================================
 *
 * Ce fichier gère EXCLUSIVEMENT :
 *   Ménage -> colonne H "État/Contrôle" -> choix "Prêt"
 *
 * Pourquoi un déclencheur installable séparé ?
 * ------------------------------------------------------------
 * - L'application V4 fonctionne déjà.
 * - Les essais dans le onEdit simple ne déclenchaient pas
 *   correctement le même chemin.
 * - Le premier déclencheur séparé avait, lui, bien réagi.
 *
 * On isole donc complètement la validation gouvernante manuelle.
 *
 * IMPORTANT :
 * - aucun recalcul global de Réception ;
 * - aucun appel volontaire à mettreAJourReception();
 * - les états Parti des autres logements sont préservés ;
 * - les départs anticipés sont préservés ;
 * - la synchro V4 toutes les minutes reste inchangée.
 * ============================================================
 */

const CONTROLE_GOUVERNANTE_MANUEL_V4_20260907 = Object.freeze({
  VERSION: "2026-09-26c",
  HANDLER: "traiterControleGouvernanteManuelV4_20260907",
  PROP_TRACE: "CAMPMANAGER_TRACE_CONTROLE_GOUVERNANTE_20260907",
  FEUILLE: "Ménage",
  COLONNE_LOGEMENT: 1,
  COLONNE_ETAT_MENAGE: 5,
  COLONNE_CHECK: 7,
  COLONNE_CONTROLE: 8
});


/**
 * À EXÉCUTER UNE SEULE FOIS après avoir ajouté ce fichier.
 */
function installerControleGouvernanteManuelV4_20260907() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!classeur) {
    throw new Error(
      "Aucun classeur CampManager actif."
    );
  }

  /*
   * Protection MASTER :
   * aucun déclencheur de contrôle gouvernante ne doit être créé
   * tant qu'aucun établissement n'est configuré.
   *
   * Les noms historiques des fonctions 20260907 sont conservés
   * volontairement pour rester compatibles avec 05 / 91 / 99.
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
      "Installation du contrôle gouvernante bloquée : " +
      "aucun établissement n'est installé. " +
      "Ne lance pas cet installateur dans CampManager-MASTER."
    );
  }

  /*
   * On supprime uniquement les anciens déclencheurs dédiés
   * au contrôle gouvernante manuel.
   * On ne touche PAS aux déclencheurs V4 1 minute.
   */
  const anciensHandlers = [
    "traiterControleGouvernanteManuelCampManagerV4_20260828",
    "traiterControleGouvernanteManuelV4_20260907"
  ];

  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        if (
          anciensHandlers.indexOf(
            declencheur.getHandlerFunction()
          ) !== -1
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );

  ScriptApp
    .newTrigger(
      CONTROLE_GOUVERNANTE_MANUEL_V4_20260907.HANDLER
    )
    .forSpreadsheet(
      classeur
    )
    .onEdit()
    .create();

  enregistrerTraceControleGouvernanteV4_20260907_({
    etape: "installation",
    message: "Déclencheur installé",
    date: new Date().toISOString()
  });

  notifierControleGouvernanteV4_20260907_(
    "✅ Contrôle gouvernante manuel installé. " +
    "Exécutez maintenant verifierControleGouvernanteManuelV4_20260907()."
  );

  return {
    ok: true,
    message: "Déclencheur installé",
    handler:
      CONTROLE_GOUVERNANTE_MANUEL_V4_20260907.HANDLER
  };
}


/**
 * Vérifie qu'il existe exactement un déclencheur dédié.
 */
function verifierControleGouvernanteManuelV4_20260907() {
  const trouves =
    ScriptApp
      .getProjectTriggers()
      .filter(
        function(declencheur) {
          return (
            declencheur.getHandlerFunction() ===
              CONTROLE_GOUVERNANTE_MANUEL_V4_20260907.HANDLER
          );
        }
      );

  const message =
    (
      trouves.length === 1
        ? "✅ Correct"
        : "⚠️ Problème"
    ) +
    " — Déclencheurs trouvés : " +
    trouves.length +
    " — Attendu : 1";

  notifierControleGouvernanteV4_20260907_(
    message
  );

  console.log(
    "CONTROLE_GOUVERNANTE : " +
    message
  );

  return {
    correct:
      trouves.length === 1,
    nombreDeclencheurs:
      trouves.length,
    message:
      message
  };
}


/**
 * Déclencheur installable.
 * NE PAS exécuter manuellement.
 */
function traiterControleGouvernanteManuelV4_20260907(
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

  const colonneControle =
    (
      typeof COLONNE_CONTROLE_MENAGE_V329_ !==
        "undefined"
    )
      ? COLONNE_CONTROLE_MENAGE_V329_
      : CONTROLE_GOUVERNANTE_MANUEL_V4_20260907.COLONNE_CONTROLE;

  if (
    feuille.getName() !==
      CONTROLE_GOUVERNANTE_MANUEL_V4_20260907.FEUILLE ||
    cellule.getColumn() !==
      colonneControle ||
    cellule.getNumRows() !== 1 ||
    cellule.getNumColumns() !== 1
  ) {
    return;
  }

  const valeur =
    String(
      typeof evenement.value !==
        "undefined"
        ? evenement.value
        : cellule.getDisplayValue()
    ).trim();

  const valeurPret =
    (
      typeof ETAT_MENAGE !==
        "undefined" &&
      ETAT_MENAGE.PRET
    )
      ? ETAT_MENAGE.PRET
      : "Prêt";

  /*
   * On trace dès qu'une modification de H arrive.
   * Ainsi, en cas d'échec, on saura immédiatement si le
   * déclencheur a réellement vu le clic.
   */
  enregistrerTraceControleGouvernanteV4_20260907_({
    etape: "clic_recu",
    valeur: valeur,
    ligne: cellule.getRow(),
    date: new Date().toISOString()
  });

  if (
    normaliserControleGouvernanteV4_20260907_(
      valeur
    ) !==
      normaliserControleGouvernanteV4_20260907_(
        valeurPret
      )
  ) {
    return;
  }

  const ligne =
    cellule.getRow();

  const colLogement =
    (
      typeof COLONNES_MENAGE !==
        "undefined" &&
      COLONNES_MENAGE.LOGEMENT
    )
      ? COLONNES_MENAGE.LOGEMENT
      : CONTROLE_GOUVERNANTE_MANUEL_V4_20260907.COLONNE_LOGEMENT;

  const colEtat =
    (
      typeof COLONNES_MENAGE !==
        "undefined" &&
      COLONNES_MENAGE.ETAT_MENAGE
    )
      ? COLONNES_MENAGE.ETAT_MENAGE
      : CONTROLE_GOUVERNANTE_MANUEL_V4_20260907.COLONNE_ETAT_MENAGE;

  const colCheck =
    (
      typeof COLONNE_CHECK_MENAGE_V329_ !==
        "undefined"
    )
      ? COLONNE_CHECK_MENAGE_V329_
      : CONTROLE_GOUVERNANTE_MANUEL_V4_20260907.COLONNE_CHECK;

  const logement =
    String(
      feuille
        .getRange(
          ligne,
          colLogement
        )
        .getDisplayValue() || ""
    ).trim();

  const gouvernante =
    String(
      feuille
        .getRange(
          ligne,
          colCheck
        )
        .getDisplayValue() || ""
    ).trim();

  const ancienEtat =
    String(
      feuille
        .getRange(
          ligne,
          colEtat
        )
        .getDisplayValue() || ""
    ).trim();

  enregistrerTraceControleGouvernanteV4_20260907_({
    etape: "donnees_lues",
    logement: logement,
    gouvernante: gouvernante,
    ancienEtat: ancienEtat,
    date: new Date().toISOString()
  });

  const etatAVerifier =
    (
      typeof ETAT_MENAGE !==
        "undefined" &&
      ETAT_MENAGE.A_VERIFIER
    )
      ? ETAT_MENAGE.A_VERIFIER
      : "À vérifier";

  const etatARecontroler =
    (
      typeof ETAT_MENAGE !==
        "undefined" &&
      ETAT_MENAGE.A_RECONTROLER
    )
      ? ETAT_MENAGE.A_RECONTROLER
      : "À recontrôler";

  if (
    !logement ||
    !gouvernante ||
    (
      ancienEtat !== etatAVerifier &&
      ancienEtat !== etatARecontroler
    )
  ) {
    enregistrerTraceControleGouvernanteV4_20260907_({
      etape: "refus_donnees",
      logement: logement,
      gouvernante: gouvernante,
      ancienEtat: ancienEtat,
      date: new Date().toISOString()
    });

    return;
  }

  if (
    typeof appliquerControleGouvernanteV4DansDrive_ !==
      "function"
  ) {
    enregistrerTraceControleGouvernanteV4_20260907_({
      etape: "moteur_introuvable",
      logement: logement,
      date: new Date().toISOString()
    });

    throw new Error(
      "Le moteur V4 appliquerControleGouvernanteV4DansDrive_ est introuvable."
    );
  }

  const verrou =
    LockService.getScriptLock();

  verrou.waitLock(
    30000
  );

  const ancienneActualisationReception =
    typeof actualiserReceptionApresValidationMenage ===
      "function"
      ? actualiserReceptionApresValidationMenage
      : null;

  try {
    /*
     * Même protection que celle déjà utilisée avec succès
     * pour les validations provenant de l'application V4.
     */
    if (
      ancienneActualisationReception
    ) {
      actualiserReceptionApresValidationMenage =
        function() {
          SpreadsheetApp.flush();
        };
    }

    enregistrerTraceControleGouvernanteV4_20260907_({
      etape: "appel_moteur",
      logement: logement,
      gouvernante: gouvernante,
      ancienEtat: ancienEtat,
      date: new Date().toISOString()
    });

    const resultat =
      appliquerControleGouvernanteV4DansDrive_(
        logement,
        gouvernante,
        ancienEtat
      );

    if (
      resultat &&
      resultat.succes === false
    ) {
      throw new Error(
        resultat.message ||
        "Le moteur V4 a refusé la validation."
      );
    }

    SpreadsheetApp.flush();

    enregistrerTraceControleGouvernanteV4_20260907_({
      etape: "succes",
      logement: logement,
      gouvernante: gouvernante,
      resultat: resultat || null,
      date: new Date().toISOString()
    });

    SpreadsheetApp
      .getActiveSpreadsheet()
      .toast(
        logement +
          " validé Prêt par " +
          gouvernante +
          ".",
        "✅ Contrôle gouvernante",
        6
      );

  } catch (
    erreur
  ) {
    enregistrerTraceControleGouvernanteV4_20260907_({
      etape: "erreur",
      logement: logement,
      gouvernante: gouvernante,
      ancienEtat: ancienEtat,
      message:
        erreur && erreur.message
          ? erreur.message
          : String(erreur),
      date: new Date().toISOString()
    });

    console.error(
      "Contrôle gouvernante manuel : " +
      (
        erreur && erreur.message
          ? erreur.message
          : String(erreur)
      )
    );

  } finally {
    if (
      ancienneActualisationReception
    ) {
      actualiserReceptionApresValidationMenage =
        ancienneActualisationReception;
    }

    verrou.releaseLock();
  }
}


/**
 * Affiche la dernière trace enregistrée.
 *
 * Si le prochain test échoue, exécuter cette fonction :
 * diagnostiquerDernierControleGouvernanteV4_20260907
 */
function diagnostiquerDernierControleGouvernanteV4_20260907() {
  const brut =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CONTROLE_GOUVERNANTE_MANUEL_V4_20260907.PROP_TRACE
      );

  let texte =
    brut || "Aucune trace enregistrée.";

  try {
    if (brut) {
      texte =
        JSON.stringify(
          JSON.parse(brut),
          null,
          2
        );
    }
  } catch (erreur) {
    // On affiche la valeur brute.
  }

  console.log(
    "DIAGNOSTIC_CONTROLE_GOUVERNANTE : " +
    texte
  );

  notifierControleGouvernanteV4_20260907_(
    "Diagnostic enregistré dans le journal d'exécution."
  );

  return texte;
}


function enregistrerTraceControleGouvernanteV4_20260907_(
  donnees
) {
  PropertiesService
    .getScriptProperties()
    .setProperty(
      CONTROLE_GOUVERNANTE_MANUEL_V4_20260907.PROP_TRACE,
      JSON.stringify(
        donnees || {}
      )
    );
}


/**
 * Notification sans dépendre de l'interface Google Sheets.
 * Une éventuelle erreur d'affichage n'interrompt jamais
 * l'installation ni le contrôle.
 */
function notifierControleGouvernanteV4_20260907_(
  message
) {
  const texte =
    String(
      message || ""
    );

  console.log(
    texte
  );

  try {
    const classeur =
      SpreadsheetApp.getActiveSpreadsheet();

    if (classeur) {
      classeur.toast(
        texte,
        "CampManager V4",
        7
      );
    }
  } catch (
    erreur
  ) {
    console.log(
      "Toast non disponible : " +
      (
        erreur && erreur.message
          ? erreur.message
          : String(erreur)
      )
    );
  }
}


function normaliserControleGouvernanteV4_20260907_(
  valeur
) {
  return String(
    valeur || ""
  )
    .trim()
    .toLocaleLowerCase(
      "fr"
    )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}