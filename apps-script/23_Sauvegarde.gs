/**
 * =========================================================
 * CAMPMANAGER
 * SAUVEGARDE ET RÉINITIALISATION — VERSION 2.1 OPEN SOURCE
 * 25/09/2026
 * =========================================================
 *
 * - sauvegardes génériques multi-établissement ;
 * - conservation de 20 sauvegardes par établissement ;
 * - protection contre une réinitialisation du MASTER ;
 * - nettoyage des états locaux « client en attente » après reset.
 */

const SAUVEGARDE = Object.freeze({
  DOSSIER: "CampManager - Sauvegardes",
  PREFIXE: "Sauvegarde CampManager - ",
  MAX_SAUVEGARDES: 20
});


/**
 * Retourne le nom de l'établissement courant.
 *
 * Priorité :
 * 1. propriété créée par l'installation CampManager ;
 * 2. nom du classeur ;
 * 3. "Etablissement".
 *
 * @return {string}
 */
function obtenirNomEtablissementSauvegarde_() {
  let nom = "";

  try {
    nom =
      String(
        PropertiesService
          .getScriptProperties()
          .getProperty(
            "CAMPMANAGER_ETABLISSEMENT_NOM"
          ) || ""
      ).trim();
  } catch (erreur) {}

  if (!nom) {
    try {
      nom =
        String(
          SpreadsheetApp
            .getActiveSpreadsheet()
            .getName() || ""
        ).trim();
    } catch (erreur) {}
  }

  return nom || "Etablissement";
}


/**
 * Nettoie un nom destiné à être utilisé dans un nom de fichier Drive.
 *
 * @param {*} valeur
 * @return {string}
 */
function nettoyerNomSauvegarde_(valeur) {
  return String(
    valeur || ""
  )
    .trim()
    .replace(
      /[\\/:*?"<>|]+/g,
      "-"
    )
    .replace(
      /\s+/g,
      " "
    )
    .substring(
      0,
      100
    ) || "Etablissement";
}


/**
 * Préfixe propre à l'établissement.
 *
 * @return {string}
 */
function obtenirPrefixeSauvegarde_() {
  return (
    SAUVEGARDE.PREFIXE +
    nettoyerNomSauvegarde_(
      obtenirNomEtablissementSauvegarde_()
    ) +
    " - "
  );
}


/**
 * Retourne le dossier consacré aux sauvegardes.
 * Le crée automatiquement s'il n'existe pas.
 *
 * @return {GoogleAppsScript.Drive.Folder}
 */
function obtenirDossierSauvegardes() {
  const dossiers =
    DriveApp.getFoldersByName(
      SAUVEGARDE.DOSSIER
    );

  if (dossiers.hasNext()) {
    return dossiers.next();
  }

  return DriveApp.createFolder(
    SAUVEGARDE.DOSSIER
  );
}


/**
 * Crée une copie complète du classeur actif.
 *
 * @return {{
 *   id: string,
 *   nom: string,
 *   url: string,
 *   date: string
 * }}
 */
function creerSauvegarde() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!classeur) {
    throw new Error(
      "Aucun classeur CampManager actif."
    );
  }

  /*
   * On force l'écriture des dernières modifications
   * avant de créer la copie.
   */
  SpreadsheetApp.flush();

  const dossier =
    obtenirDossierSauvegardes();

  const date =
    Utilities.formatDate(
      new Date(),
      classeur.getSpreadsheetTimeZone(),
      "yyyy-MM-dd HH-mm-ss"
    );

  const nom =
    obtenirPrefixeSauvegarde_() +
    date;

  const fichierSource =
    DriveApp.getFileById(
      classeur.getId()
    );

  const copie =
    fichierSource.makeCopy(
      nom,
      dossier
    );

  supprimerAnciennesSauvegardes(
    dossier
  );

  return {
    id: copie.getId(),
    nom: copie.getName(),
    url: copie.getUrl(),
    date: date
  };
}


/**
 * Conserve uniquement les sauvegardes
 * les plus récentes DE L'ÉTABLISSEMENT COURANT.
 *
 * Les autres fichiers éventuellement présents
 * dans le dossier ne sont pas supprimés.
 *
 * @param {GoogleAppsScript.Drive.Folder} dossier
 */
function supprimerAnciennesSauvegardes(
  dossier
) {
  const fichiers = [];
  const liste =
    dossier.getFiles();

  const prefixe =
    obtenirPrefixeSauvegarde_();

  while (liste.hasNext()) {
    const fichier =
      liste.next();

    /*
     * Seuls les fichiers créés pour l'établissement courant
     * par ce module sont pris en compte.
     */
    if (
      fichier.getName().indexOf(
        prefixe
      ) === 0
    ) {
      fichiers.push(
        fichier
      );
    }
  }

  fichiers.sort(
    function(fichierA, fichierB) {
      return (
        fichierB.getDateCreated().getTime() -
        fichierA.getDateCreated().getTime()
      );
    }
  );

  fichiers
    .slice(
      SAUVEGARDE.MAX_SAUVEGARDES
    )
    .forEach(
      function(fichier) {
        fichier.setTrashed(
          true
        );
      }
    );
}


/**
 * Lance une sauvegarde manuelle
 * depuis le menu CampManager.
 *
 * @return {Object|undefined}
 */
function sauvegardeManuelle() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  try {
    classeur.toast(
      "Création de la copie en cours…",
      "💾 Sauvegarde",
      3
    );

    const sauvegarde =
      creerSauvegarde();

    verifierSauvegardeCreee_(
      sauvegarde
    );

    classeur.toast(
      "Sauvegarde créée : " +
      sauvegarde.nom,
      "✅ Sauvegarde terminée",
      6
    );

    console.log(
      "Sauvegarde créée : " +
      sauvegarde.nom
    );

    console.log(
      "Lien : " +
      sauvegarde.url
    );

    return sauvegarde;

  } catch (erreur) {
    console.error(
      "Erreur pendant la sauvegarde :",
      erreur
    );

    classeur.toast(
      "La sauvegarde a échoué : " +
      obtenirMessageErreurSauvegarde_(
        erreur
      ),
      "❌ Erreur",
      8
    );

    throw erreur;
  }
}


/**
 * Demande une double confirmation
 * avant la réinitialisation du logiciel.
 *
 * Cette fonction est appelée depuis le menu
 * et ne doit pas être utilisée par un déclencheur.
 */
function menuReinitialiserLogiciel() {
  const ui =
    SpreadsheetApp.getUi();

  try {
    verifierReinitialisationAutoriseeCampManager_();
  } catch (erreur) {
    ui.alert(
      "Réinitialisation bloquée",
      obtenirMessageErreurSauvegarde_(
        erreur
      ),
      ui.ButtonSet.OK
    );

    return;
  }

  const confirmation =
    ui.alert(
      "⚠️ Réinitialisation du logiciel",
      "Cette opération va vider les données des feuilles :\n\n" +
        "• Import\n" +
        "• Base\n" +
        "• Réception\n" +
        "• Ménage\n\n" +
        "Une sauvegarde complète sera créée automatiquement " +
        "avant l'effacement.\n\n" +
        "Sont conservés : Logements, Paramètres, Historique Ménage, " +
        "configuration de l'établissement et accès V4.\n\n" +
        "Continuer ?",
      ui.ButtonSet.YES_NO
    );

  if (
    confirmation !==
    ui.Button.YES
  ) {
    return;
  }

  const saisie =
    ui.prompt(
      "Confirmation renforcée",
      "Pour confirmer, écris exactement :\n\n" +
        "REINITIALISER",
      ui.ButtonSet.OK_CANCEL
    );

  if (
    saisie.getSelectedButton() !==
    ui.Button.OK
  ) {
    return;
  }

  const motConfirmation =
    saisie
      .getResponseText()
      .trim()
      .toUpperCase();

  if (
    motConfirmation !==
    "REINITIALISER"
  ) {
    SpreadsheetApp
      .getActiveSpreadsheet()
      .toast(
        "Le mot de confirmation est incorrect. " +
        "Aucune donnée n'a été supprimée.",
        "Réinitialisation annulée",
        7
      );

    return;
  }

  reinitialiserLogicielSecurise();
}


/**
 * Vérifie que la réinitialisation est exécutée dans
 * un établissement réellement installé.
 *
 * Cela protège CampManager-MASTER d'une suppression accidentelle.
 */
function verifierReinitialisationAutoriseeCampManager_() {
  const code =
    String(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          "CAMPMANAGER_V4_CAMPING_CODE"
        ) || ""
    ).trim();

  if (!code) {
    throw new Error(
      "Aucun établissement n'est associé à ce Google Sheet. " +
      "La réinitialisation est donc bloquée. " +
      "Ne lancez pas cette fonction dans CampManager-MASTER."
    );
  }

  return true;
}


/**
 * Réinitialise les données opérationnelles.
 *
 * Étapes :
 *
 * 1. vérification qu'il s'agit d'un établissement installé ;
 * 2. verrouillage du logiciel ;
 * 3. création d'une sauvegarde complète ;
 * 4. vérification réelle de la sauvegarde Drive ;
 * 5. effacement des feuilles opérationnelles ;
 * 6. nettoyage des états locaux devenus obsolètes ;
 * 7. reconstruction des feuilles de synthèse.
 *
 * @return {Object|undefined}
 */
function reinitialiserLogicielSecurise() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  verifierReinitialisationAutoriseeCampManager_();

  const verrou =
    LockService.getDocumentLock();

  if (!verrou.tryLock(10000)) {
    classeur.toast(
      "Une autre opération est déjà en cours. " +
      "Réessaie dans quelques instants.",
      "⚠️ Logiciel occupé",
      7
    );

    return;
  }

  try {
    classeur.toast(
      "Création de la sauvegarde de sécurité…",
      "Réinitialisation",
      4
    );

    const sauvegarde =
      creerSauvegarde();

    verifierSauvegardeCreee_(
      sauvegarde
    );

    classeur.toast(
      "Sauvegarde créée. Effacement des données…",
      "✅ Sauvegarde vérifiée",
      4
    );

    const feuillesAVider = [
      FEUILLES.IMPORT,
      FEUILLES.BASE,
      FEUILLES.RECEPTION,
      FEUILLES.MENAGE
    ];

    feuillesAVider.forEach(
      function(nomFeuille) {
        const feuille =
          classeur.getSheetByName(
            nomFeuille
          );

        if (!feuille) {
          throw new Error(
            'La feuille "' +
            nomFeuille +
            '" est introuvable.'
          );
        }

        viderDonneesFeuille(
          feuille,
          LIGNES.DEBUT
        );
      }
    );

    /*
     * Les feuilles opérationnelles sont désormais vides :
     * on retire les états DocumentProperties qui faisaient
     * référence à d'anciens clients en attente.
     */
    nettoyerEtatLocalApresReinitialisation_();

    /*
     * Reconstruction silencieuse des feuilles.
     *
     * Base étant vide, Réception repart proprement depuis
     * la liste permanente des logements.
     */
    mettreAJourReception(false);
    mettreAJourMenage(false);
    mettreAJourStatistiques(false);
    mettreAJourTableauDeBord(false);

    SpreadsheetApp.flush();

    classeur.toast(
      "Réinitialisation terminée.\n" +
        "Sauvegarde : " +
        sauvegarde.nom,
      "✅ Logiciel réinitialisé",
      10
    );

    console.log(
      "Réinitialisation terminée."
    );

    console.log(
      "Sauvegarde : " +
      sauvegarde.url
    );

    return sauvegarde;

  } catch (erreur) {
    const messageErreur =
      obtenirMessageErreurSauvegarde_(
        erreur
      );

    console.error(
      "Erreur pendant la réinitialisation :",
      erreur
    );

    classeur.toast(
      "Réinitialisation interrompue : " +
        messageErreur,
      "❌ Erreur",
      10
    );

    throw erreur;

  } finally {
    verrou.releaseLock();
  }
}


/**
 * Supprime uniquement les états locaux devenus incohérents
 * après une réinitialisation des données opérationnelles.
 *
 * Ne touche ni à l'établissement installé, ni au jeton du pont,
 * ni aux accès V4, ni aux paramètres.
 */
function nettoyerEtatLocalApresReinitialisation_() {
  const proprietesDocument =
    PropertiesService
      .getDocumentProperties();

  const toutes =
    proprietesDocument.getProperties();

  Object.keys(
    toutes
  ).forEach(
    function(cle) {
      if (
        cle.indexOf(
          "CM_ATTENTE_"
        ) === 0
      ) {
        proprietesDocument.deleteProperty(
          cle
        );
      }
    }
  );

  /*
   * Marqueurs de nettoyage quotidien :
   * ils peuvent repartir proprement après un reset.
   */
  proprietesDocument.deleteProperty(
    "CAMPMANAGER_DERNIER_NETTOYAGE_PERSONNEL_RECEPTION"
  );

  /*
   * Nettoyage de compatibilité avec l'ancienne version CAPFUN.
   */
  proprietesDocument.deleteProperty(
    "CAPFUN_DERNIER_NETTOYAGE_PERSONNEL_RECEPTION"
  );
}


/**
 * Vérifie réellement que la sauvegarde existe dans Drive
 * et que son identité correspond au résultat retourné.
 *
 * @param {Object} sauvegarde
 */
function verifierSauvegardeCreee_(
  sauvegarde
) {
  if (
    !sauvegarde ||
    !sauvegarde.id ||
    !sauvegarde.nom ||
    !sauvegarde.url
  ) {
    throw new Error(
      "La sauvegarde n'a pas pu être vérifiée."
    );
  }

  let fichier;

  try {
    fichier =
      DriveApp.getFileById(
        sauvegarde.id
      );
  } catch (erreur) {
    throw new Error(
      "La copie de sauvegarde est introuvable dans Google Drive."
    );
  }

  if (
    !fichier ||
    fichier.isTrashed() ||
    fichier.getName() !==
      sauvegarde.nom
  ) {
    throw new Error(
      "La copie de sauvegarde n'a pas pu être confirmée dans Google Drive."
    );
  }

  return true;
}


/**
 * Efface les données d'une feuille
 * à partir de la ligne indiquée.
 *
 * Les en-têtes et les lignes supérieures
 * sont conservés.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuille
 * @param {number} premiereLigne
 */
function viderDonneesFeuille(
  feuille,
  premiereLigne
) {
  const derniereLigne =
    feuille.getLastRow();

  if (
    derniereLigne <
    premiereLigne
  ) {
    return;
  }

  const nombreLignes =
    derniereLigne -
    premiereLigne +
    1;

  const nombreColonnes =
    feuille.getLastColumn();

  if (
    nombreColonnes < 1
  ) {
    return;
  }

  const zone =
    feuille.getRange(
      premiereLigne,
      1,
      nombreLignes,
      nombreColonnes
    );

  /*
   * Suppression des valeurs, formules et couleurs
   * générées dans la zone de données.
   *
   * Les validations, largeurs de colonnes
   * et autres réglages de la feuille sont conservés.
   */
  zone
    .clearContent()
    .setBackground(
      null
    );
}


/**
 * Retourne un message d'erreur exploitable.
 *
 * @param {*} erreur
 *
 * @return {string}
 */
function obtenirMessageErreurSauvegarde_(
  erreur
) {
  if (
    erreur &&
    erreur.message
  ) {
    return erreur.message;
  }

  return String(
    erreur
  );
}