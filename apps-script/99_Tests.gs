/**
 * ============================================================
 * CAMPMANAGER
 * TESTS / DIAGNOSTICS NON DESTRUCTIFS
 * VERSION 4.3 OPEN SOURCE — 26/09/2026
 * ============================================================
 *
 * OBJECTIF
 * --------
 * Vérifier la cohérence du MASTER ou d'un établissement installé
 * SANS modifier les réservations, Réception, Ménage ni Supabase.
 *
 * Fonction principale :
 *   testerCampManagerV4()
 *
 * Tests complémentaires :
 *   testerDoubleRoleCampManagerV4()
 *   testerImportMultiformatCampManagerV4()
 *
 * IMPORTANT
 * ---------
 * - aucune installation n'est lancée ;
 * - aucun déclencheur n'est créé ou supprimé ;
 * - aucune synchronisation Supabase n'est exécutée ;
 * - aucune cellule métier n'est modifiée.
 */


/**
 * Diagnostic général non destructif.
 *
 * @return {Object}
 */
function testerCampManagerV4() {
  const resultat = {
    succes:
      true,
    mode:
      "",
    tests:
      []
  };

  function ajouterTest_(
    libelle,
    ok,
    detail
  ) {
    const ligne = {
      libelle:
        libelle,
      ok:
        !!ok,
      detail:
        String(
          detail || ""
        )
    };

    resultat.tests.push(
      ligne
    );

    if (!ligne.ok) {
      resultat.succes =
        false;
    }
  }


  /*
   * ==========================================================
   * 1. CONSTANTES
   * ==========================================================
   */
  ajouterTest_(
    "Constantes FEUILLES",
    typeof FEUILLES ===
      "object" &&
    FEUILLES &&
    FEUILLES.RECEPTION ===
      "Réception" &&
    FEUILLES.MENAGE ===
      "Ménage",
    ""
  );

  ajouterTest_(
    "Structure Réception = 13 colonnes",
    typeof COLONNES_RECEPTION ===
      "object" &&
    COLONNES_RECEPTION.NOMBRE_COLONNES ===
      13,
    ""
  );

  ajouterTest_(
    "Structure Ménage métier = 6 colonnes",
    typeof COLONNES_MENAGE ===
      "object" &&
    COLONNES_MENAGE.NOMBRE_COLONNES ===
      6,
    ""
  );

  ajouterTest_(
    "Priorité Client en attente",
    typeof PRIORITE ===
      "object" &&
    PRIORITE.ATTENTE ===
      "⚠️",
    "PRIORITE.ATTENTE = ⚠️"
  );

  ajouterTest_(
    "Statistiques lignes 18 / 19",
    typeof LIGNES_STATISTIQUES ===
      "object" &&
    LIGNES_STATISTIQUES.MENAGE_PRETS ===
      18 &&
    LIGNES_STATISTIQUES.PRIORITES_VIOLETTES ===
      19,
    ""
  );


  /*
   * ==========================================================
   * 2. MODULES PRINCIPAUX
   * ==========================================================
   */
  [
    [
      "Réception",
      "mettreAJourReception"
    ],
    [
      "Ménage",
      "mettreAJourMenage"
    ],
    [
      "Statistiques",
      "mettreAJourStatistiques"
    ],
    [
      "Tableau de bord",
      "mettreAJourTableauDeBord"
    ],
    [
      "Synchronisation Import → Base",
      "synchroniserImport"
    ],
    [
      "Import des réservations",
      "ouvrirImportESeason"
    ],
    [
      "Actualisation V4 sécurisée",
      "actualiserLogicielV4Securise20260827"
    ],
    [
      "Synchronisation V4 1 minute",
      "synchroniserCampManagerV4BidirectionnelSecurise20260827"
    ],
    [
      "Contrôle gouvernante",
      "traiterControleGouvernanteManuelV4_20260907"
    ],
    [
      "Secours Ménage Drive",
      "gererEditionSecoursDriveMenageV3210"
    ],
    [
      "Client en attente",
      "gererClientAttenteCampManager"
    ],
    [
      "Bascule quotidienne",
      "executerBasculeQuotidienneClientsReceptionV4"
    ],
    [
      "Nettoyage personnel 17 h",
      "nettoyagePersonnelAutomatique17h"
    ],
    [
      "Pont Supabase",
      "appelerRpcCampManagerOpenSource_"
    ],
    [
      "Bootstrap sécurisé",
      "bootstrapCampManagerV4_"
    ],
    [
      "Page Aide",
      "creerPageAideCampManager"
    ],
    [
      "Sauvegarde",
      "creerSauvegarde"
    ],
    [
      "onEdit principal",
      "onEdit"
    ]
  ].forEach(
    function(item) {
      ajouterTest_(
        item[0],
        typeof globalThis[
          item[1]
        ] ===
          "function",
        item[1]
      );
    }
  );


  /*
   * ==========================================================
   * 3. IMPORT MULTIFORMAT
   * ==========================================================
   */
  ajouterTest_(
    "Import TXT / CSV installé",
    typeof parserExportTexteReservations_ ===
      "function" &&
    typeof lireExportESeasonDepuisTexte_ ===
      "function" &&
    typeof decoderTexteImportReservations_ ===
      "function",
    ".xlsx / .txt / .csv"
  );


  /*
   * ==========================================================
   * 4. FEUILLES DU CLASSEUR
   * ==========================================================
   */
  const classeur =
    SpreadsheetApp
      .getActiveSpreadsheet();

  if (
    classeur
  ) {
    Object.keys(
      FEUILLES
    ).forEach(
      function(cle) {
        const nom =
          FEUILLES[
            cle
          ];

        ajouterTest_(
          "Feuille " +
            nom,
          !!classeur.getSheetByName(
            nom
          ),
          ""
        );
      }
    );

  } else {
    ajouterTest_(
      "Classeur actif",
      false,
      "Aucun Google Sheet actif."
    );
  }


  /*
   * ==========================================================
   * 5. MODE MASTER / ÉTABLISSEMENT
   * ==========================================================
   */
  const proprietes =
    PropertiesService
      .getScriptProperties();

  const codeEtablissement =
    String(
      proprietes.getProperty(
        "CAMPMANAGER_V4_CAMPING_CODE"
      ) || ""
    ).trim();

  const declencheurs =
    ScriptApp.getProjectTriggers();

  if (
    !codeEtablissement
  ) {
    resultat.mode =
      "MASTER";

    ajouterTest_(
      "MASTER sans établissement",
      true,
      "CAMPMANAGER_V4_CAMPING_CODE absent"
    );

    ajouterTest_(
      "MASTER sans déclencheur installable",
      declencheurs.length ===
        0,
      declencheurs.length +
        " déclencheur(s)"
    );

    const idClasseurMaster =
      String(
        proprietes.getProperty(
          "CAMPMANAGER_V4_SPREADSHEET_ID"
        ) || ""
      ).trim();

    ajouterTest_(
      "MASTER sans classeur établissement mémorisé",
      idClasseurMaster === "",
      idClasseurMaster
        ? "CAMPMANAGER_V4_SPREADSHEET_ID présent"
        : "CAMPMANAGER_V4_SPREADSHEET_ID absent"
    );

    const jetonMaster =
      String(
        proprietes.getProperty(
          "CAMPMANAGER_V4_BRIDGE_TOKEN"
        ) || ""
      ).trim();

    ajouterTest_(
      "MASTER sans jeton établissement",
      jetonMaster === "",
      jetonMaster
        ? "CAMPMANAGER_V4_BRIDGE_TOKEN présent"
        : "CAMPMANAGER_V4_BRIDGE_TOKEN absent"
    );

  } else {
    resultat.mode =
      "ETABLISSEMENT";

    ajouterTest_(
      "Code établissement",
      true,
      codeEtablissement
    );

    const attendus = [
      "synchroniserCampManagerV4BidirectionnelSecurise20260827",
      "traiterControleGouvernanteManuelV4_20260907",
      "gererEditionSecoursDriveMenageV3210",
      "gererClientAttenteCampManager",
      "executerBasculeQuotidienneClientsReceptionV4",
      "nettoyagePersonnelAutomatique17h",
      "construireMenusCampManagerV4"
    ];

    const compteurs =
      {};

    declencheurs.forEach(
      function(declencheur) {
        const handler =
          declencheur.getHandlerFunction();

        compteurs[
          handler
        ] =
          (
            compteurs[
              handler
            ] || 0
          ) +
          1;
      }
    );

    attendus.forEach(
      function(handler) {
        ajouterTest_(
          "Déclencheur " +
            handler,
          compteurs[
            handler
          ] ===
            1,
          String(
            compteurs[
              handler
            ] || 0
          )
        );
      }
    );
  }


  /*
   * ==========================================================
   * 6. SÉCURITÉ LOCALE
   * ==========================================================
   *
   * On vérifie uniquement les NOMS de propriétés.
   * Les valeurs privées ne sont ni affichées ni journalisées.
   */
  const toutesProprietes =
    proprietes.getProperties();

  ajouterTest_(
    "Aucune ancienne service_role Apps Script",
    !Object.prototype.hasOwnProperty.call(
      toutesProprietes,
      "SUPABASE_V4_SERVICE_ROLE_KEY"
    ),
    ""
  );

  const cleSbSecret =
    Object.keys(
      toutesProprietes
    ).some(
      function(cle) {
        return String(
          cle || ""
        )
          .toLowerCase()
          .indexOf(
            "sb_secret"
          ) !==
            -1;
      }
    );

  ajouterTest_(
    "Aucune propriété sb_secret",
    !cleSbSecret,
    ""
  );


  /*
   * ==========================================================
   * AFFICHAGE ROBUSTE V4.2
   * ==========================================================
   *
   * Le détail complet est envoyé dans le journal d'exécution.
   * La fenêtre Google Sheets reste volontairement courte afin
   * d'éviter les erreurs d'interface sur les messages volumineux.
   */
  const lignes =
    [
      "CAMPMANAGER — DIAGNOSTIC V4.2",
      "",
      "Mode : " +
        resultat.mode,
      ""
    ];

  let nombreOk =
    0;

  let nombreErreurs =
    0;

  resultat.tests.forEach(
    function(test) {
      if (test.ok) {
        nombreOk++;
      } else {
        nombreErreurs++;
      }

      lignes.push(
        (
          test.ok
            ? "✅ "
            : "❌ "
        ) +
        test.libelle +
        (
          test.detail
            ? " — " +
              test.detail
            : ""
        )
      );
    }
  );

  lignes.push(
    "",
    resultat.succes
      ? "✅ Aucun problème bloquant détecté."
      : "⚠️ Au moins un contrôle est à vérifier."
  );

  const messageComplet =
    lignes.join(
      "\n"
    );

  /*
   * Le journal contient TOUS les contrôles.
   */
  Logger.log(
    messageComplet
  );

  /*
   * La fenêtre ne contient qu'un résumé compact.
   */
  const resume =
    "Mode : " +
    resultat.mode +
    "\n\n" +
    "Contrôles OK : " +
    nombreOk +
    "\n" +
    "À vérifier : " +
    nombreErreurs +
    "\n\n" +
    (
      resultat.succes
        ? "✅ Aucun problème bloquant détecté."
        : "⚠️ Consultez le journal d’exécution pour le détail."
    );

  try {
    SpreadsheetApp
      .getUi()
      .alert(
        "CampManager — Tests V4.2",
        resume,
        SpreadsheetApp
          .getUi()
          .ButtonSet.OK
      );

  } catch (erreurUi) {
    /*
     * Un problème d'interface ne doit jamais faire échouer
     * le diagnostic lui-même.
     */
    Logger.log(
      "Affichage de la fenêtre impossible : " +
      String(
        erreurUi &&
        erreurUi.message
          ? erreurUi.message
          : erreurUi
      )
    );
  }

  return resultat;
}


/**
 * Test non destructif des doubles rôles.
 *
 * La V4 détermine les rôles à partir des listes disponibles
 * de Paramètres :
 * - colonne I : personnel disponible ;
 * - colonne P : gouvernantes disponibles.
 *
 * Une personne présente dans les deux listes est double rôle.
 *
 * @return {Object}
 */
function testerDoubleRoleCampManagerV4() {
  const classeur =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const feuille =
    classeur.getSheetByName(
      FEUILLES.PARAMETRES
    );

  if (!feuille) {
    throw new Error(
      "La feuille Paramètres est introuvable."
    );
  }

  const derniereLigne =
    Math.max(
      feuille.getLastRow(),
      LIGNES.DEBUT
    );

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const personnel =
    feuille
      .getRange(
        LIGNES.DEBUT,
        COLONNES_PARAMETRES.PERSONNEL_DISPONIBLE,
        nombreLignes,
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
          return (
            valeur !== "" &&
            valeur !== "🗑 Effacer"
          );
        }
      );

  const gouvernantes =
    feuille
      .getRange(
        LIGNES.DEBUT,
        COLONNES_PARAMETRES.GOUVERNANTES_DISPONIBLES,
        nombreLignes,
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
          return (
            valeur !== "" &&
            valeur !== "🗑 Effacer"
          );
        }
      );

  function cle_(
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

  const gouvernantesParCle =
    {};

  gouvernantes.forEach(
    function(prenom) {
      gouvernantesParCle[
        cle_(
          prenom
        )
      ] =
        prenom;
    }
  );

  const doublesRoles =
    [];

  personnel.forEach(
    function(prenom) {
      const cle =
        cle_(
          prenom
        );

      if (
        gouvernantesParCle[
          cle
        ] &&
        doublesRoles
          .map(
            cle_
          )
          .indexOf(
            cle
          ) ===
            -1
      ) {
        doublesRoles.push(
          prenom
        );
      }
    }
  );

  const historiqueDoubleRole =
    typeof creerCycleDoubleRoleHistoriqueMenage_ ===
      "function";

  const lignes = [
    "Personnel disponible : " +
      personnel.length,
    "Gouvernantes disponibles : " +
      gouvernantes.length,
    "",
    historiqueDoubleRole
      ? "✅ Historique double rôle disponible"
      : "❌ Historique double rôle manquant",
    "",
    doublesRoles.length
      ? "✅ Double rôle : " +
        doublesRoles.join(
          ", "
        )
      : "ℹ️ Aucun double rôle actif actuellement."
  ];

  SpreadsheetApp
    .getUi()
    .alert(
      "CampManager — Test double rôle V4",
      lignes.join(
        "\n"
      ),
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return {
    personnel:
      personnel.length,
    gouvernantes:
      gouvernantes.length,
    doublesRoles:
      doublesRoles,
    historiqueDoubleRole:
      historiqueDoubleRole
  };
}


/**
 * Test purement local du parseur TXT / CSV.
 *
 * Aucun fichier et aucune feuille ne sont modifiés.
 *
 * @return {Object}
 */
function testerImportMultiformatCampManagerV4() {
  if (
    typeof parserExportTexteReservations_ !==
      "function"
  ) {
    throw new Error(
      "Le parseur TXT / CSV du fichier 20_Import est introuvable."
    );
  }

  const cas = [
    {
      nom:
        "Tabulation",
      texte:
        "Nom du client\tDate de début de séjour\tDate de fin de séjour\tN° emplacement\tCatégorie empl\n" +
        "Famille Martin\t24/09/2026\t27/09/2026\t101\tMobil-home"
    },
    {
      nom:
        "Point-virgule",
      texte:
        "Nom client;Date arrivée;Date départ;N° hébergement;Catégorie\n" +
        "Mme Durand;25/09/2026;28/09/2026;A2;Lodge"
    },
    {
      nom:
        "Barre verticale",
      texte:
        "Client|Arrivée|Départ|Hébergement|Type\n" +
        "Famille Dupont|26/09/2026|29/09/2026|203|Chalet"
    },
    {
      nom:
        "Virgule",
      texte:
        "Client,Arrivée,Départ,Hébergement,Type\n" +
        "\"M. Bernard\",27/09/2026,30/09/2026,B4,\"Mobil-home\""
    }
  ];

  const resultats =
    cas.map(
      function(test) {
        try {
          const analyse =
            parserExportTexteReservations_(
              test.texte
            );

          return {
            nom:
              test.nom,
            ok:
              !!(
                analyse &&
                analyse.lignes &&
                analyse.lignes.length >=
                  2
              )
          };

        } catch (erreur) {
          return {
            nom:
              test.nom,
            ok:
              false,
            erreur:
              String(
                erreur &&
                erreur.message
                  ? erreur.message
                  : erreur
              )
          };
        }
      }
    );

  const succes =
    resultats.every(
      function(test) {
        return test.ok;
      }
    );

  const lignes =
    resultats.map(
      function(test) {
        return (
          test.ok
            ? "✅ "
            : "❌ "
        ) +
          test.nom +
          (
            test.erreur
              ? " — " +
                test.erreur
              : ""
          );
      }
    );

  SpreadsheetApp
    .getUi()
    .alert(
      "CampManager — Test import multiformat",
      lignes.join(
        "\n"
      ),
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return {
    succes:
      succes,
    resultats:
      resultats
  };
}


/**
 * Compatibilité avec l'ancien nom V3.2.7.
 * Le test actuel ne dépend plus de l'ancienne API mobile.
 */
function testerDoubleRoleV327() {
  return testerDoubleRoleCampManagerV4();
}


/**
 * Compatibilité avec l'ancien nom V3.2.9.
 * Aucun état Ménage n'est modifié.
 */
function testerMenageDriveRolesV329() {
  const fonctions = [
    "autoriserModificationEtatMenageDriveV329_",
    "traiterControleGouvernanteManuelV4_20260907",
    "creerCycleDoubleRoleHistoriqueMenage_"
  ];

  const resultats =
    fonctions.map(
      function(nom) {
        return {
          nom:
            nom,
          ok:
            typeof globalThis[
              nom
            ] ===
              "function"
        };
      }
    );

  const lignes =
    resultats.map(
      function(item) {
        return (
          item.ok
            ? "✅ "
            : "❌ "
        ) +
          item.nom;
      }
    );

  SpreadsheetApp
    .getUi()
    .alert(
      "CampManager — Test rôles Ménage",
      lignes.join(
        "\n"
      ),
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return resultats;
}