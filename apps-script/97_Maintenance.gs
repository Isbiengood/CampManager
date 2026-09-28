/**
 * ============================================================
 * CAMPMANAGER — 97_MAINTENANCE
 * VERSION 4.1.0-multicamping — MENUS / MAINTENANCE
 * ============================================================
 *
 * BACK-OFFICE ACCÈS V4 — MULTI-CAMPING
 * --------------------
 * - Préparer une première connexion.
 * - Réinitialiser un PIN oublié.
 * - Désactiver immédiatement un compte.
 * - Réactiver un compte.
 * - Consulter l'état des accès.
 * - Réparer les protections Google Sheets du classeur.
 *
 * IMPORTANT
 * ---------
 * Le moteur de synchronisation V4 reste uniquement dans
 * 96_Supabase.gs.
 *
 * Toutes les actions personnel sont filtrées par le code du camping courant.
 * Ce fichier ne redéclare aucune constante V4 globale.
 * ============================================================
 */


/**
 * Retourne le code du camping associé à CE Google Sheet.
 *
 * Le code est fourni par le moteur multi-camping déjà installé
 * dans le projet (ex. "camping-du-lac").
 *
 * IMPORTANT :
 * le back-office ne doit jamais administrer le personnel
 * d'un autre camping.
 */
function obtenirCodeCampingMaintenanceV4_() {
  if (
    typeof obtenirCodeCampingCampManagerV4_ !==
      "function"
  ) {
    throw new Error(
      "Configuration multi-camping introuvable. " +
      "Le moteur V4 multi-camping doit être installé avant le back-office."
    );
  }

  const code =
    String(
      obtenirCodeCampingCampManagerV4_() ||
      ""
    ).trim();

  if (!code) {
    throw new Error(
      "Code camping introuvable dans la configuration V4."
    );
  }

  return code;
}


/**
 * Vérifie que le moteur V4 est correctement chargé.
 */
function verifierMaintenanceCampManager() {
  const v4Chargee =
    typeof CAMPMANAGER_V4_DRIVE_SYNC_20260820 !==
      "undefined";

  const pontCharge =
    typeof CAMPMANAGER_V4_BRIDGE_20260820 !==
      "undefined";

  const message =
    "97_Maintenance : OK\n\n" +
    "Moteur V4 chargé depuis 96_Supabase : " +
    (
      v4Chargee
        ? "OUI"
        : "NON"
    ) +
    "\n" +
    "Pont V4 ↔ Drive chargé : " +
    (
      pontCharge
        ? "OUI"
        : "NON"
    );

  SpreadsheetApp
    .getUi()
    .alert(
      "CampManager — Maintenance",
      message,
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return {
    maintenance:
      true,

    v4Chargee:
      v4Chargee,

    pontCharge:
      pontCharge
  };
}


/**
 * PREMIÈRE CONNEXION OU PIN OUBLIÉ
 *
 * Génère un code temporaire à 6 chiffres, valable 24 heures.
 *
 * IMPORTANT :
 * - l'ancien PIN est immédiatement invalidé ;
 * - toutes les sessions ouvertes de cette personne sont coupées ;
 * - la personne choisira elle-même son nouveau PIN dans la V4.
 */
function preparerOuReinitialiserAccesPersonnelV4() {
  const ui =
    SpreadsheetApp.getUi();

  const reponse =
    ui.prompt(
      "V4 — Préparer / réinitialiser un accès — " + obtenirCodeCampingMaintenanceV4_(),
      "Prénom exact de la personne :",
      ui.ButtonSet.OK_CANCEL
    );

  if (
    reponse.getSelectedButton() !==
      ui.Button.OK
  ) {
    return;
  }

  const prenom =
    String(
      reponse.getResponseText() ||
      ""
    ).trim();

  if (!prenom) {
    ui.alert(
      "Le prénom est obligatoire."
    );

    return;
  }

  const confirmation =
    ui.alert(
      "V4 — Confirmer",
      "Préparer un nouvel accès pour " +
        prenom +
        " ?\n\n" +
        "Si un PIN existe déjà, il sera immédiatement réinitialisé et les sessions ouvertes seront fermées.",
      ui.ButtonSet.YES_NO
    );

  if (
    confirmation !==
      ui.Button.YES
  ) {
    return;
  }

  const campingCode =
    obtenirCodeCampingMaintenanceV4_();

  const resultat =
    appelerRpcCampManagerOpenSource_(
      "reinitialiser_acces_personnel_multicamping_v4",
      {
        p_camping_code:
          campingCode,

        p_prenom:
          prenom
      }
    );

  const code =
    String(
      resultat.codeActivation ||
      ""
    ).trim();

  if (!code) {
    throw new Error(
      "Supabase n'a pas renvoyé le code d'activation."
    );
  }

  ui.alert(
    "✅ Code d’activation V4",
    "Personne : " +
      (
        resultat.prenom ||
        prenom
      ) +
      "\n\n" +
      "CODE TEMPORAIRE : " +
      code +
      "\n\n" +
      "Valable 24 heures et utilisable une seule fois.\n\n" +
      "La personne ouvre CampManager, choisit « Première connexion / nouveau PIN », saisit ce code puis choisit elle-même son PIN.",
    ui.ButtonSet.OK
  );

  return resultat;
}


/**
 * DÉSACTIVER UN COMPTE
 *
 * L'effet est immédiat dans Supabase :
 * - connexion refusée ;
 * - sessions existantes supprimées ;
 * - la synchronisation Drive ne réactive pas le compte.
 */
function desactiverPersonnelV4() {
  return changerStatutActifPersonnelV4_(
    false
  );
}


/**
 * RÉACTIVER UN COMPTE
 *
 * Le PIN existant est conservé s'il existe encore.
 * Si la personne a oublié son PIN, utiliser ensuite :
 * preparerOuReinitialiserAccesPersonnelV4
 */
function activerPersonnelV4() {
  return changerStatutActifPersonnelV4_(
    true
  );
}


function changerStatutActifPersonnelV4_(
  actif
) {
  const ui =
    SpreadsheetApp.getUi();

  const libelle =
    actif
      ? "réactiver"
      : "désactiver";

  const reponse =
    ui.prompt(
      "V4 — " +
        (
          actif
            ? "Réactiver"
            : "Désactiver"
        ) +
        " un accès — " +
        obtenirCodeCampingMaintenanceV4_(),
      "Prénom exact de la personne à " +
        libelle +
        " :",
      ui.ButtonSet.OK_CANCEL
    );

  if (
    reponse.getSelectedButton() !==
      ui.Button.OK
  ) {
    return;
  }

  const prenom =
    String(
      reponse.getResponseText() ||
      ""
    ).trim();

  if (!prenom) {
    ui.alert(
      "Le prénom est obligatoire."
    );

    return;
  }

  const confirmation =
    ui.alert(
      "V4 — Confirmer",
      (
        actif
          ? "Réactiver l’accès de "
          : "Désactiver immédiatement l’accès de "
      ) +
        prenom +
        " ?",
      ui.ButtonSet.YES_NO
    );

  if (
    confirmation !==
      ui.Button.YES
  ) {
    return;
  }

  const campingCode =
    obtenirCodeCampingMaintenanceV4_();

  const resultat =
    appelerRpcCampManagerOpenSource_(
      "changer_actif_personnel_multicamping_v4",
      {
        p_camping_code:
          campingCode,

        p_prenom:
          prenom,

        p_actif:
          actif
      }
    );

  ui.alert(
    actif
      ? "✅ Accès réactivé"
      : "⛔ Accès désactivé",
    (
      resultat.prenom ||
      prenom
    ) +
      (
        actif
          ? " peut de nouveau utiliser CampManager."
          : " ne peut plus se connecter. Ses sessions ouvertes ont été fermées."
      ),
    ui.ButtonSet.OK
  );

  return resultat;
}


/**
 * Affiche l'état des comptes V4.
 */
function listerAccesPersonnelV4() {
  const ui =
    SpreadsheetApp.getUi();

  const campingCode =
    obtenirCodeCampingMaintenanceV4_();

  const resultat =
    appelerRpcCampManagerOpenSource_(
      "lister_acces_personnel_multicamping_v4",
      {
        p_camping_code:
          campingCode
      }
    );

  const liste =
    Array.isArray(
      resultat
    )
      ? resultat
      : [];

  const lignes =
    liste.map(
      function(item) {
        const etat =
          item.actif
            ? "ACTIF"
            : "INACTIF";

        let acces;

        if (
          item.pinConfigure
        ) {
          acces =
            "PIN configuré";

        } else if (
          item.activationEnAttente
        ) {
          acces =
            "code d’activation en attente";

        } else {
          acces =
            "PIN non configuré";
        }

        return (
          item.prenom +
          " — " +
          etat +
          " — " +
          acces
        );
      }
    );

  ui.alert(
    "V4 — État des accès — " +
      campingCode,
    lignes.length
      ? lignes.join("\n")
      : "Aucun personnel V4.",
    ui.ButtonSet.OK
  );

  return liste;
}


/**
 * ============================================================
 * MENU BACK-OFFICE DANS GOOGLE SHEETS
 * ============================================================
 *
 * À installer UNE SEULE FOIS avec :
 * installerMenuBackOfficeV4
 *
 * Ensuite le menu "🔐 Accès V4" sera recréé à chaque ouverture
 * du tableur via un déclencheur installable dédié.
 */
function creerMenuBackOfficeV4() {
  const ui =
    SpreadsheetApp.getUi();

  /*
   * Les outils techniques ne sont plus affichés comme un menu
   * « Admin V4 » séparé. Ils sont regroupés ici afin de garder
   * seulement les menus principaux nécessaires à l'exploitation.
   */
  const menuMaintenance =
    ui.createMenu(
      "🛠️ Maintenance / réparation"
    )
      .addItem(
        "🔎 Vérifier le moteur V4",
        "verifierMaintenanceCampManager"
      )
      .addItem(
        "⏱️ Vérifier l’actualisation automatique",
        "verifierActualisationAutomatiqueDepuisMaintenanceV4"
      )
      .addItem(
        "🔁 Réinstaller l’actualisation 1 min",
        "reinstallerActualisationAutomatiqueDepuisMaintenanceV4"
      )
      .addSeparator()
      .addItem(
        "📥 Libérer la feuille Import",
        "libererImportESeasonCampManagerV4"
      )
      .addItem(
        "🛡️ Réparer toutes les protections Drive",
        "reparerProtectionsDriveCampManagerV4"
      );

  ui.createMenu(
    "🔐 Accès V4"
  )
    .addItem(
      "👤 Première connexion / PIN oublié",
      "preparerOuReinitialiserAccesPersonnelV4"
    )
    .addSeparator()
    .addItem(
      "⛔ Désactiver une personne",
      "desactiverPersonnelV4"
    )
    .addItem(
      "✅ Réactiver une personne",
      "activerPersonnelV4"
    )
    .addSeparator()
    .addItem(
      "👁️ Voir l’état des accès",
      "listerAccesPersonnelV4"
    )
    .addSeparator()
    .addSubMenu(
      menuMaintenance
    )
    .addToUi();
}


/**
 * Vérifie l'état du déclencheur automatique V4 installé par le
 * correctif 98c, sans exposer directement son nom technique au menu.
 */
function verifierActualisationAutomatiqueDepuisMaintenanceV4() {
  if (
    typeof verifierActualisationAutomatiqueV4_20260827c ===
      "function"
  ) {
    return verifierActualisationAutomatiqueV4_20260827c();
  }

  SpreadsheetApp
    .getUi()
    .alert(
      "⚠️ Actualisation V4",
      "La fonction de contrôle de l’actualisation automatique est introuvable.\n\n" +
        "Vérifiez que le fichier 98_Correctif_V4_Reception_20260827c est toujours présent.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  return false;
}


/**
 * Réinstalle le déclencheur sécurisé environ toutes les minutes.
 * Cette opération ne touche pas aux déclencheurs métier V3.
 */
function reinstallerActualisationAutomatiqueDepuisMaintenanceV4() {
  const ui =
    SpreadsheetApp.getUi();

  const confirmation =
    ui.alert(
      "🔁 Réinstaller l’actualisation V4",
      "Utilisez cette réparation uniquement si CampManager ne transmet plus automatiquement les informations.\n\n" +
        "Le déclencheur V4 sécurisé sera recréé environ toutes les minutes.\n\n" +
        "Continuer ?",
      ui.ButtonSet.YES_NO
    );

  if (
    confirmation !==
      ui.Button.YES
  ) {
    return false;
  }

  if (
    typeof installerActualisationAutomatiqueV4_20260827c ===
      "function"
  ) {
    return installerActualisationAutomatiqueV4_20260827c();
  }

  ui.alert(
    "⚠️ Actualisation V4",
    "La fonction d’installation de l’actualisation automatique est introuvable.\n\n" +
      "Vérifiez que le fichier 98_Correctif_V4_Reception_20260827c est toujours présent.",
    ui.ButtonSet.OK
  );

  return false;
}


/**
 * ============================================================
 * LIBÉRER UNIQUEMENT LA FEUILLE IMPORT
 * ============================================================
 *
 * Réparation ciblée : retire uniquement les protections qui peuvent
 * empêcher l'écriture dans la zone Import A4:E... ainsi qu'une
 * éventuelle protection de la feuille Import entière.
 *
 * Les autres feuilles et leurs protections ne sont pas touchées.
 */
function libererImportESeasonCampManagerV4() {
  const ui =
    SpreadsheetApp.getUi();

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const nomImport =
    typeof FEUILLES !==
        "undefined" &&
      FEUILLES.IMPORT
      ? FEUILLES.IMPORT
      : "Import";

  const feuille =
    classeur.getSheetByName(
      nomImport
    );

  if (!feuille) {
    ui.alert(
      "❌ Import des réservations",
      "La feuille Import est introuvable.",
      ui.ButtonSet.OK
    );

    return false;
  }

  const confirmation =
    ui.alert(
      "📥 Libérer la feuille Import",
      "Cette réparation retire uniquement les protections qui bloquent la zone d’import des réservations dans la feuille Import.\n\n" +
        "Aucune donnée, formule ou réservation n’est supprimée.\n\n" +
        "À utiliser seulement si l’import affiche une erreur de cellule protégée.\n\n" +
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

  const resultat = {
    succes: true,
    plagesSupprimees: 0,
    feuillesSupprimees: 0,
    nonModifiables: 0,
    ignorees: 0
  };

  /*
   * Zone réellement utilisée par l'import : colonnes A:E,
   * à partir de la ligne 4 jusqu'à la fin de la feuille.
   */
  const ligneDebut =
    4;

  const ligneFin =
    Math.max(
      1000,
      feuille.getMaxRows()
    );

  const colonneDebut =
    1;

  const colonneFin =
    5;

  feuille
    .getProtections(
      SpreadsheetApp.ProtectionType.RANGE
    )
    .forEach(
      function(protection) {
        try {
          const plage =
            protection.getRange();

          const debutLigneProtection =
            plage.getRow();

          const finLigneProtection =
            plage.getLastRow();

          const debutColonneProtection =
            plage.getColumn();

          const finColonneProtection =
            plage.getLastColumn();

          const chevauche =
            finLigneProtection >=
              ligneDebut &&
            debutLigneProtection <=
              ligneFin &&
            finColonneProtection >=
              colonneDebut &&
            debutColonneProtection <=
              colonneFin;

          if (!chevauche) {
            resultat.ignorees++;
            return;
          }

          if (
            protection.canEdit()
          ) {
            protection.remove();
            resultat.plagesSupprimees++;
          } else {
            resultat.nonModifiables++;
          }

        } catch (erreur) {
          resultat.nonModifiables++;
        }
      }
    );

  /*
   * Une protection de la feuille entière bloque forcément Import.
   */
  feuille
    .getProtections(
      SpreadsheetApp.ProtectionType.SHEET
    )
    .forEach(
      function(protection) {
        try {
          if (
            protection.canEdit()
          ) {
            protection.remove();
            resultat.feuillesSupprimees++;
          } else {
            resultat.nonModifiables++;
          }

        } catch (erreur) {
          resultat.nonModifiables++;
        }
      }
    );

  SpreadsheetApp.flush();

  const totalSupprime =
    resultat.plagesSupprimees +
    resultat.feuillesSupprimees;

  ui.alert(
    resultat.nonModifiables > 0
      ? "⚠️ Import partiellement libéré"
      : "✅ Import des réservations libéré",
    "Protections retirées : " +
      totalSupprime +
      "\n\n• Plages Import : " +
      resultat.plagesSupprimees +
      "\n• Protection de feuille : " +
      resultat.feuillesSupprimees +
      "\n• Protections non modifiables : " +
      resultat.nonModifiables +
      "\n\n" +
      (
        resultat.nonModifiables > 0
          ? "Si l’import reste bloqué, utilisez ensuite « Réparer toutes les protections Drive » depuis le compte propriétaire."
          : "Vous pouvez maintenant relancer l’import des réservations."
      ),
    ui.ButtonSet.OK
  );

  return resultat;
}



/**
 * ============================================================
 * RÉPARER LES PROTECTIONS GOOGLE SHEETS
 * ============================================================
 *
 * Solution de secours réservée à l'administration.
 *
 * Elle supprime toutes les protections de plages et de feuilles
 * que le compte qui exécute la fonction a le droit de retirer.
 *
 * Utilité :
 * - nouveau camping / hôtel créé à partir d'une copie ;
 * - protections héritées d'un ancien propriétaire ;
 * - erreur "Vous tentez de modifier une cellule ou un objet protégés" ;
 * - blocage de l'import des réservations ou des synchronisations CampManager.
 *
 * IMPORTANT :
 * - aucune donnée n'est supprimée ;
 * - aucune formule n'est supprimée ;
 * - seules les protections Google Sheets sont retirées ;
 * - une protection appartenant à un autre propriétaire et non modifiable
 *   par le compte actuel sera signalée mais ne pourra pas être supprimée.
 */
function reparerProtectionsDriveCampManagerV4() {
  const ui =
    SpreadsheetApp.getUi();

  const classeur =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const confirmation =
    ui.alert(
      "🛠️ Réparer les protections Drive",
      "Cette opération va supprimer TOUTES les protections Google Sheets " +
        "que votre compte est autorisé à retirer dans ce classeur.\n\n" +
        "Elle ne supprime ni données, ni formules, ni réservations.\n\n" +
        "Utilisez cette fonction lorsqu'un établissement rencontre l'erreur :\n" +
        "« Vous tentez de modifier une cellule ou un objet protégés. »\n\n" +
        "Continuer ?",
      ui.ButtonSet.YES_NO
    );

  if (
    confirmation !==
      ui.Button.YES
  ) {
    return {
      succes:
        false,

      annule:
        true
    };
  }

  const resultat =
    supprimerProtectionsCampManagerV4_(
      classeur
    );

  const lignes = [
    "Protections supprimées : " +
      resultat.supprimees,
    "",
    "• Plages : " +
      resultat.plagesSupprimees,
    "• Feuilles : " +
      resultat.feuillesSupprimees
  ];

  if (
    resultat.nonModifiables >
      0
  ) {
    lignes.push(
      "",
      "⚠️ Protections impossibles à supprimer : " +
        resultat.nonModifiables,
      "Elles appartiennent à un compte qui ne donne pas au compte actuel le droit de les modifier.",
      "",
      "Dans ce cas, faites une copie du classeur avec le compte propriétaire de l'établissement, puis relancez cette réparation sur la copie."
    );
  } else {
    lignes.push(
      "",
      "✅ Le classeur ne contient plus de protection modifiable susceptible de bloquer CampManager."
    );
  }

  ui.alert(
    resultat.nonModifiables > 0
      ? "⚠️ Réparation partielle"
      : "✅ Protections réparées",
    lignes.join(
      "\n"
    ),
    ui.ButtonSet.OK
  );

  classeur.toast(
    resultat.nonModifiables > 0
      ? "Réparation partielle : certaines protections restent verrouillées."
      : "Protections Drive réparées.",
    "🛠️ CampManager",
    7
  );

  return resultat;
}


/**
 * Moteur interne de suppression des protections.
 */
function supprimerProtectionsCampManagerV4_(
  classeur
) {
  const resultat = {
    succes:
      true,

    supprimees:
      0,

    plagesSupprimees:
      0,

    feuillesSupprimees:
      0,

    nonModifiables:
      0,

    erreurs:
      []
  };

  classeur
    .getSheets()
    .forEach(
      function(
        feuille
      ) {
        const protectionsPlages =
          feuille.getProtections(
            SpreadsheetApp
              .ProtectionType
              .RANGE
          );

        protectionsPlages.forEach(
          function(
            protection
          ) {
            try {
              if (
                protection.canEdit()
              ) {
                protection.remove();

                resultat.plagesSupprimees++;
                resultat.supprimees++;

              } else {
                resultat.nonModifiables++;
              }

            } catch (
              erreur
            ) {
              resultat.nonModifiables++;

              resultat.erreurs.push(
                feuille.getName() +
                  " / plage : " +
                  (
                    erreur &&
                    erreur.message
                      ? erreur.message
                      : String(
                          erreur
                        )
                  )
              );
            }
          }
        );

        const protectionsFeuille =
          feuille.getProtections(
            SpreadsheetApp
              .ProtectionType
              .SHEET
          );

        protectionsFeuille.forEach(
          function(
            protection
          ) {
            try {
              if (
                protection.canEdit()
              ) {
                protection.remove();

                resultat.feuillesSupprimees++;
                resultat.supprimees++;

              } else {
                resultat.nonModifiables++;
              }

            } catch (
              erreur
            ) {
              resultat.nonModifiables++;

              resultat.erreurs.push(
                feuille.getName() +
                  " / feuille : " +
                  (
                    erreur &&
                    erreur.message
                      ? erreur.message
                      : String(
                          erreur
                        )
                  )
              );
            }          }
        );
      }
    );

  SpreadsheetApp.flush();

  return resultat;
}


/**
 * Installe le menu back-office sans toucher aux déclencheurs V3
 * ni au déclencheur de synchronisation V4.
 */
function installerMenuBackOfficeV4() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  /*
   * Le menu Accès V4 est désormais construit par le même gestionnaire
   * que le menu principal. On privilégie donc l'installateur principal,
   * ce qui évite deux déclencheurs « À l'ouverture » concurrents.
   */
  if (
    typeof installerMenusPartagesCampManagerV4 ===
      "function"
  ) {
    return installerMenusPartagesCampManagerV4();
  }

  /*
   * Secours si le fichier 10_Menu n'est pas encore chargé.
   */
  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        const handler =
          declencheur.getHandlerFunction();

        if (
          handler ===
            "creerMenuBackOfficeV4"
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );

  ScriptApp
    .newTrigger(
      "creerMenuBackOfficeV4"
    )
    .forSpreadsheet(
      classeur
    )
    .onOpen()
    .create();

  creerMenuBackOfficeV4();

  classeur.toast(
    "Le menu 🔐 Accès V4 est installé.",
    "✅ CampManager",
    6
  );
}
