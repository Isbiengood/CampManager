/**
 * ============================================================
 * CAMPMANAGER — LEGACY
 * ANCIEN SYSTÈME — NE PAS INSTALLER
 * ============================================================
 *
 * Conservé uniquement comme référence historique.
 *
 * Ancienne initialisation administrateur CampManager V4.
 * Ne pas ajouter au projet Apps Script MASTER Open Source.
 *
 * Remplacé par l'architecture :
 * - 04_Configuration_CampManager.gs
 * - 05_Installation_CampManager.gs
 * - 96b_Pont_Supabase_OpenSource.gs
 * - 98_Multi_Camping_OpenSource.gs
 *
 * ============================================================
 */
/**
 * ============================================================
 * CAMPMANAGER V4 — INITIALISATION ADMINISTRATEUR
 * VERSION 4.0.0-production.6
 * 26/08/2026
 * ============================================================
 *
 * OBJECTIFS
 * ---------
 * 1. Laisser libre la zone utilisée par l'import eSeason :
 *      Import!A4:E...
 *
 * 2. Conserver éventuellement les protections situées ailleurs
 *    dans le classeur.
 *
 * 3. Réinstaller proprement la synchronisation V4 bidirectionnelle
 *    toutes les minutes :
 *      V4 -> Drive -> Supabase
 *
 * 4. Lancer immédiatement une première synchronisation afin que
 *    les tâches présentes dans Ménage soient envoyées à la V4.
 *
 * IMPORTANT
 * ---------
 * - Ce fichier ne redéclare AUCUNE constante globale existante.
 * - Il ne remplace pas 96_Supabase.gs.
 * - Il ne remplace pas 97_Maintenance.gs.
 * - Il peut être ajouté comme nouveau fichier :
 *
 *      98_Initialisation_Admin_V4
 *
 * - À exécuter UNE SEULE FOIS depuis le compte propriétaire
 *   du fichier V4 stable :
 *
 *      initialiserAdministrateurCampManagerV4
 *
 * Ensuite :
 * - l'import eSeason pourra être fait avec le compte Grand Cerf ;
 * - la synchronisation V4 sera effectuée automatiquement
 *   toutes les minutes par le compte ayant installé le déclencheur.
 * ============================================================
 */


/**
 * ============================================================
 * INITIALISATION COMPLÈTE
 * ============================================================
 *
 * Fonction principale à exécuter UNE SEULE FOIS depuis
 * le compte propriétaire / administrateur.
 */
function initialiserAdministrateurCampManagerV4() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const ui =
    SpreadsheetApp.getUi();

  const confirmation =
    ui.alert(
      "CampManager V4 — Initialisation administrateur",
      "Cette opération va :\n\n" +
        "1. libérer la zone Import!A4:E pour eSeason ;\n" +
        "2. réinstaller la synchronisation V4 toutes les minutes ;\n" +
        "3. lancer une synchronisation immédiatement.\n\n" +
        "Aucune réservation ne sera supprimée.\n\n" +
        "Continuer ?",
      ui.ButtonSet.YES_NO
    );

  if (
    confirmation !==
      ui.Button.YES
  ) {
    return {
      succes: false,
      annule: true
    };
  }

  const resultatImport =
    libererZoneImportAdminCampManagerV4_(
      classeur
    );

  const resultatDeclencheur =
    installerDeclencheurV4AdminCampManagerV4_(
      classeur
    );

  let resultatSynchronisation = null;
  let erreurSynchronisation = "";

  try {
    resultatSynchronisation =
      synchroniserMaintenantAdminCampManagerV4_();

  } catch (erreur) {
    erreurSynchronisation =
      erreur &&
      erreur.message
        ? erreur.message
        : String(erreur);
  }

  installerMenuAdminCampManagerV4_(
    classeur
  );

  const lignes = [
    "ZONE IMPORT",
    resultatImport.libre
      ? "✅ Import!A4:E est libre"
      : "❌ Import est encore protégé",
    "Protections bloquantes supprimées : " +
      resultatImport.protectionsSupprimees,
    "",
    "SYNCHRONISATION V4",
    resultatDeclencheur.installe
      ? "✅ Déclencheur installé toutes les minutes"
      : "❌ Déclencheur non installé"
  ];

  if (erreurSynchronisation) {
    lignes.push(
      "",
      "PREMIÈRE SYNCHRONISATION",
      "❌ Erreur : " +
        erreurSynchronisation
    );

  } else {
    lignes.push(
      "",
      "PREMIÈRE SYNCHRONISATION",
      "✅ Synchronisation lancée avec succès"
    );

    if (
      resultatSynchronisation &&
      resultatSynchronisation.driveVersV4
    ) {
      const sortie =
        resultatSynchronisation.driveVersV4;

      if (
        typeof sortie.taches !==
          "undefined"
      ) {
        lignes.push(
          "Tâches envoyées : " +
            sortie.taches
        );
      }

      if (
        typeof sortie.affectations !==
          "undefined"
      ) {
        lignes.push(
          "Affectations envoyées : " +
            sortie.affectations
        );
      }
    }
  }

  lignes.push(
    "",
    "✅ Initialisation terminée.",
    "",
    "À partir de maintenant, il n'est plus nécessaire de passer par le compte administrateur à chaque import."
  );

  ui.alert(
    erreurSynchronisation ||
    !resultatImport.libre ||
    !resultatDeclencheur.installe
      ? "⚠️ CampManager V4 — Vérification nécessaire"
      : "✅ CampManager V4 — Prêt",
    lignes.join("\n"),
    ui.ButtonSet.OK
  );

  classeur.toast(
    erreurSynchronisation
      ? "Initialisation terminée avec une erreur de synchronisation."
      : "Import libre + synchronisation V4 installée.",
    "CampManager V4",
    8
  );

  return {
    succes:
      !erreurSynchronisation &&
      resultatImport.libre &&
      resultatDeclencheur.installe,

    import:
      resultatImport,

    declencheur:
      resultatDeclencheur,

    synchronisation:
      resultatSynchronisation,

    erreurSynchronisation:
      erreurSynchronisation
  };
}


/**
 * ============================================================
 * LIBÉRER IMPORT — COMMANDE MANUELLE
 * ============================================================
 */
function libererImportAdminCampManagerV4() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const resultat =
    libererZoneImportAdminCampManagerV4_(
      classeur
    );

  SpreadsheetApp
    .getUi()
    .alert(
      resultat.libre
        ? "✅ Import eSeason libre"
        : "⚠️ Import encore protégé",
      [
        "Zone : " +
          resultat.zone,
        "",
        "Protections de plage supprimées : " +
          resultat.protectionsSupprimees,
        "Protections de feuille adaptées : " +
          resultat.protectionsFeuilleAdaptees,
        "",
        resultat.libre
          ? "✅ Aucune protection ne bloque désormais la zone utilisée par l'import."
          : "❌ Une protection bloque encore la zone Import.",
        resultat.erreurs.length
          ? (
              "\nErreurs :\n" +
              resultat.erreurs.join("\n")
            )
          : ""
      ].join("\n"),
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return resultat;
}


/**
 * Moteur interne :
 * - supprime uniquement les protections de plage qui chevauchent
 *   Import A4:E ;
 * - si la feuille entière est protégée, ajoute A4:E aux plages
 *   non protégées ;
 * - ne touche pas aux protections des autres feuilles.
 */
function libererZoneImportAdminCampManagerV4_(
  classeur
) {
  const feuille =
    classeur.getSheetByName(
      "Import"
    );

  if (!feuille) {
    throw new Error(
      "La feuille Import est introuvable."
    );
  }

  const derniereLigne =
    Math.max(
      feuille.getMaxRows(),
      4
    );

  const zoneImport =
    feuille.getRange(
      4,
      1,
      derniereLigne - 3,
      5
    );

  const resultat = {
    zone:
      "Import!A4:E" +
      derniereLigne,

    protectionsSupprimees:
      0,

    protectionsFeuilleAdaptees:
      0,

    protectionsBloquantesRestantes:
      0,

    libre:
      false,

    erreurs:
      []
  };

  /*
   * 1. PROTECTIONS DE PLAGE
   *
   * Toute protection de plage qui chevauche A4:E est supprimée.
   * Les protections situées ailleurs sont conservées.
   */
  const protectionsPlage =
    feuille.getProtections(
      SpreadsheetApp
        .ProtectionType
        .RANGE
    );

  protectionsPlage.forEach(
    function(protection) {
      let plage = null;

      try {
        plage =
          protection.getRange();

      } catch (erreur) {
        resultat.erreurs.push(
          "Lecture d'une protection impossible : " +
            (
              erreur &&
              erreur.message
                ? erreur.message
                : String(erreur)
            )
        );

        return;
      }

      if (
        !plage ||
        !plagesSeChevauchentAdminV4_(
          plage,
          zoneImport
        )
      ) {
        return;
      }

      try {
        /*
         * On tente réellement la suppression.
         * Le compte propriétaire doit pouvoir la retirer.
         */
        protection.remove();

        resultat.protectionsSupprimees++;

      } catch (erreur) {
        resultat.erreurs.push(
          "Impossible de supprimer la protection " +
            plage.getA1Notation() +
            " : " +
            (
              erreur &&
              erreur.message
                ? erreur.message
                : String(erreur)
            )
        );
      }
    }
  );

  /*
   * 2. PROTECTION DE FEUILLE
   *
   * Si Import est protégée comme feuille entière, on ne la
   * déprotège pas complètement : on ajoute simplement la zone
   * A4:E à ses plages explicitement non protégées.
   */
  const protectionsFeuille =
    feuille.getProtections(
      SpreadsheetApp
        .ProtectionType
        .SHEET
    );

  protectionsFeuille.forEach(
    function(protection) {
      try {
        if (
          protection.isWarningOnly()
        ) {
          /*
           * Une protection "avertissement uniquement"
           * ne bloque pas l'écriture.
           */
          return;
        }

        const plagesNonProtegees =
          protection.getUnprotectedRanges() ||
          [];

        const dejaPresente =
          plagesNonProtegees.some(
            function(plage) {
              return (
                plage.getSheet()
                  .getSheetId() ===
                    feuille.getSheetId() &&
                plage.getRow() <=
                  zoneImport.getRow() &&
                plage.getLastRow() >=
                  zoneImport.getLastRow() &&
                plage.getColumn() <=
                  zoneImport.getColumn() &&
                plage.getLastColumn() >=
                  zoneImport.getLastColumn()
              );
            }
          );

        if (!dejaPresente) {
          plagesNonProtegees.push(
            zoneImport
          );

          protection.setUnprotectedRanges(
            plagesNonProtegees
          );

          resultat.protectionsFeuilleAdaptees++;
        }

      } catch (erreur) {
        resultat.erreurs.push(
          "Impossible d'adapter une protection de feuille : " +
            (
              erreur &&
              erreur.message
                ? erreur.message
                : String(erreur)
            )
        );
      }
    }
  );

  SpreadsheetApp.flush();

  /*
   * 3. CONTRÔLE STRUCTUREL
   *
   * On ne se contente pas de canEdit(), car le propriétaire
   * peut parfois éditer une plage protégée.
   *
   * On vérifie donc qu'aucune protection RANGE ne chevauche
   * encore A4:E et que les éventuelles protections SHEET
   * autorisent explicitement cette zone.
   */
  const protectionsRestantes =
    feuille.getProtections(
      SpreadsheetApp
        .ProtectionType
        .RANGE
    );

  protectionsRestantes.forEach(
    function(protection) {
      try {
        const plage =
          protection.getRange();

        if (
          plage &&
          plagesSeChevauchentAdminV4_(
            plage,
            zoneImport
          )
        ) {
          resultat
            .protectionsBloquantesRestantes++;
        }
      } catch (erreur) {
        resultat
          .protectionsBloquantesRestantes++;
      }
    }
  );

  const protectionsFeuilleRestantes =
    feuille.getProtections(
      SpreadsheetApp
        .ProtectionType
        .SHEET
    );

  protectionsFeuilleRestantes.forEach(
    function(protection) {
      try {
        if (
          protection.isWarningOnly()
        ) {
          return;
        }

        const plagesNonProtegees =
          protection.getUnprotectedRanges() ||
          [];

        const zoneAutorisee =
          plagesNonProtegees.some(
            function(plage) {
              return (
                plage.getSheet()
                  .getSheetId() ===
                    feuille.getSheetId() &&
                plage.getRow() <=
                  zoneImport.getRow() &&
                plage.getLastRow() >=
                  zoneImport.getLastRow() &&
                plage.getColumn() <=
                  zoneImport.getColumn() &&
                plage.getLastColumn() >=
                  zoneImport.getLastColumn()
              );
            }
          );

        if (!zoneAutorisee) {
          resultat
            .protectionsBloquantesRestantes++;
        }

      } catch (erreur) {
        resultat
          .protectionsBloquantesRestantes++;
      }
    }
  );

  resultat.libre =
    resultat
      .protectionsBloquantesRestantes ===
        0;

  return resultat;
}


/**
 * Retourne true si deux plages se chevauchent.
 */
function plagesSeChevauchentAdminV4_(
  plageA,
  plageB
) {
  if (
    plageA.getSheet()
      .getSheetId() !==
    plageB.getSheet()
      .getSheetId()
  ) {
    return false;
  }

  const lignesSeChevauchent =
    plageA.getRow() <=
      plageB.getLastRow() &&
    plageA.getLastRow() >=
      plageB.getRow();

  const colonnesSeChevauchent =
    plageA.getColumn() <=
      plageB.getLastColumn() &&
    plageA.getLastColumn() >=
      plageB.getColumn();

  return (
    lignesSeChevauchent &&
    colonnesSeChevauchent
  );
}


/**
 * ============================================================
 * SYNCHRONISATION V4 — INSTALLATION DU DÉCLENCHEUR
 * ============================================================
 *
 * Installe UNE SEULE automatisation :
 *
 * synchroniserCampManagerV4Bidirectionnel
 *
 * toutes les minutes.
 *
 * Les anciens déclencheurs V4 sont supprimés pour éviter
 * qu'ils fonctionnent en parallèle.
 */
function installerDeclencheurV4AdminCampManagerV4_(
  classeur
) {
  const fonctionsV4 = [
    "traiterActionsV4VersDrive",
    "synchroniserGoogleDriveVersSupabaseV4",
    "synchroniserCampManagerV4Bidirectionnel"
  ];

  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        const nom =
          declencheur
            .getHandlerFunction();

        if (
          fonctionsV4.indexOf(
            nom
          ) !== -1
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );

  if (
    typeof synchroniserCampManagerV4Bidirectionnel !==
      "function"
  ) {
    throw new Error(
      "La fonction synchroniserCampManagerV4Bidirectionnel() est introuvable dans 96_Supabase.gs."
    );
  }

  ScriptApp
    .newTrigger(
      "synchroniserCampManagerV4Bidirectionnel"
    )
    .timeBased()
    .everyMinutes(
      1
    )
    .create();

  const trouves =
    ScriptApp
      .getProjectTriggers()
      .filter(
        function(declencheur) {
          return (
            declencheur
              .getHandlerFunction() ===
            "synchroniserCampManagerV4Bidirectionnel"
          );
        }
      );

  return {
    installe:
      trouves.length ===
        1,

    nombre:
      trouves.length
  };
}


/**
 * ============================================================
 * SYNCHRONISER MAINTENANT
 * ============================================================
 */
function synchroniserMaintenantAdminCampManagerV4() {
  const ui =
    SpreadsheetApp.getUi();

  try {
    const resultat =
      synchroniserMaintenantAdminCampManagerV4_();

    ui.alert(
      "✅ Synchronisation V4",
      "La synchronisation Drive ↔ V4 vient d'être exécutée.\n\n" +
        "Actualisez maintenant CampManager.",
      ui.ButtonSet.OK
    );

    return resultat;

  } catch (erreur) {
    ui.alert(
      "❌ Synchronisation V4",
      erreur &&
      erreur.message
        ? erreur.message
        : String(erreur),
      ui.ButtonSet.OK
    );

    throw erreur;
  }
}


function synchroniserMaintenantAdminCampManagerV4_() {
  if (
    typeof synchroniserCampManagerV4Bidirectionnel !==
      "function"
  ) {
    throw new Error(
      "La fonction synchroniserCampManagerV4Bidirectionnel() est introuvable. Vérifiez 96_Supabase.gs."
    );
  }

  return synchroniserCampManagerV4Bidirectionnel();
}


/**
 * ============================================================
 * VÉRIFIER LE DÉCLENCHEUR
 * ============================================================
 */
function verifierDeclencheurAdminCampManagerV4() {
  const nomsV4 = [
    "traiterActionsV4VersDrive",
    "synchroniserGoogleDriveVersSupabaseV4",
    "synchroniserCampManagerV4Bidirectionnel"
  ];

  const trouves =
    ScriptApp
      .getProjectTriggers()
      .map(
        function(declencheur) {
          return declencheur
            .getHandlerFunction();
        }
      )
      .filter(
        function(nom) {
          return (
            nomsV4.indexOf(
              nom
            ) !== -1
          );
        }
      );

  const correct =
    trouves.length ===
      1 &&
    trouves[0] ===
      "synchroniserCampManagerV4Bidirectionnel";

  SpreadsheetApp
    .getUi()
    .alert(
      correct
        ? "✅ Synchronisation V4 correcte"
        : "⚠️ Synchronisation V4 à réparer",
      (
        trouves.length
          ? (
              "Déclencheur(s) V4 trouvé(s) :\n\n" +
              trouves.join("\n")
            )
          : "Aucun déclencheur V4 installé."
      ) +
        "\n\n" +
        (
          correct
            ? "Configuration correcte : une synchronisation bidirectionnelle toutes les minutes."
            : "Utilisez « Initialiser / réparer complètement » dans le menu ⚙️ Admin V4."
        ),
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return {
    correct:
      correct,

    declencheurs:
      trouves
  };
}


/**
 * ============================================================
 * MENU ADMIN V4
 * ============================================================
 */
function creerMenuAdminCampManagerV4() {
  SpreadsheetApp
    .getUi()
    .createMenu(
      "⚙️ Admin V4"
    )
    .addItem(
      "✅ Initialiser / réparer complètement",
      "initialiserAdministrateurCampManagerV4"
    )
    .addSeparator()
    .addItem(
      "🔓 Libérer Import eSeason",
      "libererImportAdminCampManagerV4"
    )
    .addItem(
      "🔄 Synchroniser maintenant",
      "synchroniserMaintenantAdminCampManagerV4"
    )
    .addItem(
      "🔎 Vérifier la synchronisation V4",
      "verifierDeclencheurAdminCampManagerV4"
    )
    .addToUi();
}


/**
 * Installe le menu Admin V4 à l'ouverture du classeur.
 *
 * Cette fonction est appelée automatiquement par
 * initialiserAdministrateurCampManagerV4().
 */
function installerMenuAdminCampManagerV4_(
  classeur
) {
  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        if (
          declencheur
            .getHandlerFunction() ===
          "creerMenuAdminCampManagerV4"
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );

  ScriptApp
    .newTrigger(
      "creerMenuAdminCampManagerV4"
    )
    .forSpreadsheet(
      classeur
    )
    .onOpen()
    .create();

  creerMenuAdminCampManagerV4();
}

