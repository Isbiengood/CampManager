/**
 * ============================================================
 * CAMPMANAGER V4 — CORRECTIF SYNCHRONISATION RÉCEPTION
 * VERSION 2026-09-26 — MULTI-ÉTABLISSEMENT GÉNÉRIQUE — BOOTSTRAP ALIGNÉ
 * ============================================================
 *
 * PROBLÈME CORRIGÉ
 * - La synchronisation V4 automatique relançait chaque minute :
 *     Import -> Base -> Réception -> Ménage -> Supabase
 * - mettreAJourReception(false) reconstruisait alors Réception.
 * - Conséquences possibles :
 *     * retour au tri par numéro ;
 *     * "Parti" remis sur "Occupé" ;
 *     * affectations Personnel / Gouvernante perdues ;
 *     * contrôle gouvernante refusé car le logement redevient Occupé.
 *
 * NOUVEAU FONCTIONNEMENT AUTOMATIQUE
 * - V4 -> Drive : on applique d'abord les actions venant de l'application.
 * - Drive -> V4 : on prend Réception TELLE QU'ELLE EST à cet instant.
 * - On reconstruit uniquement Ménage depuis Réception.
 * - On envoie ensuite la situation vers Supabase.
 *
 * IMPORTANT
 * - Ce fichier ne remplace pas les fonctions existantes.
 * - Il installe un NOUVEAU déclencheur sûr toutes les minutes.
 * - L'installateur supprime les anciens déclencheurs V4 susceptibles
 *   de reconstruire Réception en arrière-plan.
 * - Les mises à jour Import / Base / Réception restent disponibles
 *   via les fonctions et menus habituels de CampManager.
 * ============================================================
 */

const CAMPMANAGER_V4_PATCH_RECEPTION_20260827 = Object.freeze({
  VERSION: "2026-09-26-multietablissement-generic",
  HANDLER: "synchroniserCampManagerV4BidirectionnelSecurise20260827",
  PROP_SPREADSHEET_ID: "CAMPMANAGER_V4_SPREADSHEET_ID",
  PROP_LAST_RUN: "CAMPMANAGER_V4_LAST_AUTO_RUN",
  PROP_LAST_ERROR: "CAMPMANAGER_V4_LAST_AUTO_ERROR",
  PROP_CAMPING_CODE: "CAMPMANAGER_V4_CAMPING_CODE",
  URL_APPLICATION:
    ""
});


/**
 * ============================================================
 * SYNCHRONISATION AUTOMATIQUE SÉCURISÉE
 * ============================================================
 *
 * Ordre :
 * 1. Actions application V4 -> Google Drive
 * 2. Réception actuelle -> Ménage
 * 3. Google Drive -> Supabase V4
 *
 * Cette fonction NE reconstruit JAMAIS Réception.
 */
function synchroniserCampManagerV4BidirectionnelSecurise20260827() {
  const proprietes =
    PropertiesService.getScriptProperties();

  try {
    /*
     * IMPORTANT POUR LES DÉCLENCHEURS HORAIRES :
     * une exécution automatique n'a pas toujours un classeur "actif"
     * comme lorsqu'on clique dans Google Sheets.
     *
     * On rouvre donc explicitement le CampManager enregistré lors de
     * l'installation et on le définit comme classeur actif avant de
     * lancer les fonctions historiques.
     */
    activerClasseurCampManagerV4PourDeclencheur20260827c_();

    const entree =
      traiterActionsV4VersDriveSansReconstructionReception20260827_();

    const sortie =
      synchroniserGoogleDriveVersSupabaseV4SansReconstruireReception20260827_();

    proprietes.setProperty(
      CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_LAST_RUN,
      new Date().toISOString()
    );

    proprietes.deleteProperty(
      CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_LAST_ERROR
    );

    return {
      ok: true,
      versionCorrectif:
        CAMPMANAGER_V4_PATCH_RECEPTION_20260827.VERSION,
      campingCode:
        obtenirCodeCampingCampManagerV4_(),
      v4VersDrive: entree,
      driveVersV4: sortie
    };

  } catch (erreur) {
    const message =
      erreur &&
      erreur.message
        ? erreur.message
        : String(erreur);

    proprietes.setProperty(
      CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_LAST_ERROR,
      new Date().toISOString() +
        " — " +
        message
    );

    throw erreur;
  }
}


/**
 * ============================================================
 * CONTEXTE CLASSEUR POUR DÉCLENCHEUR AUTOMATIQUE
 * VERSION 2026-08-27c
 * ============================================================
 */
function activerClasseurCampManagerV4PourDeclencheur20260827c_() {
  const proprietes =
    PropertiesService.getScriptProperties();

  let id =
    String(
      proprietes.getProperty(
        CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_SPREADSHEET_ID
      ) || ""
    ).trim();

  if (!id) {
    const actif =
      SpreadsheetApp.getActiveSpreadsheet();

    if (!actif) {
      throw new Error(
        "Identifiant du classeur CampManager absent. " +
        "Exécutez installerActualisationAutomatiqueV4_20260827c une fois."
      );
    }

    id =
      actif.getId();

    proprietes.setProperty(
      CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_SPREADSHEET_ID,
      id
    );
  }

  const classeur =
    SpreadsheetApp.openById(
      id
    );

  /*
   * Rend le classeur disponible aux anciennes fonctions qui utilisent
   * SpreadsheetApp.getActiveSpreadsheet().
   */
  SpreadsheetApp.setActiveSpreadsheet(
    classeur
  );

  return classeur;
}


/**
 * ============================================================
 * V4 -> DRIVE SANS RECONSTRUCTION GLOBALE DE RÉCEPTION
 * VERSION 2026-08-27b
 * ============================================================
 *
 * Le moteur V3 appelle normalement, après un passage sur Prêt :
 *   actualiserReceptionApresValidationMenage()
 *
 * Cette fonction historique relance mettreAJourReception(false),
 * donc reconstruit TOUTE la feuille Réception. Quand plusieurs
 * logements sont validés à quelques secondes d'intervalle, cela peut :
 * - remettre les autres logements Parti sur Occupé ;
 * - supprimer leurs affectations ;
 * - les faire disparaître de Ménage ;
 * - faire échouer les actions suivantes avec
 *   « n'est plus dans la liste Ménage ».
 *
 * Pendant le traitement des actions V4 uniquement, on neutralise donc
 * cette reconstruction globale. Le moteur stable continue à écrire
 * l'état du logement concerné dans Réception, puis on nettoie uniquement
 * les colonnes Client actuel / Départ des lignes devenues Prêt ou Libre.
 *
 * Hors V4, le comportement historique reste inchangé.
 */
function traiterActionsV4VersDriveSansReconstructionReception20260827_() {
  if (
    typeof traiterActionsV4VersDrive !==
      "function"
  ) {
    throw new Error(
      "La fonction traiterActionsV4VersDrive() est introuvable."
    );
  }

  const ancienneFonctionReception =
    typeof actualiserReceptionApresValidationMenage ===
      "function"
      ? actualiserReceptionApresValidationMenage
      : null;

  const ancienRpc =
    typeof appelerRpcServeurSupabaseV4_ ===
      "function"
      ? appelerRpcServeurSupabaseV4_
      : null;

  const campingCode =
    obtenirCodeCampingCampManagerV4_();

  try {
    /*
     * 1. La validation V4 ne doit jamais reconstruire toute Réception.
     */
    if (ancienneFonctionReception) {
      actualiserReceptionApresValidationMenage =
        function() {
          SpreadsheetApp.flush();
        };
    }

    /*
     * 2. MULTI-CAMPING :
     * le vieux processeur V4 est conservé car toute sa logique métier
     * est stable, mais ses deux appels de file d'attente sont redirigés
     * TEMPORAIREMENT vers les RPC filtrés par camping.
     *
     * Ainsi ce Google Sheet ne peut récupérer et valider que les actions
     * appartenant à son propre établissement.
     */
    if (
      typeof appelerRpcCampManagerOpenSource_ ===
        "function"
    ) {
      appelerRpcServeurSupabaseV4_ =
        function(
          nomRpc,
          parametres
        ) {
          const params =
            parametres || {};

          let rpc =
            String(
              nomRpc || ""
            );

          if (
            rpc ===
              "recuperer_actions_drive_v4"
          ) {
            rpc =
              "recuperer_actions_drive_multicamping_v4";

            return appelerRpcCampManagerOpenSource_(
              rpc,
              {
                p_limite:
                  params.p_limite || 20
              }
            );
          }

          if (
            rpc ===
              "marquer_action_drive_v4"
          ) {
            rpc =
              "marquer_action_drive_multicamping_v4";

            return appelerRpcCampManagerOpenSource_(
              rpc,
              {
                p_action_id:
                  params.p_action_id,
                p_statut:
                  params.p_statut,
                p_erreur:
                  params.p_erreur || null
              }
            );
          }

          return appelerRpcCampManagerOpenSource_(
            rpc,
            params
          );
        };
    }

    const resultat =
      traiterActionsV4VersDrive();

    SpreadsheetApp.flush();

    nettoyerClientsSortantsReceptionV4_20260827_();

    SpreadsheetApp.flush();

    if (
      resultat &&
      typeof resultat ===
        "object"
    ) {
      resultat.campingCode =
        campingCode;
    }

    return resultat;

  } finally {
    if (ancienneFonctionReception) {
      actualiserReceptionApresValidationMenage =
        ancienneFonctionReception;
    }

    if (ancienRpc) {
      appelerRpcServeurSupabaseV4_ =
        ancienRpc;
    }
  }
}


/**
 * Nettoyage ciblé après validations V4.
 *
 * Pour une ligne déjà passée sur Prêt ou Libre :
 * - Client actuel doit être vide ;
 * - Départ doit être vide ;
 * - Client suivant / Arrivée suivante sont conservés ;
 * - Personnel / Gouvernante sont conservés ;
 * - aucun autre état de Réception n'est recalculé.
 */
function nettoyerClientsSortantsReceptionV4_20260827_() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

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
    return;
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

  const zoneClientDepart =
    feuilleReception.getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.CLIENT_ACTUEL,
      nombreLignes,
      2
    );

  const clientsEtDeparts =
    zoneClientDepart.getValues();

  let modification =
    false;

  for (
    let index = 0;
    index < nombreLignes;
    index++
  ) {
    const etat =
      String(
        etats[index][0] || ""
      ).trim();

    if (
      etat === ETAT_RECEPTION.PRET ||
      etat === ETAT_RECEPTION.LIBRE
    ) {
      if (
        clientsEtDeparts[index][0] !== "" ||
        clientsEtDeparts[index][1] !== ""
      ) {
        clientsEtDeparts[index][0] = "";
        clientsEtDeparts[index][1] = "";
        modification = true;
      }
    }
  }

  if (modification) {
    zoneClientDepart.setValues(
      clientsEtDeparts
    );
  }

  if (
    typeof appliquerCouleursReception ===
      "function"
  ) {
    appliquerCouleursReception(
      feuilleReception
    );
  }
}


/**
 * ============================================================
 * DRIVE -> SUPABASE SANS TOUCHER À RÉCEPTION
 * ============================================================
 */
function synchroniserGoogleDriveVersSupabaseV4SansReconstruireReception20260827_() {
  const verrou =
    LockService.getScriptLock();

  verrou.waitLock(
    30000
  );

  try {
    /*
     * Réception devient la source opérationnelle immédiate.
     *
     * Surtout NE PAS appeler ici :
     * - synchroniserImport(false)
     * - mettreAJourReception(false)
     *
     * sinon les changements manuels de Réception peuvent être
     * écrasés au prochain passage du déclencheur.
     */
    actualiserMenageDepuisReceptionSansReconstruction20260827_();

    const payload =
      construirePayloadSupabaseV4_();

    verifierPayloadSupabaseV4_(
      payload
    );

    const resultat =
      envoyerPayloadSupabaseMultiCampingV4_20260828_(
        payload
      );

    console.log(
      "Correctif V4 2026-08-27 — synchronisation réussie : " +
      JSON.stringify(
        resultat
      )
    );

    return resultat;

  } catch (erreur) {
    console.error(
      "Correctif V4 2026-08-27 — erreur de synchronisation : " +
      (
        erreur &&
        erreur.message
          ? erreur.message
          : String(erreur)
      )
    );

    throw erreur;

  } finally {
    verrou.releaseLock();
  }
}


/**
 * ============================================================
 * MULTI-CAMPING — IDENTITÉ DE L'ÉTABLISSEMENT
 * VERSION 2026-08-28
 * ============================================================
 */
function obtenirCodeCampingCampManagerV4_() {
  const proprietes =
    PropertiesService.getScriptProperties();

  const code =
    String(
      proprietes.getProperty(
        CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_CAMPING_CODE
      ) || ""
    )
      .trim()
      .toLowerCase();

  if (!code) {
    throw new Error(
      "Aucun établissement n'est associé à ce Google Sheet. " +
      "Utilisez « Installer un nouvel établissement » dans le menu CampManager."
    );
  }

  if (
    !/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(
      code
    )
  ) {
    throw new Error(
      "Code camping invalide : " +
      code
    );
  }

  return code;
}


/**
 * Configure le camping associé à CE Google Sheet.
 * À utiliser lors de la copie de CampManager vers un nouvel établissement.
 */
function configurerCampingCampManagerV4() {
  /*
   * V2026-09-26
   * -----------
   * Cette fonction historique devient une réparation sûre :
   * elle ne demande plus un code arbitraire à l'utilisateur.
   *
   * Le jeton privé déjà stocké dans ce projet identifie
   * l'établissement côté serveur. On demande donc au pont
   * quel établissement correspond réellement à ce jeton,
   * puis on restaure uniquement la propriété locale.
   *
   * Pour créer un NOUVEL établissement, utiliser le fichier 05
   * via installerCampManagerNouvelEtablissement().
   */
  const resultat =
    appelerRpcCampManagerOpenSource_(
      "ping_campmanager_bridge_v4",
      {}
    );

  const code =
    String(
      resultat &&
      resultat.campingCode
        ? resultat.campingCode
        : ""
    )
      .trim()
      .toLowerCase();

  if (
    !code ||
    !/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(
      code
    )
  ) {
    throw new Error(
      "Le pont sécurisé n'a pas renvoyé de code établissement valide."
    );
  }

  PropertiesService
    .getScriptProperties()
    .setProperty(
      CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_CAMPING_CODE,
      code
    );

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  if (classeur) {
    classeur.toast(
      "Association réparée : " +
        String(
          resultat.campingNom ||
          code
        ) +
        " (" +
        code +
        ")",
      "✅ CampManager",
      8
    );
  }

  return resultat;
}


/**
 * ============================================================
 * ASSISTANT — CRÉER ET CONFIGURER UN NOUVEAU CAMPING
 * VERSION 08/09/2026
 * ============================================================
 *
 * À utiliser sur une COPIE neuve de CampManager.
 *
 * Cette fonction :
 * 1. demande le nom du camping ;
 * 2. demande un code technique simple ;
 * 3. crée le camping dans Supabase ;
 * 4. associe CE Google Sheet au camping ;
 * 5. installe/répare la synchronisation automatique ;
 * 6. affiche le lien V4 propre à l'établissement.
 */
function creerEtConfigurerNouveauCampingCampManagerV4() {
  /*
   * Nom historique conservé pour compatibilité.
   *
   * La création d'un nouvel établissement ne doit plus passer
   * directement par les anciens RPC multi-camping. Depuis le
   * bootstrap Open Source, le seul chemin autorisé est le fichier 05 :
   * code d'installation à usage unique -> bridgeToken propre à
   * l'établissement -> installation des déclencheurs.
   */
  if (
    typeof installerCampManagerNouvelEtablissement !==
      "function"
  ) {
    throw new Error(
      "L'installateur officiel CampManager est introuvable. " +
      "Vérifiez le fichier 05_Installation_CampManager.gs."
    );
  }

  return installerCampManagerNouvelEtablissement();
}


/**
 * Construit un code à partir du nom.
 */
function normaliserCodeNouveauCampingV4_(
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
      code.normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );
  } catch (
    erreur
  ) {}

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

  if (
    code.length >
      64
  ) {
    code =
      code.substring(
        0,
        64
      )
      .replace(
        /-+$/g,
        ""
      );
  }

  return code;
}


/**
 * Construit le lien public propre au camping associé au Sheet.
 */
function construireLienApplicationCampingCampManagerV4_() {
  const code =
    obtenirCodeCampingCampManagerV4_();

  let base =
    "";

  if (
    typeof obtenirUrlApplicationPubliqueCampManager_ ===
      "function"
  ) {
    try {
      base =
        String(
          obtenirUrlApplicationPubliqueCampManager_() ||
          ""
        ).trim();
    } catch (erreur) {}
  }

  if (!base) {
    base =
      String(
        CAMPMANAGER_V4_PATCH_RECEPTION_20260827.URL_APPLICATION ||
        ""
      ).trim();
  }

  const separateur =
    base.indexOf(
      "?"
    ) ===
      -1
      ? "?"
      : "&";

  return (
    base +
    separateur +
    "camping=" +
    encodeURIComponent(
      code
    )
  );
}


/**
 * Affiche le lien à transmettre au personnel.
 */
function afficherLienApplicationCampingCampManagerV4() {
  const ui =
    SpreadsheetApp.getUi();

  const code =
    obtenirCodeCampingCampManagerV4_();

  const camping =
    appelerRpcCampManagerOpenSource_(
      "obtenir_camping_multicamping_v4",
      {
        p_camping_code:
          code
      }
    );

  const url =
    construireLienApplicationCampingCampManagerV4_();

  ui.alert(
    "📱 CampManager V4 — Lien du camping",
    "Camping : " +
      String(
        camping.campingNom || code
      ) +
      "\n\n" +
      url +
      "\n\nCe lien contient automatiquement le code de l'établissement.",
    ui.ButtonSet.OK
  );

  return url;
}


/**
 * Vérifie quel camping est actuellement associé au classeur.
 */
function verifierCampingCampManagerV4() {
  const code =
    obtenirCodeCampingCampManagerV4_();

  const camping =
    appelerRpcCampManagerOpenSource_(
      "obtenir_camping_multicamping_v4",
      {
        p_camping_code:
          code
      }
    );

  SpreadsheetApp
    .getUi()
    .alert(
      "🏕️ CampManager — Multi-Camping",
      "Camping : " +
        String(
          camping.campingNom || "—"
        ) +
        "\nCode : " +
        String(
          camping.campingCode || code
        ) +
        "\nFuseau : " +
        String(
          camping.timezone || "—"
        ) +
        "\n\n✅ Ce Google Sheet n'échange désormais que les données de ce camping.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  return camping;
}


/**
 * Envoie le payload du Google Sheet vers le nouveau moteur Supabase
 * en transmettant explicitement le code du camping.
 */
function envoyerPayloadSupabaseMultiCampingV4_20260828_(
  payload
) {
  const campingCode =
    obtenirCodeCampingCampManagerV4_();

  /*
   * IMPORTANT — VERSION 28/08b
   * --------------------------
   * On passe par le pont Supabase sécurisé déjà utilisé par le fichier 96.
   * Aucune clé service_role n'est utilisée directement par ce correctif.
   */
  const resultat =
    appelerRpcCampManagerOpenSource_(
      "synchroniser_drive_multicamping_v4",
      {
        p_camping_code:
          campingCode,
        p_payload:
          payload
      }
    );

  if (
    !resultat ||
    resultat.ok !==
      true
  ) {
    throw new Error(
      "Réponse Supabase Multi-Camping inattendue."
    );
  }

  resultat.campingCode =
    campingCode;

  return resultat;
}


/**
 * ============================================================
 * RÉCEPTION -> MÉNAGE UNIQUEMENT
 * ============================================================
 *
 * La feuille Réception n'est jamais réécrite par cette fonction.
 */
function actualiserMenageDepuisReceptionSansReconstruction20260827_() {
  if (
    typeof mettreAJourMenage !==
      "function"
  ) {
    throw new Error(
      "La fonction stable mettreAJourMenage() est introuvable."
    );
  }

  mettreAJourMenage(
    false
  );

  SpreadsheetApp.flush();

  /*
   * On conserve la purge ciblée déjà ajoutée à la V4 :
   * un ancien ménage devenu non éligible peut être retiré,
   * sans modifier Réception.
   */
  if (
    typeof purgerMenageNonEligibleDepuisReceptionV4_ ===
      "function"
  ) {
    purgerMenageNonEligibleDepuisReceptionV4_();
  }

  SpreadsheetApp.flush();
}


/**
 * ============================================================
 * INSTALLATION DU CORRECTIF
 * ============================================================
 *
 * À exécuter UNE SEULE FOIS après avoir ajouté ce fichier.
 *
 * Résultat attendu :
 * un seul déclencheur V4 :
 * synchroniserCampManagerV4BidirectionnelSecurise20260827
 */
function installerCorrectifSynchronisationReceptionV4_20260827() {
  return installerActualisationAutomatiqueV4_20260827c();
}


/**
 * ============================================================
 * INSTALLATION / RÉPARATION ACTUALISATION AUTOMATIQUE
 * TOUTES LES MINUTES — VERSION 2026-08-27c
 * ============================================================
 *
 * À exécuter UNE SEULE FOIS après remplacement du fichier 98.
 * Cette fonction :
 * 1. mémorise précisément le classeur CampManager ;
 * 2. supprime les anciens déclencheurs V4 ;
 * 3. crée UN déclencheur sécurisé toutes les minutes ;
 * 4. remet à zéro l'ancien diagnostic d'erreur.
 */
function installerActualisationAutomatiqueV4_20260827c() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!classeur) {
    throw new Error(
      "Ouvrez le Google Sheet CampManager puis relancez l'installation."
    );
  }

  const proprietes =
    PropertiesService.getScriptProperties();

  /*
   * Protection MASTER :
   * on valide d'abord l'association à un établissement AVANT
   * d'écrire l'identifiant du classeur ou de créer un déclencheur.
   */
  obtenirCodeCampingCampManagerV4_();

  proprietes.setProperty(
    CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_SPREADSHEET_ID,
    classeur.getId()
  );

  proprietes.deleteProperty(
    CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_LAST_ERROR
  );

  supprimerAnciensDeclencheursSynchronisationV4_20260827_();

  const declencheur =
    ScriptApp
      .newTrigger(
        CAMPMANAGER_V4_PATCH_RECEPTION_20260827.HANDLER
      )
      .timeBased()
      .everyMinutes(        1
      )
      .create();

  SpreadsheetApp.flush();

  classeur.toast(
    "Actualisation automatique installée : environ toutes les minutes.",
    "✅ CampManager V4",
    10
  );

  return {
    succes: true,
    version:
      CAMPMANAGER_V4_PATCH_RECEPTION_20260827.VERSION,
    classeurId:
      classeur.getId(),
    fonction:
      CAMPMANAGER_V4_PATCH_RECEPTION_20260827.HANDLER,
    triggerId:
      declencheur.getUniqueId()
  };
}


/**
 * Supprime tous les anciens déclencheurs automatiques V4 connus
 * ainsi que le déclencheur de ce correctif avant réinstallation.
 *
 * Aucun déclencheur V3 stable n'est supprimé.
 */
function supprimerAnciensDeclencheursSynchronisationV4_20260827_() {
  const fonctionsV4 = [
    "traiterActionsV4VersDrive",
    "synchroniserGoogleDriveVersSupabaseV4",
    "synchroniserCampManagerV4Bidirectionnel",
    CAMPMANAGER_V4_PATCH_RECEPTION_20260827.HANDLER
  ];

  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        const fonction =
          declencheur.getHandlerFunction();

        if (
          fonctionsV4.indexOf(
            fonction
          ) !== -1
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );
}


/**
 * ============================================================
 * VÉRIFICATION
 * ============================================================
 *
 * Affiche les déclencheurs V4 actifs.
 */
function verifierCorrectifSynchronisationReceptionV4_20260827() {
  return verifierActualisationAutomatiqueV4_20260827c();
}


/**
 * Vérifie :
 * - qu'un seul déclencheur V4 est installé ;
 * - que le classeur cible est mémorisé ;
 * - la date de la dernière exécution automatique ;
 * - la dernière erreur éventuelle.
 */
function verifierActualisationAutomatiqueV4_20260827c() {
  const fonctionsV4 = [
    "traiterActionsV4VersDrive",
    "synchroniserGoogleDriveVersSupabaseV4",
    "synchroniserCampManagerV4Bidirectionnel",
    CAMPMANAGER_V4_PATCH_RECEPTION_20260827.HANDLER
  ];

  const declencheurs =
    ScriptApp
      .getProjectTriggers()
      .filter(
        function(declencheur) {
          return fonctionsV4.indexOf(
            declencheur.getHandlerFunction()
          ) !== -1;
        }
      );

  const noms =
    declencheurs.map(
      function(declencheur) {
        return declencheur.getHandlerFunction();
      }
    );

  const proprietes =
    PropertiesService.getScriptProperties();

  const classeurId =
    String(
      proprietes.getProperty(
        CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_SPREADSHEET_ID
      ) || ""
    ).trim();

  const derniereExecution =
    String(
      proprietes.getProperty(
        CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_LAST_RUN
      ) || ""
    ).trim();

  const derniereErreur =
    String(
      proprietes.getProperty(
        CAMPMANAGER_V4_PATCH_RECEPTION_20260827.PROP_LAST_ERROR
      ) || ""
    ).trim();

  const correct =
    noms.length === 1 &&
    noms[0] ===
      CAMPMANAGER_V4_PATCH_RECEPTION_20260827.HANDLER &&
    classeurId !== "";

  let executionAffichee =
    "Jamais enregistrée";

  if (derniereExecution) {
    try {
      executionAffichee =
        Utilities.formatDate(
          new Date(derniereExecution),
          Session.getScriptTimeZone() || "Europe/Paris",
          "dd/MM/yyyy HH:mm:ss"
        );
    } catch (e) {
      executionAffichee =
        derniereExecution;
    }
  }

  const message =
    "Version : " +
      CAMPMANAGER_V4_PATCH_RECEPTION_20260827.VERSION +
    "\n\nDéclencheur V4 : " +
      (
        noms.length
          ? noms.join(", ")
          : "AUCUN"
      ) +
    "\n\nClasseur mémorisé : " +
      (
        classeurId
          ? "OUI"
          : "NON"
      ) +
    "\n\nDernière exécution automatique : " +
      executionAffichee +
    "\n\nDernière erreur : " +
      (
        derniereErreur ||
        "Aucune"
      ) +
    "\n\n" +
      (
        correct
          ? "✅ Installation correcte."
          : "⚠️ Exécutez installerActualisationAutomatiqueV4_20260827c."
      );

  SpreadsheetApp
    .getUi()
    .alert(
      "CampManager V4 — Actualisation automatique",
      message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  return {
    correct: correct,
    declencheurs: noms,
    classeurId: classeurId,
    derniereExecution: derniereExecution,
    derniereErreur: derniereErreur
  };
}


/**
 * ============================================================
 * DIAGNOSTIC RAPIDE D'UN LOGEMENT
 * ============================================================
 *
 * Utile notamment pour vérifier le 519 après installation.
 *
 * La fonction ne modifie aucune donnée.
 */
function diagnostiquerControleLogementV4_20260827(
  numeroLogement
) {
  const logement =
    String(
      numeroLogement || ""
    ).trim();

  if (!logement) {
    throw new Error(
      "Indiquez un numéro de logement."
    );
  }

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const reception =
    classeur.getSheetByName(
      "Réception"
    );

  const menage =
    classeur.getSheetByName(
      "Ménage"
    );

  if (
    !reception ||
    !menage
  ) {
    throw new Error(
      "Réception ou Ménage introuvable."
    );
  }

  const ligneReception =
    trouverLigneReceptionParLogement(
      reception,
      logement
    );

  const ligneMenage =
    trouverLigneMenageParLogement(
      menage,
      logement
    );

  const resultat = {
    logement: logement,
    reception: null,
    menage: null
  };

  if (ligneReception) {
    resultat.reception = {
      ligne: ligneReception,
      etat:
        reception
          .getRange(
            ligneReception,
            COLONNES_RECEPTION.ETAT
          )
          .getDisplayValue(),
      personnel:
        reception
          .getRange(
            ligneReception,
            COLONNES_RECEPTION.PERSONNEL
          )
          .getDisplayValue(),
      gouvernante:
        reception
          .getRange(
            ligneReception,
            COLONNES_RECEPTION.GOUVERNANTE
          )
          .getDisplayValue()
    };
  }

  if (ligneMenage) {
    const colonneCheck =
      (
        typeof MENAGE_SECOURS_V3210 !==
          "undefined" &&
        MENAGE_SECOURS_V3210.COLONNE_CHECK
      )
        ? MENAGE_SECOURS_V3210.COLONNE_CHECK
        : 7;

    const colonneEtatControle =
      (
        typeof MENAGE_SECOURS_V3210 !==
          "undefined" &&
        MENAGE_SECOURS_V3210.COLONNE_ETAT
      )
        ? MENAGE_SECOURS_V3210.COLONNE_ETAT
        : 8;

    resultat.menage = {
      ligne: ligneMenage,
      etatMenage:
        menage
          .getRange(
            ligneMenage,
            COLONNES_MENAGE.ETAT_MENAGE
          )
          .getDisplayValue(),
      personnel:
        menage
          .getRange(
            ligneMenage,
            COLONNES_MENAGE.PERSONNEL
          )
          .getDisplayValue(),
      check:
        menage
          .getRange(
            ligneMenage,
            colonneCheck
          )
          .getDisplayValue(),
      etatControle:
        menage
          .getRange(
            ligneMenage,
            colonneEtatControle
          )
          .getDisplayValue()
    };
  }

  console.log(
    JSON.stringify(
      resultat,
      null,
      2
    )
  );

  return resultat;
}


/**
 * Diagnostic direct du logement 519.
 */
function diagnostiquerControleLogement519V4_20260827() {
  const resultat =
    diagnostiquerControleLogementV4_20260827(
      "519"
    );

  const reception =
    resultat.reception || {};

  const menage =
    resultat.menage || {};

  const message =
    "LOGEMENT 519\n\n" +
    "RÉCEPTION\n" +
    "État : " +
    (
      reception.etat || "—"
    ) +
    "\nPersonnel : " +
    (
      reception.personnel || "—"
    ) +
    "\nGouvernante : " +
    (
      reception.gouvernante || "—"
    ) +
    "\n\nMÉNAGE\n" +
    "État : " +
    (
      menage.etatMenage || "—"
    ) +
    "\nPersonnel : " +
    (
      menage.personnel || "—"
    ) +
    "\nCheck : " +
    (
      menage.check || "—"
    ) +
    "\nÉtat contrôle : " +
    (
      menage.etatControle || "—"
    );

  SpreadsheetApp
    .getUi()
    .alert(
      "Diagnostic V4 — 519",
      message,
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return resultat;
}