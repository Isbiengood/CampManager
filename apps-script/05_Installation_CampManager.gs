/**
 * ============================================================
 * CAMPMANAGER — INSTALLATION GUIDÉE MULTI-ÉTABLISSEMENT
 * VERSION 5.0.3-BOOTSTRAP — 25/09/2026
 * ============================================================
 *
 * OBJECTIF
 * --------
 * L'utilisateur d'un nouveau camping / hôtel ne modifie AUCUNE
 * ligne de code.
 *
 * Installation normale :
 *   1. ouvrir une copie neuve de CampManager ;
 *   2. menu CampManager > Établissement / installation ;
 *   3. cliquer "Installer un nouvel établissement" ;
 *   4. saisir uniquement le nom de l'établissement ;
 *   5. confirmer.
 *
 * Le programme :
 * - efface d'abord les DONNÉES D'EXPLOITATION copiées du modèle ;
 * - conserve la structure, les formats, les listes système et les formules ;
 * - crée l'établissement dans Supabase ;
 * - génère automatiquement son code technique ;
 * - associe le Google Sheet à cet établissement ;
 * - installe la synchro V4 toutes les minutes ;
 * - installe le contrôle gouvernante manuel ;
 * - installe le secours Ménage Drive (colonnes G/H) ;
 * - installe la gestion « Client en attente » ;
 * - installe la bascule quotidienne des clients ;
 * - installe le nettoyage sélectif du personnel à 17 h ;
 * - installe le menu partagé ;
 * - fournit le lien V4 unique de l'établissement.
 * ============================================================
 */

// FRESH_BOOTSTRAP_DEPLOY_MARKER
const INSTALLATION_CAMPMANAGER_V422 = Object.freeze({
  VERSION: "5.0.5-fresh-bootstrap",
  PROP_CAMPING_CODE: "CAMPMANAGER_V4_CAMPING_CODE",
  PROP_SPREADSHEET_ID: "CAMPMANAGER_V4_SPREADSHEET_ID",
  PROP_ETABLISSEMENT_NOM: "CAMPMANAGER_ETABLISSEMENT_NOM",
  PROP_INSTALL_VERSION: "CAMPMANAGER_INSTALL_VERSION",
  PROP_INSTALL_DATE: "CAMPMANAGER_INSTALL_DATE",
  PROP_PENDING_SPREADSHEET_ID:
    "CAMPMANAGER_INSTALL_PENDING_SPREADSHEET_ID",

  HANDLER_SYNC:
    "synchroniserCampManagerV4BidirectionnelSecurise20260827",

  HANDLER_CONTROLE:
    "traiterControleGouvernanteManuelV4_20260907",

  HANDLER_SECOURS_DRIVE:
    "gererEditionSecoursDriveMenageV3210",

  HANDLER_ATTENTE:
    "gererClientAttenteCampManager",

  HANDLER_BASCULE:
    "executerBasculeQuotidienneClientsReceptionV4",

  HANDLER_NETTOYAGE_17H:
    "nettoyagePersonnelAutomatique17h",

  HANDLER_MENU:
    "construireMenusCampManagerV4"
});


/**
 * INSTALLATION PRINCIPALE.
 *
 * Sur une installation déjà associée à un établissement,
 * cette fonction refuse de créer un autre établissement.
 */
function installerCampManagerNouvelEtablissement() {
  const ui =
    SpreadsheetApp.getUi();

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!classeur) {
    throw new Error(
      "Aucun Google Sheet CampManager actif."
    );
  }

  verifierDependancesInstallationCampManager_();

  const proprietes =
    PropertiesService.getScriptProperties();

  preparerContexteInstallationCopieCampManager_(
    classeur,
    proprietes
  );

  const codeExistant =
    String(
      proprietes.getProperty(
        INSTALLATION_CAMPMANAGER_V422.PROP_CAMPING_CODE
      ) || ""
    ).trim();

  if (codeExistant) {
    let nomExistant =
      String(
        proprietes.getProperty(
          INSTALLATION_CAMPMANAGER_V422.PROP_ETABLISSEMENT_NOM
        ) || ""
      ).trim();

    try {
      const info =
        appelerRpcCampManagerOpenSource_(
          "obtenir_camping_multicamping_v4",
          {}
        );

      nomExistant =
        String(
          info &&
          info.campingNom
            ? info.campingNom
            : nomExistant
        ).trim();

    } catch (erreur) {}

    ui.alert(
      "CampManager déjà configuré",
      "Ce Google Sheet est déjà associé à :\n\n" +
        (nomExistant || "Établissement") +
        "\nCode : " +
        codeExistant +
        "\n\nAucun nouvel établissement n'a été créé.\n" +
        "Utilisez « Vérifier l’installation » ou « Réparer les déclencheurs ».",
      ui.ButtonSet.OK
    );

    return {
      succes: false,
      dejaConfigure: true,
      code: codeExistant
    };
  }

  let code =
    String(
      proprietes.getProperty(
        CAMPMANAGER_BACKEND.PROP_PENDING_CODE
      ) || ""
    ).trim();

  let nom =
    String(
      proprietes.getProperty(
        CAMPMANAGER_BACKEND.PROP_PENDING_NAME
      ) || ""
    ).trim();

  let timezone =
    String(
      proprietes.getProperty(
        CAMPMANAGER_BACKEND.PROP_PENDING_TIMEZONE
      ) || ""
    ).trim();

  let jeton =
    String(
      proprietes.getProperty(
        CAMPMANAGER_BACKEND.PROP_BRIDGE_TOKEN
      ) || ""
    ).trim();

  const idClasseurEnAttente =
    String(
      proprietes.getProperty(
        INSTALLATION_CAMPMANAGER_V422.PROP_PENDING_SPREADSHEET_ID
      ) || ""
    ).trim();

  const reprise = false;

  if (!reprise) {
    const reponseNom =
      ui.prompt(
        "🚀 Installation CampManager — 1/2",
        "Nom de votre établissement :\n\n" +
          "Exemples :\n" +
          "Camping du Lac\n" +
          "Hôtel des Voyageurs",
        ui.ButtonSet.OK_CANCEL
      );

    if (
      reponseNom.getSelectedButton() !==
        ui.Button.OK
    ) {
      return {
        succes: false,
        annule: true
      };
    }

    nom =
      String(
        reponseNom.getResponseText() || ""
      ).trim();

    if (
      nom.length < 2
    ) {
      ui.alert(
        "Le nom de l’établissement est obligatoire."
      );

      return {
        succes: false
      };
    }

    code =
      genererCodeEtablissementCampManager_(
        nom
      );

    timezone =
      determinerFuseauInstallationCampManager_(
        classeur
      );

    const reponseCode =
      ui.prompt(
        "🚀 Installation CampManager — 2/2",
        "Code d’installation à usage unique :\n\n" +
          "Ce code est fourni par l’administrateur de votre instance CampManager.\n" +
          "Il n’est utilisé qu’une seule fois pour créer votre établissement.",
        ui.ButtonSet.OK_CANCEL
      );

    if (
      reponseCode.getSelectedButton() !==
        ui.Button.OK
    ) {
      return {
        succes: false,
        annule: true
      };
    }

    const codeInstallation =
      String(
        reponseCode.getResponseText() || ""
      ).trim();

    if (
      codeInstallation.length < 12
    ) {
      ui.alert(
        "Le code d’installation est invalide."
      );

      return {
        succes: false
      };
    }

    const confirmation =
      ui.alert(
        "Confirmer l’installation",
        "Établissement : " +
          nom +
          "\n\nCode automatique : " +
          code +
          "\nFuseau horaire : " +
          timezone +
          "\n\nLes données de démonstration copiées du modèle seront effacées APRÈS validation du serveur." +
          "\n\nAucun secret Supabase ne sera enregistré dans le Google Sheet." +
          "\n\nContinuer ?",
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

    const bootstrap =
      bootstrapCampManagerV4_(
        codeInstallation,
        code,
        nom,
        timezone
      );

    jeton =
      String(
        bootstrap.bridgeToken || ""
      ).trim();

    if (!jeton) {
      throw new Error(
        "Le bootstrap n’a pas fourni de jeton privé."
      );
    }

    proprietes.setProperties(
      {
        CAMPMANAGER_V4_BRIDGE_TOKEN:
          jeton,
        CAMPMANAGER_INSTALL_PENDING_CODE:
          code,
        CAMPMANAGER_INSTALL_PENDING_NAME:
          nom,
        CAMPMANAGER_INSTALL_PENDING_TIMEZONE:
          timezone,
        CAMPMANAGER_INSTALL_PENDING_SPREADSHEET_ID:
          classeur.getId()
      },
      false
    );
  }

  const ping =
    appelerRpcCampManagerOpenSource_(
      "ping_campmanager_bridge_v4",
      {}
    );

  if (
    !ping ||
    ping.ok !== true ||
    String(
      ping.campingCode || ""
    ).trim() !==
      code
  ) {
    throw new Error(
      "Le pont sécurisé n’a pas confirmé l’établissement attendu. " +
      "Aucune donnée locale n’a été effacée."
    );
  }

  const nettoyage =
    nettoyerDonneesCopieNouvelEtablissementCampManager_(
      classeur
    );

  proprietes.setProperties(
    {
      CAMPMANAGER_V4_CAMPING_CODE:
        code,
      CAMPMANAGER_V4_SPREADSHEET_ID:
        classeur.getId(),
      CAMPMANAGER_ETABLISSEMENT_NOM:
        nom,
      CAMPMANAGER_INSTALL_VERSION:
        INSTALLATION_CAMPMANAGER_V422.VERSION,
      CAMPMANAGER_INSTALL_DATE:
        new Date().toISOString()
    },
    false
  );

  proprietes.deleteProperty(
    CAMPMANAGER_BACKEND.PROP_PENDING_CODE
  );
  proprietes.deleteProperty(
    CAMPMANAGER_BACKEND.PROP_PENDING_NAME
  );
  proprietes.deleteProperty(
    CAMPMANAGER_BACKEND.PROP_PENDING_TIMEZONE
  );
  proprietes.deleteProperty(
    INSTALLATION_CAMPMANAGER_V422.PROP_PENDING_SPREADSHEET_ID
  );

  const infrastructure =
    installerInfrastructureCampManager_();

  const diagnostic =
    calculerDiagnosticInstallationCampManager_();

  afficherFinInstallationCampManager_(
    {
      nom:
        nom,
      code:
        code,
      timezone:
        timezone,
      url:
        diagnostic.url || "",
      infrastructure:
        infrastructure,
      diagnostic:
        diagnostic,
      nettoyage:
        nettoyage
    }
  );

  jeton =
    "";

  return {
    succes: true,
    nettoyage: nettoyage,
    infrastructure: infrastructure,
    diagnostic: diagnostic
  };
}


/**
 * Nettoie automatiquement les propriétés héritées lorsqu'un utilisateur
 * travaille dans une COPIE du MASTER.
 *
 * Les propriétés du projet Apps Script peuvent être recopiées avec le
 * classeur. Un ancien jeton ou un état "pending" ne doit jamais être
 * réutilisé par une nouvelle copie.
 */
function preparerContexteInstallationCopieCampManager_(
  classeur,
  proprietes
) {
  classeur =
    classeur ||
    SpreadsheetApp.getActiveSpreadsheet();

  proprietes =
    proprietes ||
    PropertiesService.getScriptProperties();

  const idActuel =
    String(
      classeur && classeur.getId
        ? classeur.getId()
        : ""
    ).trim();

  if (!idActuel) {
    throw new Error(
      "Impossible d’identifier le Google Sheet courant."
    );
  }

  const codeInstalle =
    String(
      proprietes.getProperty(
        INSTALLATION_CAMPMANAGER_V422.PROP_CAMPING_CODE
      ) || ""
    ).trim();

  const idInstalle =
    String(
      proprietes.getProperty(
        INSTALLATION_CAMPMANAGER_V422.PROP_SPREADSHEET_ID
      ) || ""
    ).trim();

  const idPending =
    String(
      proprietes.getProperty(
        INSTALLATION_CAMPMANAGER_V422.PROP_PENDING_SPREADSHEET_ID
      ) || ""
    ).trim();

  /*
   * Cas 1 : copie d'un classeur déjà configuré.
   * Le code/jeton de l'original ne doit jamais suivre la copie.
   */
  if (
    codeInstalle &&
    idInstalle &&
    idInstalle !== idActuel
  ) {
    [
      INSTALLATION_CAMPMANAGER_V422.PROP_CAMPING_CODE,
      INSTALLATION_CAMPMANAGER_V422.PROP_SPREADSHEET_ID,
      INSTALLATION_CAMPMANAGER_V422.PROP_ETABLISSEMENT_NOM,
      INSTALLATION_CAMPMANAGER_V422.PROP_INSTALL_VERSION,
      INSTALLATION_CAMPMANAGER_V422.PROP_INSTALL_DATE,
      CAMPMANAGER_BACKEND.PROP_BRIDGE_TOKEN,
      CAMPMANAGER_BACKEND.PROP_PENDING_CODE,
      CAMPMANAGER_BACKEND.PROP_PENDING_NAME,
      CAMPMANAGER_BACKEND.PROP_PENDING_TIMEZONE,
      INSTALLATION_CAMPMANAGER_V422.PROP_PENDING_SPREADSHEET_ID
    ].forEach(
      function(cle) {
        proprietes.deleteProperty(cle);
      }
    );

    return {
      copieDetectee: true,
      ancienContexteSupprime: true
    };
  }

  /*
   * Cas 2 : classeur non configuré.
   * On ne reprend un bootstrap interrompu que si le pending a été créé
   * PAR CE MÊME Google Sheet. Un pending ancien, vide ou hérité est effacé.
   */
  if (
    !codeInstalle &&
    idPending !== idActuel
  ) {
    [
      CAMPMANAGER_BACKEND.PROP_BRIDGE_TOKEN,
      CAMPMANAGER_BACKEND.PROP_PENDING_CODE,
      CAMPMANAGER_BACKEND.PROP_PENDING_NAME,
      CAMPMANAGER_BACKEND.PROP_PENDING_TIMEZONE,
      INSTALLATION_CAMPMANAGER_V422.PROP_PENDING_SPREADSHEET_ID
    ].forEach(
      function(cle) {
        proprietes.deleteProperty(cle);
      }
    );

    return {
      copieDetectee: true,
      ancienContexteSupprime: true
    };
  }

  return {
    copieDetectee: false,
    ancienContexteSupprime: false
  };
}


/**
 * Vérifie que le jeton privé de CE projet Apps Script est présent
 * et reconnu par le pont Supabase.
 *
 * Aucun établissement ni aucune donnée métier n'est modifié.
 */
function verifierPontSecuriseAvantNettoyageCampManager_() {
  const resultat =
    appelerRpcCampManagerOpenSource_(
      "ping_campmanager_bridge_v4",
      {}
    );

  if (
    !resultat ||
    resultat.ok !== true
  ) {
    throw new Error(
      "Le pont sécurisé Supabase n’a pas validé cette installation. " +
      "Aucune donnée n’a été effacée."
    );
  }

  return true;
}


function determinerFuseauInstallationCampManager_(
  classeur
) {
  let timezone =
    "";

  try {
    timezone =
      String(
        classeur.getSpreadsheetTimeZone() || ""
      ).trim();
  } catch (erreur) {}

  if (!timezone) {
    try {
      timezone =
        String(
          Session.getScriptTimeZone() || ""
        ).trim();
    } catch (erreur) {}
  }

  return (
    timezone ||
    "Europe/Paris"
  );
}


/**
 * ============================================================
 * NETTOYAGE SÉCURISÉ D'UNE COPIE DE MODÈLE
 * ============================================================
 *
 * Cette fonction n'est appelée AUTOMATIQUEMENT que pendant la
 * toute première installation, alors qu'aucun code établissement
 * n'est encore associé au Google Sheet.
 *
 * IMPORTANT :
 * - clearContent() uniquement : formats, validations et formules
 *   situées hors des zones d'exploitation sont conservés ;
 * - aucune reconstruction globale de Réception ;
 * - aucun import de réservations ;
 * - aucun appel Supabase ;
 * - aucun déclencheur n'est installé avant la fin du nettoyage.
 */
function nettoyerDonneesCopieNouvelEtablissementCampManager_(
  classeur
) {
  classeur =
    classeur ||
    SpreadsheetApp.getActiveSpreadsheet();

  const proprietes =
    PropertiesService.getScriptProperties();

  const codeExistant =
    String(
      proprietes.getProperty(
        INSTALLATION_CAMPMANAGER_V422.PROP_CAMPING_CODE
      ) || ""
    ).trim();

  /*
   * Barrière de sécurité absolue :
   * on ne nettoie JAMAIS un établissement déjà configuré.
   */
  if (codeExistant) {
    throw new Error(
      "Nettoyage refusé : ce Google Sheet est déjà associé à l’établissement « " +
        codeExistant +
        " »."
    );
  }

  const debut =
    (
      typeof LIGNES !== "undefined" &&
      LIGNES &&
      Number(LIGNES.DEBUT) > 0
    )
      ? Number(LIGNES.DEBUT)
      : 5;

  const resultat = {
    feuillesNettoyees: [],
    parametresNettoyes: false,
    proprietesDocumentSupprimees: 0,
    statistiquesActualisees: false,
    tableauDeBordActualise: false
  };

  const nbColonnesImport =
    obtenirNombreColonnesInstallationCampManager_(
      typeof COLONNES_IMPORT !== "undefined"
        ? COLONNES_IMPORT
        : null,
      6
    );

  const nbColonnesBase =
    obtenirNombreColonnesInstallationCampManager_(
      typeof COLONNES_BASE !== "undefined"
        ? COLONNES_BASE
        : null,
      9
    );

  const nbColonnesReception =
    obtenirNombreColonnesInstallationCampManager_(
      typeof COLONNES_RECEPTION !== "undefined"
        ? COLONNES_RECEPTION
        : null,
      13
    );

  const nbColonnesLogements =
    obtenirNombreColonnesInstallationCampManager_(
      typeof COLONNES_LOGEMENTS !== "undefined"
        ? COLONNES_LOGEMENTS
        : null,
      2
    );

  /*
   * Ménage possède aujourd'hui jusqu'à H :
   * A:E exploitation, F technique, G Check, H Contrôle.
   */
  const nbColonnesMenage =
    Math.max(
      obtenirNombreColonnesInstallationCampManager_(
        typeof COLONNES_MENAGE !== "undefined"
          ? COLONNES_MENAGE
          : null,
        6
      ),
      8
    );

  const zones = [
    [
      nomFeuilleInstallationCampManager_(
        "IMPORT",
        "Import"
      ),
      nbColonnesImport
    ],
    [
      nomFeuilleInstallationCampManager_(
        "BASE",
        "Base"
      ),
      nbColonnesBase
    ],
    [
      nomFeuilleInstallationCampManager_(
        "RECEPTION",
        "Réception"
      ),
      nbColonnesReception
    ],
    [
      nomFeuilleInstallationCampManager_(
        "MENAGE",
        "Ménage"
      ),
      nbColonnesMenage
    ],
    [
      nomFeuilleInstallationCampManager_(
        "LOGEMENTS",
        "Logements"
      ),
      nbColonnesLogements
    ]
  ];

  zones.forEach(
    function(zone) {
      const feuille =
        trouverFeuilleInstallationCampManager_(
          classeur,
          zone[0]
        );

      if (!feuille) {
        return;
      }

      effacerDonneesSousEntetesInstallationCampManager_(
        feuille,
        debut,
        zone[1]
      );

      resultat.feuillesNettoyees.push(
        feuille.getName()
      );
    }
  );

  /*
   * Historique ménage : A:P, soit 16 colonnes.
   * Recherche insensible à la casse pour accepter
   * "Historique Ménage" / "Historique ménage".
   */
  const feuilleHistorique =
    trouverFeuilleInstallationCampManager_(
      classeur,
      (
        typeof FEUILLE_HISTORIQUE_MENAGE !== "undefined" &&
        FEUILLE_HISTORIQUE_MENAGE
      )
        ? String(FEUILLE_HISTORIQUE_MENAGE)
        : "Historique Ménage"
    );

  if (feuilleHistorique) {
    const nbColonnesHistorique =
      Math.max(
        16,
        (
          typeof COLONNES_HISTORIQUE_MENAGE !== "undefined" &&
          COLONNES_HISTORIQUE_MENAGE &&
          Number(COLONNES_HISTORIQUE_MENAGE.NOMBRE_COLONNES) > 0
        )
          ? Number(
              COLONNES_HISTORIQUE_MENAGE.NOMBRE_COLONNES
            )
          : 16
      );

    effacerDonneesSousEntetesInstallationCampManager_(
      feuilleHistorique,
      debut,
      nbColonnesHistorique
    );

    resultat.feuillesNettoyees.push(
      feuilleHistorique.getName()
    );
  }

  nettoyerParametresEtablissementCampManager_(
    classeur,
    debut
  );

  resultat.parametresNettoyes =
    true;

  resultat.proprietesDocumentSupprimees =
    nettoyerProprietesDocumentAncienEtablissementCampManager_();

  SpreadsheetApp.flush();

  /*
   * Les indicateurs peuvent contenir des valeurs calculées de
   * l'ancien établissement. On les recalcule uniquement à partir
   * des feuilles désormais vides.
   *
   * Ces deux fonctions ne reconstruisent pas Réception.
   */
  try {
    if (
      typeof mettreAJourStatistiques ===
        "function"
    ) {
      mettreAJourStatistiques(
        false
      );

      resultat.statistiquesActualisees =
        true;
    }
  } catch (erreur) {
    console.log(
      "Statistiques non actualisées pendant l'installation : " +
        messageErreurInstallationCampManager_(
          erreur
        )
    );
  }

  try {
    if (
      typeof mettreAJourTableauDeBord ===
        "function"
    ) {
      mettreAJourTableauDeBord();

      resultat.tableauDeBordActualise =
        true;
    }
  } catch (erreur) {
    console.log(
      "Tableau de bord non actualisé pendant l'installation : " +
        messageErreurInstallationCampManager_(
          erreur
        )
    );
  }

  SpreadsheetApp.flush();

  return resultat;
}


/**
 * Nettoie uniquement les informations propres au personnel et
 * aux rapports dans la feuille Paramètres.
 *
 * Sont conservés :
 * - états Réception ;
 * - états Ménage ;
 * - priorités ;
 * - paramètres système génériques ;
 * - heure / format du rapport.
 */
function nettoyerParametresEtablissementCampManager_(
  classeur,
  debut
) {
  const nomParametres =
    nomFeuilleInstallationCampManager_(
      "PARAMETRES",
      "Paramètres"
    );

  const feuille =
    trouverFeuilleInstallationCampManager_(
      classeur,
      nomParametres
    );

  if (!feuille) {
    return;
  }

  const maxRows =
    feuille.getMaxRows();

  const nbLignes =
    Math.max(
      maxRows -
        debut +
        1,
      0
    );

  if (nbLignes > 0) {
    /*
     * Personnel : G nom / H statut / I disponible.
     */
    if (
      feuille.getMaxColumns() >=
        9
    ) {
      feuille
        .getRange(
          debut,
          7,
          nbLignes,
          3
        )
        .clearContent();
    }

    /*
     * Gouvernantes : N nom / O statut / P disponible.
     */
    if (
      feuille.getMaxColumns() >=
        16
    ) {
      feuille
        .getRange(
          debut,
          14,
          nbLignes,
          3
        )
        .clearContent();
    }
  }

  /*
   * Configuration rapport en K/L :
   * - on conserve le nom des paramètres ;
   * - on efface uniquement les adresses e-mail ;
   * - on désactive l'envoi automatique.
   */
  if (
    feuille.getMaxColumns() >=
      12 &&
    feuille.getLastRow() >=
      debut
  ) {
    const nbConfig =
      feuille.getLastRow() -
      debut +
      1;

    const config =
      feuille
        .getRange(
          debut,
          11,
          nbConfig,
          2
        )
        .getValues();

    let modifie =
      false;

    config.forEach(
      function(ligne) {
        const nom =
          String(
            ligne[0] || ""
          ).trim();

        if (
          /^email rapport/i.test(
            nom
          )
        ) {
          ligne[1] =
            "";

          modifie =
            true;

          return;
        }

        if (
          /^rapport activ[ée]/i.test(
            nom
          )
        ) {
          ligne[1] =
            "Non";

          modifie =
            true;
        }
      }
    );

    if (modifie) {
      feuille
        .getRange(
          debut,
          11,
          nbConfig,
          2
        )
        .setValues(
          config
        );
    }
  }
}


function effacerDonneesSousEntetesInstallationCampManager_(
  feuille,
  debut,
  nombreColonnes
) {
  const nbLignes =
    Math.max(
      feuille.getMaxRows() -
        debut +
        1,
      0
    );

  const nbColonnes =
    Math.min(
      Math.max(
        Number(nombreColonnes) ||
          1,
        1
      ),
      feuille.getMaxColumns()
    );

  if (
    nbLignes <= 0 ||
    nbColonnes <= 0
  ) {
    return;
  }

  feuille
    .getRange(
      debut,
      1,
      nbLignes,
      nbColonnes
    )
    .clearContent();
}


function obtenirNombreColonnesInstallationCampManager_(
  objetColonnes,
  valeurParDefaut
) {
  const nombre =
    objetColonnes &&
    Number(
      objetColonnes.NOMBRE_COLONNES
    ) > 0
      ? Number(
          objetColonnes.NOMBRE_COLONNES
        )
      : Number(
          valeurParDefaut
        );

  return Math.max(
    nombre || 1,
    1
  );
}


function nomFeuilleInstallationCampManager_(
  cle,
  valeurParDefaut
) {
  if (
    typeof FEUILLES !==
      "undefined" &&
    FEUILLES &&
    FEUILLES[cle]
  ) {
    return String(
      FEUILLES[cle]
    );
  }

  return String(
    valeurParDefaut
  );
}


function trouverFeuilleInstallationCampManager_(
  classeur,
  nomRecherche
) {
  const exact =
    classeur.getSheetByName(
      nomRecherche
    );

  if (exact) {
    return exact;
  }
  const cleRecherche =
    String(
      nomRecherche || ""
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

  const feuilles =
    classeur.getSheets();

  for (
    let index = 0;
    index < feuilles.length;
    index++
  ) {
    const cle =
      feuilles[index]
        .getName()
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

    if (
      cle ===
        cleRecherche
    ) {
      return feuilles[index];
    }
  }

  return null;
}


function nettoyerProprietesDocumentAncienEtablissementCampManager_() {
  let supprimees =
    0;

  try {
    const documentProperties =
      PropertiesService.getDocumentProperties();

    const toutes =
      documentProperties.getProperties();

    Object.keys(
      toutes || {}
    ).forEach(
      function(cle) {
        if (
          /^CM_ATTENTE_/i.test(
            cle
          )
        ) {
          documentProperties.deleteProperty(
            cle
          );

          supprimees++;
        }
      }
    );
  } catch (erreur) {
    console.log(
      "Propriétés document non nettoyées : " +
        messageErreurInstallationCampManager_(
          erreur
        )
    );
  }

  return supprimees;
}


/**
 * Réinstalle uniquement l'infrastructure technique.
 *
 * Ne recrée pas l'établissement et ne modifie aucune réservation.
 */
function reparerInstallationCampManagerEtablissement() {
  const ui =
    SpreadsheetApp.getUi();

  const proprietes =
    PropertiesService.getScriptProperties();

  const code =
    String(
      proprietes.getProperty(
        INSTALLATION_CAMPMANAGER_V422.PROP_CAMPING_CODE
      ) || ""
    ).trim();

  if (!code) {
    ui.alert(
      "Aucun établissement n’est encore configuré.\n\n" +
      "Utilisez d’abord « Installer un nouvel établissement »."
    );

    return;
  }

  const confirmation =
    ui.alert(
      "Réparer CampManager",
      "Les déclencheurs CampManager vont être contrôlés et recréés si nécessaire.\n\n" +
        "Les réservations, logements, états, personnel et affectations ne seront pas effacés.\n\nContinuer ?",
      ui.ButtonSet.YES_NO
    );

  if (
    confirmation !==
      ui.Button.YES
  ) {
    return;
  }

  verifierDependancesInstallationCampManager_();

  const resultat =
    installerInfrastructureCampManager_();

  verifierInstallationCampManagerEtablissement();

  return resultat;
}


/**
 * Installe les déclencheurs nécessaires.
 *
 * Chaque sous-installateur nettoie seulement ses propres anciens
 * déclencheurs avant de recréer le bon.
 */
function installerInfrastructureCampManager_() {
  const resultat = {
    synchronisationV4:
      false,
    controleGouvernante:
      false,
    secoursDrive:
      false,
    clientAttente:
      false,
    basculeQuotidienne:
      false,
    nettoyagePersonnel17h:
      false,
    menuPartage:
      false,
    aide:
      false,
    avertissements:
      []
  };

  try {
    if (
      typeof installerActualisationAutomatiqueV4_20260827c ===
        "function"
    ) {
      installerActualisationAutomatiqueV4_20260827c();

      resultat.synchronisationV4 =
        true;

    } else {
      resultat.avertissements.push(
        "Installateur de synchronisation V4 introuvable."
      );
    }
  } catch (erreur) {
    resultat.avertissements.push(
      "Synchronisation V4 : " +
        messageErreurInstallationCampManager_(
          erreur
        )
    );
  }

  try {
    if (
      typeof installerControleGouvernanteManuelV4_20260907 ===
        "function"
    ) {
      installerControleGouvernanteManuelV4_20260907();

      resultat.controleGouvernante =
        true;

    } else {
      resultat.avertissements.push(
        "Installateur contrôle gouvernante introuvable."
      );
    }
  } catch (erreur) {
    resultat.avertissements.push(
      "Contrôle gouvernante : " +
        messageErreurInstallationCampManager_(
          erreur
        )
    );
  }

  try {
    if (
      typeof installerSecoursDriveMenageV3210 ===
        "function"
    ) {
      installerSecoursDriveMenageV3210();

      resultat.secoursDrive =
        true;

    } else {
      resultat.avertissements.push(
        "Installateur secours Ménage Drive introuvable."
      );
    }
  } catch (erreur) {
    resultat.avertissements.push(
      "Secours Ménage Drive : " +
        messageErreurInstallationCampManager_(
          erreur
        )
    );
  }

  try {
    if (
      typeof installerDeclencheurClientAttenteCampManager ===
        "function"
    ) {
      installerDeclencheurClientAttenteCampManager();

      resultat.clientAttente =
        true;

    } else {
      resultat.avertissements.push(
        "Installateur Client en attente introuvable."
      );
    }
  } catch (erreur) {
    resultat.avertissements.push(
      "Client en attente : " +
        messageErreurInstallationCampManager_(
          erreur
        )
    );
  }

  try {
    if (
      typeof installerBasculeQuotidienneClientsReceptionV4 ===
        "function"
    ) {
      installerBasculeQuotidienneClientsReceptionV4();

      resultat.basculeQuotidienne =
        true;

    } else {
      resultat.avertissements.push(
        "Installateur de bascule quotidienne introuvable."
      );
    }
  } catch (erreur) {
    resultat.avertissements.push(
      "Bascule quotidienne : " +
        messageErreurInstallationCampManager_(
          erreur
        )
    );
  }

  try {
    if (
      typeof installerDeclencheurNettoyagePersonnel17h ===
        "function"
    ) {
      installerDeclencheurNettoyagePersonnel17h();

      resultat.nettoyagePersonnel17h =
        true;

    } else {
      resultat.avertissements.push(
        "Installateur du nettoyage personnel 17 h introuvable."
      );
    }
  } catch (erreur) {
    resultat.avertissements.push(
      "Nettoyage personnel 17 h : " +
        messageErreurInstallationCampManager_(
          erreur
        )
    );
  }

  try {
    if (
      typeof installerMenusPartagesCampManagerV4 ===
        "function"
    ) {
      installerMenusPartagesCampManagerV4();

      resultat.menuPartage =
        true;

    } else {
      resultat.avertissements.push(
        "Installateur de menu partagé introuvable."
      );
    }
  } catch (erreur) {
    resultat.avertissements.push(
      "Menu partagé : " +
        messageErreurInstallationCampManager_(
          erreur
        )
    );
  }

  try {
    if (
      typeof creerPageAideCampManager ===
        "function"
    ) {
      creerPageAideCampManager();

      resultat.aide =
        true;
    }
  } catch (erreur) {
    /*
     * La page Aide est facultative :
     * elle ne doit jamais faire échouer l'installation.
     */
    resultat.avertissements.push(
      "Page Aide : " +
        messageErreurInstallationCampManager_(
          erreur
        )
    );
  }

  return resultat;
}


/**
 * Vérifie l'installation et affiche un diagnostic lisible.
 */
function verifierInstallationCampManagerEtablissement() {
  const diagnostic =
    calculerDiagnosticInstallationCampManager_();

  const ui =
    SpreadsheetApp.getUi();

  const lignes = [
    "Établissement : " +
      (
        diagnostic.nom ||
        "—"
      ),
    "Code : " +
      (
        diagnostic.code ||
        "NON CONFIGURÉ"
      ),
    "",
    etatDiagnosticCampManager_(
      "Supabase",
      diagnostic.supabase
    ),
    etatDiagnosticCampManager_(
      "Synchronisation V4 / 1 min",
      diagnostic.syncV4 === 1
    ) +
      " (" +
      diagnostic.syncV4 +
      ")",
    etatDiagnosticCampManager_(
      "Contrôle gouvernante",
      diagnostic.controle === 1
    ) +
      " (" +
      diagnostic.controle +
      ")",
    etatDiagnosticCampManager_(
      "Secours Ménage Drive",
      diagnostic.secoursDrive === 1
    ) +
      " (" +
      diagnostic.secoursDrive +
      ")",
    etatDiagnosticCampManager_(
      "Client en attente",
      diagnostic.attente === 1
    ) +
      " (" +
      diagnostic.attente +
      ")",
    etatDiagnosticCampManager_(
      "Bascule quotidienne",
      diagnostic.bascule === 1
    ) +
      " (" +
      diagnostic.bascule +
      ")",
    etatDiagnosticCampManager_(
      "Nettoyage personnel 17 h",
      diagnostic.nettoyage17h === 1
    ) +
      " (" +
      diagnostic.nettoyage17h +
      ")",
    etatDiagnosticCampManager_(
      "Menu partagé",
      diagnostic.menu === 1
    ) +
      " (" +
      diagnostic.menu +
      ")",
    "",
    "Application : " +
      (
        diagnostic.url ||
        "indisponible"
      ),
    "",
    diagnostic.correct
      ? "✅ CAMP MANAGER EST CORRECTEMENT INSTALLÉ."
      : "⚠️ Une réparation est recommandée."
  ];

  ui.alert(
    "✅ Vérification CampManager",
    lignes.join(
      "\n"
    ),
    ui.ButtonSet.OK
  );

  return diagnostic;
}


/**
 * Affiche l'établissement actuellement lié au Google Sheet.
 */
function afficherConfigurationEtablissementCampManager() {
  const diagnostic =
    calculerDiagnosticInstallationCampManager_();

  SpreadsheetApp
    .getUi()
    .alert(
      "🏷️ Établissement CampManager",
      "Nom : " +
        (
          diagnostic.nom ||
          "—"
        ) +
        "\nCode : " +
        (
          diagnostic.code ||
          "NON CONFIGURÉ"
        ) +
        "\n\nLien application :\n" +
        (
          diagnostic.url ||
          "—"
        ),
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  return diagnostic;
}


/**
 * Diagnostic sans modifier les données.
 */
function calculerDiagnosticInstallationCampManager_() {
  const proprietes =
    PropertiesService.getScriptProperties();

  const code =
    String(
      proprietes.getProperty(
        INSTALLATION_CAMPMANAGER_V422.PROP_CAMPING_CODE
      ) || ""
    ).trim();

  let nom =
    String(
      proprietes.getProperty(
        INSTALLATION_CAMPMANAGER_V422.PROP_ETABLISSEMENT_NOM
      ) || ""
    ).trim();

  let supabase =
    false;

  if (
    code &&
    typeof appelerRpcCampManagerOpenSource_ ===
      "function"
  ) {
    try {
      const info =
        appelerRpcCampManagerOpenSource_(
          "obtenir_camping_multicamping_v4",
          {}
        );

      if (
        info &&
        info.ok === true
      ) {
        supabase =
          true;

        nom =
          String(
            info.campingNom ||
            nom
          ).trim();
      }

    } catch (erreur) {
      supabase =
        false;
    }
  }

  const compteurs =
    compterDeclencheursInstallationCampManager_();

  let url =
    "";

  if (code) {
    try {
      if (
        typeof construireUrlCampManagerV4_ ===
          "function"
      ) {
        url =
          construireUrlCampManagerV4_();

      } else if (
        typeof construireLienApplicationCampingCampManagerV4_ ===
          "function"
      ) {
        url =
          construireLienApplicationCampingCampManagerV4_();
      }
    } catch (erreur) {}
  }

  const correct =
    !!code &&
    supabase &&
    compteurs.syncV4 === 1 &&
    compteurs.controle === 1 &&
    compteurs.secoursDrive === 1 &&
    compteurs.attente === 1 &&
    compteurs.bascule === 1 &&
    compteurs.nettoyage17h === 1 &&
    compteurs.menu === 1;

  return {
    correct:
      correct,
    code:
      code,
    nom:
      nom,
    supabase:
      supabase,
    syncV4:
      compteurs.syncV4,
    controle:
      compteurs.controle,
    secoursDrive:
      compteurs.secoursDrive,
    attente:
      compteurs.attente,
    bascule:
      compteurs.bascule,
    nettoyage17h:
      compteurs.nettoyage17h,
    menu:
      compteurs.menu,
    url:
      url
  };
}


function compterDeclencheursInstallationCampManager_() {
  const resultat = {
    syncV4:
      0,
    controle:
      0,
    secoursDrive:
      0,
    attente:
      0,
    bascule:
      0,
    nettoyage17h:
      0,
    menu:
      0
  };

  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        const handler =
          declencheur.getHandlerFunction();

        if (
          handler ===
            INSTALLATION_CAMPMANAGER_V422.HANDLER_SYNC
        ) {
          resultat.syncV4++;
        }

        if (
          handler ===
            INSTALLATION_CAMPMANAGER_V422.HANDLER_CONTROLE
        ) {
          resultat.controle++;
        }

        if (
          handler ===
            INSTALLATION_CAMPMANAGER_V422.HANDLER_SECOURS_DRIVE
        ) {
          resultat.secoursDrive++;
        }

        if (
          handler ===
            INSTALLATION_CAMPMANAGER_V422.HANDLER_ATTENTE
        ) {
          resultat.attente++;
        }

        if (
          handler ===
            INSTALLATION_CAMPMANAGER_V422.HANDLER_BASCULE
        ) {
          resultat.bascule++;
        }

        if (
          handler ===
            INSTALLATION_CAMPMANAGER_V422.HANDLER_NETTOYAGE_17H
        ) {
          resultat.nettoyage17h++;
        }

        if (
          handler ===
            INSTALLATION_CAMPMANAGER_V422.HANDLER_MENU
        ) {
          resultat.menu++;
        }
      }
    );

  return resultat;
}


function verifierDependancesInstallationCampManager_() {
  const manquantes = [];

  [
    [
      "obtenirUrlPontCampManager_",
      "04_Configuration_CampManager"
    ],
    [
      "bootstrapCampManagerV4_",
      "96b_Pont_Supabase_OpenSource"
    ],
    [
      "appelerRpcCampManagerOpenSource_",
      "96b_Pont_Supabase_OpenSource"
    ],
    [
      "installerActualisationAutomatiqueV4_20260827c",
      "98_Multi_Camping_OpenSource"
    ],
    [
      "installerMenusPartagesCampManagerV4",
      "10_Menu"
    ],
    [
      "installerControleGouvernanteManuelV4_20260907",
      "94_Controle_Gouvernante"
    ],
    [
      "installerSecoursDriveMenageV3210",
      "91_Menage_Secours_Drive"
    ],
    [
      "installerDeclencheurClientAttenteCampManager",
      "95b_Client_Attente"
    ],
    [
      "installerBasculeQuotidienneClientsReceptionV4",
      "10_Menu"
    ],
    [
      "installerDeclencheurNettoyagePersonnel17h",
      "16_Nettoyage_Personnel_17h"
    ]
  ].forEach(
    function(item) {
      if (
        typeof globalThis[
          item[0]
        ] !==
          "function"
      ) {
        manquantes.push(
          item[1] +
          " / " +
          item[0]
        );
      }
    }
  );

  if (
    manquantes.length
  ) {
    throw new Error(
      "Installation impossible : modules manquants :\n- " +
      manquantes.join(
        "\n- "
      )
    );
  }
}


/**
 * Transforme automatiquement :
 *   "Hôtel du Lac & Spa"
 * en :
 *   "hotel-du-lac-spa"
 */
function genererCodeEtablissementCampManager_(
  valeur
) {
  let code =
    String(
      valeur || ""
    )
      .trim()
      .toLowerCase();

  try {
    code =
      code
        .normalize(
          "NFD"
        )
        .replace(
          /[\u0300-\u036f]/g,
          ""
        );
  } catch (erreur) {}

  code =
    code
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .replace(
        /-+/g,
        "-"
      );

  /*
   * Le code Supabase accepte 3 à 64 caractères.
   */
  if (
    code.length >
      64
  ) {
    code =
      code
        .substring(
          0,
          64
        )
        .replace(
          /-+$/g,
          ""
        );
  }

  if (
    code.length < 3
  ) {
    code =
      "etablissement-" +
      Utilities.formatDate(
        new Date(),
        "UTC",
        "yyyyMMddHHmmss"
      );
  }

  return code;
}


function afficherFinInstallationCampManager_(
  donnees
) {
  const ui =
    SpreadsheetApp.getUi();

  const diagnostic =
    donnees.diagnostic || {};

  const avertissements =
    donnees.infrastructure &&
    Array.isArray(
      donnees.infrastructure.avertissements
    )
      ? donnees.infrastructure.avertissements
      : [];

  let message =
    "✅ Installation terminée\n\n" +
    "✅ Données de l’établissement modèle nettoyées\n\n" +
    "Établissement : " +
    donnees.nom +
    "\nCode : " +
    donnees.code +
    "\n\nLien CampManager V4 :\n" +
    (
      donnees.url ||
      "—"
    ) +
    "\n\n" +
    (
      diagnostic.correct
        ? "Tous les contrôles techniques sont au vert."
        : "L’installation est créée, mais une vérification complémentaire est recommandée."
    );

  if (
    avertissements.length
  ) {
    message +=
      "\n\nAvertissements :\n- " +
      avertissements.join(
        "\n- "
      );
  }

  message +=
    "\n\nProchaine étape : renseigner les logements et le personnel, puis importer les réservations.";

  ui.alert(
    "🚀 CampManager prêt",
    message,
    ui.ButtonSet.OK
  );
}


function etatDiagnosticCampManager_(
  libelle,
  ok
) {
  return (
    ok
      ? "✅ "
      : "❌ "
  ) +
    libelle;
}


function messageErreurInstallationCampManager_(
  erreur
) {
  return String(
    erreur &&
    erreur.message
      ? erreur.message
      : erreur
  );
}