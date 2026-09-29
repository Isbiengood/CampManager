/**
 * ============================================================
 * CAMPMANAGER V4 — SYNCHRONISATION GOOGLE DRIVE <-> SUPABASE
 * VERSION MÉTIER 4.0.0-production.4
 * ADAPTATION OPEN SOURCE — 26/09/2026 — INSTALLATEURS LEGACY SÉCURISÉS
 * ============================================================
 *
 * OBJECTIF
 * - Conserver intact le moteur métier V4 stable.
 * - Lire les données réelles de Google Sheets.
 * - Synchroniser les données opérationnelles avec Supabase V4.
 * - Google Sheets reste la source de vérité pour les réservations
 *   et affectations.
 *
 * ARCHITECTURE OPEN SOURCE
 * - Ce fichier ne contient plus d'URL Supabase spécifique.
 * - Ce fichier ne contient aucune clé Supabase privilégiée.
 * - Les appels serveur passent par :
 *     96b_Pont_Supabase_OpenSource.gs
 * - L'URL du backend est fournie par :
 *     04_Configuration_CampManager.gs
 * - Le jeton privé de l'établissement est stocké uniquement dans
 *   les Propriétés du script sous CAMPMANAGER_V4_BRIDGE_TOKEN.
 * - Le bootstrap initial est géré par :
 *     05_Installation_CampManager.gs
 *
 * COMPATIBILITÉ
 * - Les noms historiques de certaines fonctions sont conservés afin
 *   de ne pas casser 94_Controle_Gouvernante, 97_Maintenance,
 *   98_Multi_Camping_OpenSource ni les anciens menus encore utilisés.
 * ============================================================
 */

const CAMPMANAGER_V4_DRIVE_SYNC_20260820 = {
  // Version métier conservée pour compatibilité avec le backend V4.
  VERSION: "4.0.0-production.4",

  // Nom historique conservé pour compatibilité.
  // L'URL du pont n'est plus définie ici : elle provient du fichier 04.
  BRIDGE_TOKEN_PROPERTY: "CAMPMANAGER_V4_BRIDGE_TOKEN",
  TRANSPORT: "96b_Pont_Supabase_OpenSource",

  FEUILLES: {
    PARAMETRES: "Paramètres",
    LOGEMENTS: "Logements",
    MENAGE: "Ménage",
    RECEPTION: "Réception"
  },

  LIGNES: {
    DEBUT: 5
  },

  COLONNES: {
    PARAMETRES: {
      PERSONNEL_DISPONIBLE: 9,       // I
      GOUVERNANTES_DISPONIBLES: 16  // P
    },

    LOGEMENTS: {
      NUMERO: 1,     // A
      CATEGORIE: 2   // B
    },

    MENAGE: {
      LOGEMENT: 1,        // A
      PERSONNEL: 2,       // B
      PRIORITE: 3,        // C
      ACCES: 4,           // D
      ETAT_MENAGE: 5,     // E
      ETAT_RECEPTION: 6   // F
    },

    RECEPTION: {
      PRIORITE: 1,           // A
      LOGEMENT: 2,           // B
      CATEGORIE: 3,          // C
      CLIENT_ACTUEL: 4,      // D
      DEPART: 5,             // E
      CLIENT_SUIVANT: 6,     // F
      ARRIVEE_SUIVANTE: 7,   // G
      ETAT: 8,               // H
      PERSONNEL: 9,          // I
      GOUVERNANTE: 10,       // J
      TELEPHONE_ATTENTE: 11, // K
      DERNIER_CONTROLE: 12,  // L
      DEPART_REEL: 13        // M
    }
  }
};


/**
 * ============================================================
 * FONCTIONS À EXÉCUTER MANUELLEMENT
 * ============================================================
 */

function testerDonneesSupabaseV4() {
  actualiserMenageAvantLectureSupabaseV4_();

  const payload =
    construirePayloadSupabaseV4_();

  const exemplesPersonnel =
    payload.personnel
      .slice(0, 8)
      .map(function(p) {
        const roles = [];

        if (p.role_femme_chambre) {
          roles.push("Ménage");
        }

        if (p.role_gouvernante) {
          roles.push("Gouvernante");
        }

        return (
          p.prenom +
          " (" +
          roles.join(" + ") +
          ")"
        );
      })
      .join("\n");

  const exemplesLogements =
    payload.logements
      .slice(0, 8)
      .map(function(l) {
        return (
          l.numero +
          (
            l.categorie
              ? " — " + l.categorie
              : ""
          )
        );
      })
      .join("\n");

  const exemplesTaches =
    payload.taches
      .slice(0, 8)
      .map(function(t) {
        return (
          t.logement +
          " | " +
          t.etat_menage +
          " | " +
          (
            t.personnel.length
              ? t.personnel.join("/")
              : "non affecté"
          ) +
          (
            t.gouvernante
              ? " | contrôle : " +
                t.gouvernante
              : ""
          )
        );
      })
      .join("\n");

  const message =
    "CAMPMANAGER V4 — TEST DES DONNÉES\n\n" +
    "Personnel : " +
    payload.personnel.length +
    "\n" +
    "Logements : " +
    payload.logements.length +
    "\n" +
    "Tâches ménage actives : " +
    payload.taches.length +
    "\n\n" +
    "PERSONNEL (exemples)\n" +
    (
      exemplesPersonnel ||
      "Aucun"
    ) +
    "\n\n" +
    "LOGEMENTS (exemples)\n" +
    (
      exemplesLogements ||
      "Aucun"
    ) +
    "\n\n" +
    "MÉNAGE (exemples)\n" +
    (
      exemplesTaches ||
      "Aucune tâche"
    );

  SpreadsheetApp
    .getUi()
    .alert(
      "V4 — Vérification",
      message,
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  console.log(
    JSON.stringify(
      payload,
      null,
      2
    )
  );

  return {
    personnel:
      payload.personnel.length,

    logements:
      payload.logements.length,

    taches:
      payload.taches.length
  };
}


function synchroniserGoogleDriveVersSupabaseV4() {
  /*
   * Depuis le correctif 98, cette fonction historique délègue au
   * chemin sécurisé lorsqu'il est disponible afin de ne jamais
   * reconstruire Réception en arrière-plan.
   */
  if (
    typeof synchroniserGoogleDriveVersSupabaseV4SansReconstruireReception20260827_ ===
      "function"
  ) {
    return synchroniserGoogleDriveVersSupabaseV4SansReconstruireReception20260827_();
  }

  const verrou =
    LockService.getScriptLock();

  verrou.waitLock(
    30000
  );

  try {
    actualiserMenageAvantLectureSupabaseV4_();

    const payload =
      construirePayloadSupabaseV4_();

    verifierPayloadSupabaseV4_(
      payload
    );

    const resultat =
      envoyerPayloadSupabaseV4_(
        payload
      );

    const message =
      "Personnel : " +
      (
        resultat.personnel ||
        payload.personnel.length
      ) +
      "\n" +
      "Logements : " +
      (
        resultat.logements ||
        payload.logements.length
      ) +
      "\n" +
      "Tâches ménage : " +
      (
        resultat.taches ||
        payload.taches.length
      ) +
      "\n" +
      "Affectations : " +
      (
        resultat.affectations || 0
      ) +
      (
        Number(
          resultat.taches_retirees || 0
        ) > 0
          ? (
              "\nTâches retirées : " +
              Number(
                resultat.taches_retirees || 0
              )
            )
          : ""
      );

    SpreadsheetApp
      .getActiveSpreadsheet()
      .toast(
        message,
        "✅ V4 synchronisée",
        7
      );

    console.log(
      "Synchronisation V4 réussie : " +
      JSON.stringify(
        resultat
      )
    );

    return resultat;

  } catch (erreur) {
    console.error(
      erreur
    );

    /*
     * Lors d'un déclencheur automatique il n'y a pas toujours
     * d'interface utilisateur disponible. On tente l'alerte,
     * mais son échec ne masque jamais l'erreur d'origine.
     */
    try {
      SpreadsheetApp
        .getUi()
        .alert(
          "❌ Synchronisation V4",
          String(
            erreur &&
            erreur.message
              ? erreur.message
              : erreur
          ),
          SpreadsheetApp
            .getUi()
            .ButtonSet.OK
        );
    } catch (erreurUi) {
      // Rien : l'erreur d'origine sera relancée ci-dessous.
    }

    throw erreur;

  } finally {
    verrou.releaseLock();
  }
}


function installerSynchronisationAutomatiqueSupabaseV4() {
  /*
   * Compatibilité historique.
   *
   * L'ancien installateur créait un déclencheur toutes les 5 minutes
   * sur synchroniserGoogleDriveVersSupabaseV4(), qui pouvait reconstruire
   * Réception. Depuis le correctif 98, toute installation automatique
   * doit passer par l'unique moteur sécurisé à 1 minute.
   */
  if (
    typeof installerActualisationAutomatiqueV4_20260827c !==
      "function"
  ) {
    throw new Error(
      "Installation V4 sécurisée introuvable. " +
      "Le module 98_Multi_Camping_OpenSource est requis."
    );
  }

  return installerActualisationAutomatiqueV4_20260827c();
}


function supprimerSynchronisationAutomatiqueSupabaseV4() {
  supprimerDeclencheursSupabaseV4_();

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      "Synchronisation automatique V4 supprimée.",
      "ℹ️ V4",
      5
    );
}


/**
 * Vérifie le jeton privé du pont sans jamais l'afficher.
 * Le nom historique de la fonction est conservé afin de ne pas
 * casser les menus ou habitudes existantes.
 */
function verifierCleSupabaseV4() {
  const jeton =
    obtenirJetonPontSupabaseV4_();

  const nomPropriete =
    (
      typeof CAMPMANAGER_BACKEND !== "undefined" &&
      CAMPMANAGER_BACKEND &&
      CAMPMANAGER_BACKEND.PROP_BRIDGE_TOKEN
    )
      ? CAMPMANAGER_BACKEND.PROP_BRIDGE_TOKEN
      : CAMPMANAGER_V4_DRIVE_SYNC_20260820.BRIDGE_TOKEN_PROPERTY;

  SpreadsheetApp
    .getUi()
    .alert(
      "✅ V4",
      "Le jeton sécurisé du pont Supabase est bien configuré.\n\n" +
      "Propriété : " +
      nomPropriete +
      "\nLongueur détectée : " +
      jeton.length +
      " caractères.\n\n" +
      "Backend : configuration open source (04 + 96b).\n" +
      "Aucune clé sb_secret_... n'est utilisée par Apps Script.",
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return true;
}


/**
 * ============================================================
 * RECONSTRUCTION IMPORT -> BASE -> RÉCEPTION -> MÉNAGE
 * ============================================================
 */
function actualiserMenageAvantLectureSupabaseV4_() {
  if (
    typeof synchroniserImport !==
      "function"
  ) {
    throw new Error(
      "La fonction stable synchroniserImport() est introuvable. " +
      "La synchronisation V4 est annulée pour ne pas utiliser une Base périmée."
    );
  }

  if (
    typeof mettreAJourReception !==
      "function"
  ) {
    throw new Error(
      "La fonction stable mettreAJourReception() est introuvable. " +
      "La synchronisation V4 est annulée pour ne pas utiliser une Réception périmée."
    );
  }

  if (
    typeof mettreAJourMenage !==
      "function"
  ) {
    throw new Error(
      "La fonction stable mettreAJourMenage() est introuvable. " +
      "La synchronisation V4 est annulée pour ne pas lire une feuille Ménage périmée."
    );
  }

  synchroniserImport(
    false
  );

  SpreadsheetApp.flush();

  mettreAJourReception(
    false
  );

  SpreadsheetApp.flush();

  mettreAJourMenage(
    false
  );

  SpreadsheetApp.flush();

  purgerMenageNonEligibleDepuisReceptionV4_();

  SpreadsheetApp.flush();
}


/**
 * ============================================================
 * PURGE CIBLÉE DES ANCIENNES LIGNES MÉNAGE
 * ============================================================
 */
function purgerMenageNonEligibleDepuisReceptionV4_() {
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

  if (
    !feuilleReception ||
    !feuilleMenage
  ) {
    return {
      supprimees:
        0
    };
  }

  const debut =
    LIGNES.DEBUT;

  const derniereLigneReception =
    feuilleReception.getLastRow();

  const receptionParLogement =
    {};

  if (
    derniereLigneReception >=
      debut
  ) {
    const donneesReception =
      feuilleReception
        .getRange(
          debut,
          1,
          derniereLigneReception -
            debut +
            1,
          COLONNES_RECEPTION.NOMBRE_COLONNES
        )
        .getValues();

    donneesReception.forEach(
      function(ligne) {
        const logement =
          normaliserValeurMenage(
            ligne[
              COLONNES_RECEPTION.LOGEMENT - 1
            ]
          );

        if (!logement) {
          return;
        }

        receptionParLogement[
          logement
        ] = {
          depart:
            ligne[
              COLONNES_RECEPTION.DEPART - 1
            ],

          etat:
            normaliserEtatReceptionMenage_(
              ligne[
                COLONNES_RECEPTION.ETAT - 1
              ]
            )
        };
      }
    );
  }

  const derniereLigneMenage =
    feuilleMenage.getLastRow();

  if (
    derniereLigneMenage <
      debut
  ) {
    return {
      supprimees:
        0
    };
  }

  const nombreLignes =
    derniereLigneMenage -
    debut +
    1;

  const zone =
    feuilleMenage.getRange(
      debut,
      1,
      nombreLignes,
      8
    );

  const valeurs =
    zone.getValues();

  const lignesConservees =
    [];

  let supprimees =
    0;

  valeurs.forEach(
    function(ligne) {
      const logement =
        normaliserValeurMenage(
          ligne[
            COLONNES_MENAGE.LOGEMENT - 1
          ]
        );

      if (!logement) {
        return;
      }

      const reception =
        receptionParLogement[
          logement
        ] || null;

      if (!reception) {
        lignesConservees.push(
          ligne
        );

        return;
      }

      const etatReception =
        reception.etat;

      if (
        etatReception ===
          ETAT_RECEPTION.OCCUPE
      ) {
        const eligible =
          !!(
            reception.depart &&
            sontMemeJourMenage(
              reception.depart,
              new Date()
            )
          );

        if (!eligible) {
          supprimees++;

          return;
        }
      }

      if (
        etatReception ===
          ETAT_RECEPTION.LIBRE ||
        etatReception ===
          ETAT_RECEPTION.PRET ||
        etatReception ===
          ETAT_RECEPTION.INDISPONIBLE
      ) {
        supprimees++;

        return;
      }

      lignesConservees.push(
        ligne
      );
    }
  );

  if (
    supprimees <=
      0
  ) {
    return {
      supprimees:
        0
    };
  }

  zone
    .clearContent()
    .clearDataValidations()
    .setBackground(
      "#ffffff"
    )
    .setFontColor(
      "#000000"
    );

  if (
    lignesConservees.length >
      0
  ) {
    feuilleMenage
      .getRange(
        debut,
        1,
        lignesConservees.length,
        8
      )
      .setValues(
        lignesConservees
      );
  }

  if (
    typeof appliquerListeEtatsMenage ===
      "function"
  ) {
    appliquerListeEtatsMenage(
      feuilleMenage,
      lignesConservees.length
    );
  }

  if (
    typeof appliquerFormatsMenage ===
      "function"
  ) {
    appliquerFormatsMenage(
      feuilleMenage,
      lignesConservees.length
    );
  }

  if (
    typeof masquerColonneEtatReceptionMenage ===
      "function"
  ) {
    masquerColonneEtatReceptionMenage(
      feuilleMenage
    );
  }

  if (
    typeof appliquerCouleursMenage ===
      "function"
  ) {
    appliquerCouleursMenage(
      feuilleMenage
    );
  }

  if (
    typeof appliquerCouleurClientAttenteMenageV323_ ===
      "function"
  ) {
    appliquerCouleurClientAttenteMenageV323_(
      feuilleMenage
    );
  }

  if (
    typeof appliquerSecoursDriveMenageV3210_ ===
      "function"
  ) {
    appliquerSecoursDriveMenageV3210_(
      feuilleMenage
    );
  }

  SpreadsheetApp.flush();

  return {
    supprimees:
      supprimees
  };
}


function testerPurgeMenageV4() {
  actualiserMenageAvantLectureSupabaseV4_();

  SpreadsheetApp
    .getUi()
    .alert(
      "V4 — Purge Ménage",
      "La chaîne Import → Base → Réception → Ménage a été recalculée.\n\n" +
      "Les logements Occupé dont le départ n'est plus aujourd'hui ont été retirés de Ménage.",
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );
}


/**
 * ============================================================
 * DIAGNOSTICS
 * ============================================================
 */
function diagnostiquerSourceMenageSupabaseV4() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleReception =
    classeur.getSheetByName(
      CAMPMANAGER_V4_DRIVE_SYNC_20260820
        .FEUILLES
        .RECEPTION
    );

  const feuilleMenage =
    classeur.getSheetByName(
      CAMPMANAGER_V4_DRIVE_SYNC_20260820
        .FEUILLES
        .MENAGE
    );

  if (
    !feuilleReception ||
    !feuilleMenage
  ) {
    throw new Error(
      "Réception ou Ménage introuvable."
    );
  }

  const debut =
    (
      typeof LIGNES !== "undefined" &&
      LIGNES &&
      LIGNES.DEBUT
    )
      ? LIGNES.DEBUT
      : CAMPMANAGER_V4_DRIVE_SYNC_20260820
          .LIGNES
          .DEBUT;

  const derniereLigneReception =
    feuilleReception.getLastRow();

  const nombreLignesReception =
    Math.max(
      derniereLigneReception -
        debut +
        1,
      0
    );

  const nombreColonnesReception =
    (
      typeof COLONNES_RECEPTION !== "undefined" &&
      COLONNES_RECEPTION &&
      COLONNES_RECEPTION.NOMBRE_COLONNES
    )
      ? COLONNES_RECEPTION.NOMBRE_COLONNES
      : 13;

  const donneesReception =
    nombreLignesReception > 0
      ? feuilleReception
          .getRange(
            debut,
            1,
            nombreLignesReception,
            nombreColonnesReception
          )
          .getValues()
      : [];

  const affichageReception =
    nombreLignesReception > 0
      ? feuilleReception
          .getRange(
            debut,
            1,
            nombreLignesReception,
            nombreColonnesReception
          )
          .getDisplayValues()
      : [];

  const colLogement =
    (
      typeof COLONNES_RECEPTION !== "undefined" &&
      COLONNES_RECEPTION.LOGEMENT
    )
      ? COLONNES_RECEPTION.LOGEMENT
      : 2;

  const colDepart =
    (
      typeof COLONNES_RECEPTION !== "undefined" &&
      COLONNES_RECEPTION.DEPART
    )
      ? COLONNES_RECEPTION.DEPART
      : 5;

  const colEtat =
    (
      typeof COLONNES_RECEPTION !== "undefined" &&
      COLONNES_RECEPTION.ETAT
    )
      ? COLONNES_RECEPTION.ETAT
      : 8;

  const aujourdHui =
    new Date();

  const compteEtats = {};
  let logementsReception = 0;
  let departsAujourdhui = 0;
  let eligiblesMenage = 0;
  const exemplesEligibles = [];

  donneesReception.forEach(
    function(
      ligne,
      index
    ) {
      const logement =
        nettoyerTexteSupabaseV4_(
          affichageReception[index][
            colLogement - 1
          ]
        );

      if (!logement) {
        return;
      }

      logementsReception++;

      const depart =
        ligne[
          colDepart - 1
        ];

      let etat =
        nettoyerTexteSupabaseV4_(
          affichageReception[index][
            colEtat - 1
          ]
        );

      if (
        typeof normaliserEtatReceptionMenage_ ===
          "function"
      ) {
        etat =
          normaliserEtatReceptionMenage_(
            etat
          );
      }

      const cleEtat =
        etat || "(vide)";

      compteEtats[
        cleEtat
      ] =
        (
          compteEtats[
            cleEtat
          ] || 0
        ) + 1;

      let departJour =
        false;

      if (
        depart instanceof Date &&
        !isNaN(
          depart.getTime()
        )
      ) {
        if (
          typeof sontMemeJourMenage ===
            "function"
        ) {
          departJour =
            sontMemeJourMenage(
              depart,
              aujourdHui
            );
        } else {
          departJour =
            Utilities.formatDate(
              depart,
              Session.getScriptTimeZone() ||
                "Europe/Paris",
              "yyyy-MM-dd"
            ) ===
            Utilities.formatDate(
              aujourdHui,
              Session.getScriptTimeZone() ||
                "Europe/Paris",
              "yyyy-MM-dd"
            );
        }
      }

      if (departJour) {        departsAujourdhui++;
      }

      let eligible =
        false;

      if (
        typeof doitApparaitreDansMenage ===
          "function"
      ) {
        eligible =
          !!doitApparaitreDansMenage(
            depart,
            etat
          );
      } else {
        eligible =
          (
            etat === "Parti" ||
            etat === "À recontrôler" ||
            (
              etat === "Occupé" &&
              departJour
            )
          );
      }

      if (eligible) {
        eligiblesMenage++;

        if (
          exemplesEligibles.length <
          12
        ) {
          exemplesEligibles.push(
            logement +
            " — " +
            etat +
            (
              departJour
                ? " — départ aujourd'hui"
                : ""
            )
          );
        }
      }
    }
  );

  let lignesRetournees = [];

  if (
    typeof mettreAJourMenage ===
      "function"
  ) {
    const resultat =
      mettreAJourMenage(
        false
      );

    if (
      Array.isArray(
        resultat
      )
    ) {
      lignesRetournees =
        resultat;
    }
  } else {
    throw new Error(
      "mettreAJourMenage() introuvable."
    );
  }

  SpreadsheetApp.flush();

  const derniereLigneMenage =
    feuilleMenage.getLastRow();

  let lignesEcritesMenage =
    0;

  if (
    derniereLigneMenage >=
    debut
  ) {
    const numeros =
      feuilleMenage
        .getRange(
          debut,
          1,
          derniereLigneMenage -
            debut +
            1,
          1
        )
        .getDisplayValues();

    lignesEcritesMenage =
      numeros.filter(
        function(ligne) {
          return nettoyerTexteSupabaseV4_(
            ligne[0]
          ) !== "";
        }
      ).length;
  }

  const lignesEtats =
    Object.keys(
      compteEtats
    )
      .sort(
        function(a, b) {
          return a.localeCompare(
            b,
            "fr",
            {
              sensitivity:
                "base"
            }
          );
        }
      )
      .map(
        function(etat) {
          return (
            "• " +
            etat +
            " : " +
            compteEtats[etat]
          );
        }
      )
      .join("\n");

  const dateTexte =
    Utilities.formatDate(
      aujourdHui,
      Session.getScriptTimeZone() ||
        "Europe/Paris",
      "dd/MM/yyyy"
    );

  const message =
    "Date : " +
    dateTexte +
    "\n\n" +
    "LOGEMENTS DANS RÉCEPTION : " +
    logementsReception +
    "\n" +
    "Départs prévus aujourd'hui : " +
    departsAujourdhui +
    "\n" +
    "Éligibles Ménage selon la règle V3 : " +
    eligiblesMenage +
    "\n" +
    "Lignes retournées par mettreAJourMenage() : " +
    lignesRetournees.length +
    "\n" +
    "Lignes réellement écrites dans Ménage : " +
    lignesEcritesMenage +
    "\n\n" +
    "ÉTATS RÉCEPTION\n" +
    (
      lignesEtats ||
      "Aucun état"
    ) +
    "\n\n" +
    "EXEMPLES ÉLIGIBLES\n" +
    (
      exemplesEligibles.length
        ? exemplesEligibles.join("\n")
        : "Aucun logement éligible aujourd'hui"
    );

  SpreadsheetApp
    .getUi()
    .alert(
      "V4 — Diagnostic source Ménage",
      message,
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  console.log(
    message
  );

  return {
    date:
      dateTexte,

    logementsReception:
      logementsReception,

    departsAujourdhui:
      departsAujourdhui,

    eligiblesMenage:
      eligiblesMenage,

    lignesRetournees:
      lignesRetournees.length,

    lignesEcritesMenage:
      lignesEcritesMenage,

    etatsReception:
      compteEtats,

    exemplesEligibles:
      exemplesEligibles
  };
}


function diagnostiquerLogementV4(
  numeroLogement
) {
  const logement =
    nettoyerTexteSupabaseV4_(
      numeroLogement
    );

  if (!logement) {
    throw new Error(
      "Indiquez un numéro de logement."
    );
  }

  actualiserMenageAvantLectureSupabaseV4_();

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const reception =
    classeur.getSheetByName(
      CAMPMANAGER_V4_DRIVE_SYNC_20260820
        .FEUILLES
        .RECEPTION
    );

  const menage =
    classeur.getSheetByName(
      CAMPMANAGER_V4_DRIVE_SYNC_20260820
        .FEUILLES
        .MENAGE
    );

  const ligneReception =
    typeof trouverLigneReceptionParLogement ===
      "function"
      ? trouverLigneReceptionParLogement(
          reception,
          logement
        )
      : null;

  const ligneMenage =
    typeof trouverLigneMenageParLogement ===
      "function"
      ? trouverLigneMenageParLogement(
          menage,
          logement
        )
      : null;

  let etatReception = "";
  let depart = "";

  if (ligneReception) {
    etatReception =
      reception
        .getRange(
          ligneReception,
          COLONNES_RECEPTION.ETAT
        )
        .getDisplayValue();

    depart =
      reception
        .getRange(
          ligneReception,
          COLONNES_RECEPTION.DEPART
        )
        .getDisplayValue();
  }

  const message =
    "Logement : " +
    logement +
    "\n" +
    "Départ Réception : " +
    (
      depart || "—"
    ) +
    "\n" +
    "État Réception : " +
    (
      etatReception || "—"
    ) +
    "\n" +
    "Présent dans Ménage : " +
    (
      ligneMenage
        ? "OUI"
        : "NON"
    );

  SpreadsheetApp
    .getUi()
    .alert(
      "V4 — Diagnostic logement",
      message,
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return {
    logement:
      logement,
    departReception:
      depart,
    etatReception:
      etatReception,
    presentDansMenage:
      !!ligneMenage
  };
}


function diagnostiquerChaineReservationV4(
  numeroLogement
) {
  const logement =
    nettoyerTexteSupabaseV4_(
      numeroLogement
    );

  if (!logement) {
    throw new Error(
      "Indiquez un numéro de logement."
    );
  }

  actualiserMenageAvantLectureSupabaseV4_();

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleImport =
    classeur.getSheetByName(
      FEUILLES.IMPORT
    );

  const feuilleBase =
    classeur.getSheetByName(
      FEUILLES.BASE
    );

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  const feuilleMenage =
    classeur.getSheetByName(
      FEUILLES.MENAGE
    );

  function dateTexte_(
    valeur
  ) {
    if (
      valeur instanceof Date &&
      !isNaN(
        valeur.getTime()
      )
    ) {
      return Utilities.formatDate(
        valeur,
        Session.getScriptTimeZone(),
        "dd/MM/yyyy"
      );
    }

    return String(
      valeur || ""
    ).trim();
  }

  const importTrouves = [];

  if (
    feuilleImport &&
    feuilleImport.getLastRow() >=
      LIGNES.DEBUT
  ) {
    const valeurs =
      feuilleImport
        .getRange(
          LIGNES.DEBUT,
          1,
          feuilleImport.getLastRow() -
            LIGNES.DEBUT +
            1,
          COLONNES_IMPORT.NOMBRE_COLONNES
        )
        .getValues();

    valeurs.forEach(
      function(ligne) {
        if (
          String(
            ligne[
              COLONNES_IMPORT.LOGEMENT - 1
            ] || ""
          ).trim() ===
            logement
        ) {
          importTrouves.push(
            String(
              ligne[
                COLONNES_IMPORT.NOM_CLIENT - 1
              ] || ""
            ).trim() +
            " : " +
            dateTexte_(
              ligne[
                COLONNES_IMPORT.DATE_ARRIVEE - 1
              ]
            ) +
            " → " +
            dateTexte_(
              ligne[
                COLONNES_IMPORT.DATE_DEPART - 1
              ]
            )
          );
        }
      }
    );
  }

  const baseTrouves = [];

  if (
    feuilleBase &&
    feuilleBase.getLastRow() >=
      LIGNES.DEBUT
  ) {
    const valeurs =
      feuilleBase
        .getRange(
          LIGNES.DEBUT,
          1,
          feuilleBase.getLastRow() -
            LIGNES.DEBUT +
            1,
          COLONNES_BASE.NOMBRE_COLONNES
        )
        .getValues();

    valeurs.forEach(
      function(ligne) {
        if (
          String(
            ligne[
              COLONNES_BASE.LOGEMENT - 1
            ] || ""
          ).trim() !==
            logement
        ) {
          return;
        }

        baseTrouves.push(
          String(
            ligne[
              COLONNES_BASE.NOM_CLIENT - 1
            ] || ""
          ).trim() +
          " : " +
          dateTexte_(
            ligne[
              COLONNES_BASE.DATE_ARRIVEE - 1
            ]
          ) +
          " → " +
          dateTexte_(
            ligne[
              COLONNES_BASE.DATE_DEPART - 1
            ]
          ) +
          " [" +
          String(
            ligne[
              COLONNES_BASE.ETAT_RESERVATION - 1
            ] || ""
          ).trim() +
          " / " +
          String(
            ligne[
              COLONNES_BASE.ORIGINE - 1
            ] || ""
          ).trim() +
          "]"
        );
      }
    );
  }

  let receptionTexte =
    "Absent";

  if (
    feuilleReception &&
    typeof trouverLigneReceptionParLogement ===
      "function"
  ) {
    const ligne =
      trouverLigneReceptionParLogement(
        feuilleReception,
        logement
      );

    if (ligne) {
      receptionTexte =
        "Client : " +
        String(
          feuilleReception
            .getRange(
              ligne,
              COLONNES_RECEPTION.CLIENT_ACTUEL
            )
            .getDisplayValue() || ""
        ).trim() +
        " | Départ : " +
        String(
          feuilleReception
            .getRange(
              ligne,
              COLONNES_RECEPTION.DEPART
            )
            .getDisplayValue() || ""
        ).trim() +
        " | État : " +
        String(
          feuilleReception
            .getRange(
              ligne,
              COLONNES_RECEPTION.ETAT
            )
            .getDisplayValue() || ""
        ).trim();
    }
  }

  let menageTexte =
    "NON";

  if (
    feuilleMenage &&
    typeof trouverLigneMenageParLogement ===
      "function"
  ) {
    const ligne =
      trouverLigneMenageParLogement(
        feuilleMenage,
        logement
      );

    if (ligne) {
      menageTexte =
        "OUI — " +
        String(
          feuilleMenage
            .getRange(
              ligne,
              COLONNES_MENAGE.ETAT_MENAGE
            )
            .getDisplayValue() || ""
        ).trim();
    }
  }

  const message =
    "LOGEMENT " +
    logement +
    "\n\n" +
    "IMPORT\n" +
    (
      importTrouves.length
        ? importTrouves.join("\n")
        : "Aucune ligne"
    ) +
    "\n\n" +
    "BASE\n" +
    (
      baseTrouves.length
        ? baseTrouves.join("\n")
        : "Aucune ligne"
    ) +
    "\n\n" +
    "RÉCEPTION\n" +
    receptionTexte +
    "\n\n" +
    "MÉNAGE\n" +
    menageTexte;

  SpreadsheetApp
    .getUi()
    .alert(
      "V4 — Diagnostic chaîne réservation",
      message,
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return {
    logement:
      logement,
    import:
      importTrouves,
    base:
      baseTrouves,
    reception:
      receptionTexte,
    menage:
      menageTexte
  };
}


function diagnostiquerChaineReservationV4_106() {
  return diagnostiquerChaineReservationV4(
    "106"
  );
}


function diagnostiquerChaineReservationV4AvecQuestion() {
  const ui =
    SpreadsheetApp.getUi();

  const reponse =
    ui.prompt(
      "V4 — Diagnostic réservation",
      "Numéro du logement à vérifier :",
      ui.ButtonSet.OK_CANCEL
    );

  if (
    reponse.getSelectedButton() !==
      ui.Button.OK
  ) {
    return;
  }

  const logement =
    String(
      reponse.getResponseText() ||
      ""
    ).trim();

  if (!logement) {
    ui.alert(
      "Aucun numéro de logement saisi."
    );
    return;
  }

  return diagnostiquerChaineReservationV4(
    logement
  );
}


/**
 * ============================================================
 * CONSTRUCTION DU PAYLOAD
 * ============================================================
 */

function construirePayloadSupabaseV4_() {
  const classeur =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const feuilleParametres =
    classeur.getSheetByName(
      CAMPMANAGER_V4_DRIVE_SYNC_20260820
        .FEUILLES
        .PARAMETRES
    );

  const feuilleLogements =
    classeur.getSheetByName(
      CAMPMANAGER_V4_DRIVE_SYNC_20260820
        .FEUILLES
        .LOGEMENTS
    );

  const feuilleMenage =
    classeur.getSheetByName(
      CAMPMANAGER_V4_DRIVE_SYNC_20260820
        .FEUILLES
        .MENAGE
    );

  const feuilleReception =
    classeur.getSheetByName(
      CAMPMANAGER_V4_DRIVE_SYNC_20260820
        .FEUILLES
        .RECEPTION
    );

  const manquantes = [];

  if (!feuilleParametres) {
    manquantes.push("Paramètres");
  }

  if (!feuilleLogements) {
    manquantes.push("Logements");
  }

  if (!feuilleMenage) {
    manquantes.push("Ménage");
  }

  if (!feuilleReception) {
    manquantes.push("Réception");
  }

  if (
    manquantes.length > 0
  ) {
    throw new Error(
      "Feuille(s) introuvable(s) : " +
      manquantes.join(", ")
    );
  }

  const personnel =
    lirePersonnelSupabaseV4_(
      feuilleParametres,
      feuilleMenage,
      feuilleReception
    );

  const logements =
    lireLogementsSupabaseV4_(
      feuilleLogements
    );

  const receptionParLogement =
    lireReceptionParLogementSupabaseV4_(
      feuilleReception
    );

  const taches =
    lireTachesMenageSupabaseV4_(
      feuilleMenage,
      receptionParLogement
    );

  return {
    version:
      CAMPMANAGER_V4_DRIVE_SYNC_20260820.VERSION,

    source:
      "Google Drive",

    spreadsheet_id:
      classeur.getId(),

    synchronise_le:
      new Date().toISOString(),

    personnel:
      personnel,

    logements:
      logements,

    taches:
      taches
  };
}


function lirePersonnelSupabaseV4_(
  feuilleParametres,
  feuilleMenage,
  feuilleReception
) {
  const personnes = {};

  function ajouter_(
    prenom,
    role
  ) {
    const nom =
      nettoyerTexteSupabaseV4_(
        prenom
      );

    if (
      !nom ||
      nom === "🗑 Effacer"
    ) {
      return;
    }

    const cle =
      creerCleSupabaseV4_(
        nom
      );

    if (!personnes[cle]) {
      personnes[cle] = {
        prenom: nom,
        nom: "",
        role_femme_chambre: false,
        role_gouvernante: false,
        disponible: true,
        actif: true
      };
    }

    if (
      role ===
      "femme"
    ) {
      personnes[
        cle
      ].role_femme_chambre =
        true;
    }

    if (
      role ===
      "gouvernante"
    ) {
      personnes[
        cle
      ].role_gouvernante =
        true;
    }
  }

  const debut =
    CAMPMANAGER_V4_DRIVE_SYNC_20260820
      .LIGNES
      .DEBUT;

  const derniereLigneParametres =
    feuilleParametres
      .getLastRow();

  if (
    derniereLigneParametres >=
    debut
  ) {
    const nombre =
      derniereLigneParametres -
      debut +
      1;

    const femmes =
      feuilleParametres
        .getRange(
          debut,
          CAMPMANAGER_V4_DRIVE_SYNC_20260820
            .COLONNES
            .PARAMETRES
            .PERSONNEL_DISPONIBLE,
          nombre,
          1
        )
        .getDisplayValues();

    femmes.forEach(
      function(ligne) {
        ajouter_(
          ligne[0],
          "femme"
        );
      }
    );

    const gouvernantes =
      feuilleParametres
        .getRange(
          debut,
          CAMPMANAGER_V4_DRIVE_SYNC_20260820
            .COLONNES
            .PARAMETRES
            .GOUVERNANTES_DISPONIBLES,
          nombre,
          1
        )
        .getDisplayValues();

    gouvernantes.forEach(
      function(ligne) {
        ajouter_(
          ligne[0],
          "gouvernante"
        );
      }
    );
  }

  lirePersonnelAffecteMenageSupabaseV4_(
    feuilleMenage
  )
    .forEach(
      function(prenom) {
        ajouter_(
          prenom,
          "femme"
        );
      }
    );

  lireGouvernantesAffecteesReceptionSupabaseV4_(
    feuilleReception
  )
    .forEach(
      function(prenom) {
        ajouter_(
          prenom,
          "gouvernante"
        );
      }
    );

  return Object
    .keys(personnes)
    .map(function(cle) {
      return personnes[cle];
    })
    .sort(function(a, b) {
      return a.prenom.localeCompare(
        b.prenom,
        "fr",
        {
          sensitivity:
            "base"
        }
      );
    });
}


function lirePersonnelAffecteMenageSupabaseV4_(
  feuilleMenage
) {
  const resultat = [];

  const debut =
    CAMPMANAGER_V4_DRIVE_SYNC_20260820
      .LIGNES
      .DEBUT;

  const derniereLigne =
    feuilleMenage
      .getLastRow();

  if (
    derniereLigne <
    debut
  ) {
    return resultat;
  }

  const valeurs =
    feuilleMenage
      .getRange(
        debut,
        CAMPMANAGER_V4_DRIVE_SYNC_20260820
          .COLONNES
          .MENAGE
          .PERSONNEL,
        derniereLigne -
          debut +
          1,
        1
      )
      .getDisplayValues();

  valeurs.forEach(
    function(ligne) {
      decomposerPersonnelSupabaseV4_(        ligne[0]
      )
        .forEach(
          function(prenom) {
            if (
              resultat.indexOf(
                prenom
              ) ===
              -1
            ) {
              resultat.push(
                prenom
              );
            }
          }
        );
    }
  );

  return resultat;
}


function lireGouvernantesAffecteesReceptionSupabaseV4_(
  feuilleReception
) {
  const resultat = [];

  const debut =
    CAMPMANAGER_V4_DRIVE_SYNC_20260820
      .LIGNES
      .DEBUT;

  const derniereLigne =
    feuilleReception
      .getLastRow();

  if (
    derniereLigne <
    debut
  ) {
    return resultat;
  }

  const valeurs =
    feuilleReception
      .getRange(
        debut,
        CAMPMANAGER_V4_DRIVE_SYNC_20260820
          .COLONNES
          .RECEPTION
          .GOUVERNANTE,
        derniereLigne -
          debut +
          1,
        1
      )
      .getDisplayValues();

  valeurs.forEach(
    function(ligne) {
      const prenom =
        nettoyerTexteSupabaseV4_(
          ligne[0]
        );

      if (
        prenom &&
        resultat.indexOf(
          prenom
        ) ===
          -1
      ) {
        resultat.push(
          prenom
        );
      }
    }
  );

  return resultat;
}


function lireLogementsSupabaseV4_(
  feuilleLogements
) {
  const resultat = [];

  const debut =
    CAMPMANAGER_V4_DRIVE_SYNC_20260820
      .LIGNES
      .DEBUT;

  const derniereLigne =
    feuilleLogements
      .getLastRow();

  if (
    derniereLigne <
    debut
  ) {
    return resultat;
  }

  const valeurs =
    feuilleLogements
      .getRange(
        debut,
        CAMPMANAGER_V4_DRIVE_SYNC_20260820
          .COLONNES
          .LOGEMENTS
          .NUMERO,
        derniereLigne -
          debut +
          1,
        2
      )
      .getDisplayValues();

  valeurs.forEach(
    function(ligne) {
      const numero =
        nettoyerTexteSupabaseV4_(
          ligne[0]
        );

      if (!numero) {
        return;
      }

      resultat.push({
        numero:
          numero,

        categorie:
          nettoyerTexteSupabaseV4_(
            ligne[1]
          ),

        actif:
          true
      });
    }
  );

  return resultat;
}


function lireReceptionParLogementSupabaseV4_(
  feuilleReception
) {
  const resultat = {};

  const debut =
    CAMPMANAGER_V4_DRIVE_SYNC_20260820
      .LIGNES
      .DEBUT;

  const derniereLigne =
    feuilleReception
      .getLastRow();

  if (
    derniereLigne <
    debut
  ) {
    return resultat;
  }

  const nombreColonnes =
    CAMPMANAGER_V4_DRIVE_SYNC_20260820
      .COLONNES
      .RECEPTION
      .DEPART_REEL;

  const valeurs =
    feuilleReception
      .getRange(
        debut,
        1,
        derniereLigne -
          debut +
          1,
        nombreColonnes
      )
      .getValues();

  const affichage =
    feuilleReception
      .getRange(
        debut,
        1,
        derniereLigne -
          debut +
          1,
        nombreColonnes
      )
      .getDisplayValues();

  valeurs.forEach(
    function(
      ligne,
      index
    ) {
      const logement =
        nettoyerTexteSupabaseV4_(
          affichage[index][
            CAMPMANAGER_V4_DRIVE_SYNC_20260820
              .COLONNES
              .RECEPTION
              .LOGEMENT -
            1
          ]
        );

      if (!logement) {
        return;
      }

      resultat[
        logement
      ] = {
        priorite:
          nettoyerTexteSupabaseV4_(
            affichage[index][
              CAMPMANAGER_V4_DRIVE_SYNC_20260820
                .COLONNES
                .RECEPTION
                .PRIORITE -
              1
            ]
          ),

        categorie:
          nettoyerTexteSupabaseV4_(
            affichage[index][
              CAMPMANAGER_V4_DRIVE_SYNC_20260820
                .COLONNES
                .RECEPTION
                .CATEGORIE -
              1
            ]
          ),

        etat:
          nettoyerTexteSupabaseV4_(
            affichage[index][
              CAMPMANAGER_V4_DRIVE_SYNC_20260820
                .COLONNES
                .RECEPTION
                .ETAT -
              1
            ]
          ),

        personnel:
          decomposerPersonnelSupabaseV4_(
            affichage[index][
              CAMPMANAGER_V4_DRIVE_SYNC_20260820
                .COLONNES
                .RECEPTION
                .PERSONNEL -
              1
            ]
          ),

        gouvernante:
          nettoyerTexteSupabaseV4_(
            affichage[index][
              CAMPMANAGER_V4_DRIVE_SYNC_20260820
                .COLONNES
                .RECEPTION
                .GOUVERNANTE -
              1
            ]
          ),

        telephone_attente:
          nettoyerTexteSupabaseV4_(
            affichage[index][
              CAMPMANAGER_V4_DRIVE_SYNC_20260820
                .COLONNES
                .RECEPTION
                .TELEPHONE_ATTENTE -
              1
            ]
          ),

        depart:
          dateVersIsoSupabaseV4_(
            ligne[
              CAMPMANAGER_V4_DRIVE_SYNC_20260820
                .COLONNES
                .RECEPTION
                .DEPART -
              1
            ]
          ),

        arrivee_suivante:
          dateVersIsoSupabaseV4_(
            ligne[
              CAMPMANAGER_V4_DRIVE_SYNC_20260820
                .COLONNES
                .RECEPTION
                .ARRIVEE_SUIVANTE -
              1
            ]
          )
      };
    }
  );

  return resultat;
}


function lireTachesMenageSupabaseV4_(
  feuilleMenage,
  receptionParLogement
) {
  const resultat = [];

  const debut =
    CAMPMANAGER_V4_DRIVE_SYNC_20260820
      .LIGNES
      .DEBUT;

  const derniereLigne =
    feuilleMenage
      .getLastRow();

  if (
    derniereLigne <
    debut
  ) {
    return resultat;
  }

  /*
   * La V4 a besoin des données opérationnelles A:F.
   * Les colonnes G/H de secours gouvernante restent gérées
   * par la logique V3.2.10 lors des validations.
   */
  const valeurs =
    feuilleMenage
      .getRange(
        debut,
        1,
        derniereLigne -
          debut +
          1,
        6
      )
      .getDisplayValues();

  valeurs.forEach(
    function(ligne) {
      const logement =
        nettoyerTexteSupabaseV4_(
          ligne[
            CAMPMANAGER_V4_DRIVE_SYNC_20260820
              .COLONNES
              .MENAGE
              .LOGEMENT -
            1
          ]
        );

      if (!logement) {
        return;
      }

      const reception =
        receptionParLogement[
          logement
        ] || {};

      const personnelMenage =
        decomposerPersonnelSupabaseV4_(
          ligne[
            CAMPMANAGER_V4_DRIVE_SYNC_20260820
              .COLONNES
              .MENAGE
              .PERSONNEL -
            1
          ]
        );

      const personnelFinal =
        personnelMenage.length
          ? personnelMenage
          : (
              reception.personnel ||
              []
            );

      const etatMenage =
        nettoyerTexteSupabaseV4_(
          ligne[
            CAMPMANAGER_V4_DRIVE_SYNC_20260820
              .COLONNES
              .MENAGE
              .ETAT_MENAGE -
            1
          ]
        ) ||
        "À faire";

      resultat.push({
        logement:
          logement,

        personnel:
          personnelFinal,

        priorite:
          nettoyerTexteSupabaseV4_(
            ligne[
              CAMPMANAGER_V4_DRIVE_SYNC_20260820
                .COLONNES
                .MENAGE
                .PRIORITE -
              1
            ]
          ) ||
          reception.priorite ||
          "",

        acces:
          nettoyerTexteSupabaseV4_(
            ligne[
              CAMPMANAGER_V4_DRIVE_SYNC_20260820
                .COLONNES
                .MENAGE
                .ACCES -
              1
            ]
          ),

        etat_menage:
          etatMenage,

        etat_reception:
          nettoyerTexteSupabaseV4_(
            ligne[
              CAMPMANAGER_V4_DRIVE_SYNC_20260820
                .COLONNES
                .MENAGE
                .ETAT_RECEPTION -
              1
            ]
          ) ||
          reception.etat ||
          "",

        gouvernante:
          reception.gouvernante ||
          "",

        telephone_attente:
          reception.telephone_attente ||
          "",

        depart:
          reception.depart ||
          "",

        arrivee_suivante:
          reception.arrivee_suivante ||
          ""
      });
    }
  );

  return resultat;
}


/**
 * ============================================================
 * COMPATIBILITÉ PONT SUPABASE -> CLIENT OPEN SOURCE
 * ============================================================
 *
 * Le transport HTTP n'est plus géré dans ce fichier.
 * Il est centralisé dans 96b_Pont_Supabase_OpenSource.gs.
 *
 * Les deux fonctions historiques ci-dessous sont conservées car
 * plusieurs fonctions métier et correctifs V4 les appellent encore.
 * Elles délèguent désormais au client open source.
 */
function obtenirJetonPontSupabaseV4_() {
  const nomPropriete =
    (
      typeof CAMPMANAGER_BACKEND !== "undefined" &&
      CAMPMANAGER_BACKEND &&
      CAMPMANAGER_BACKEND.PROP_BRIDGE_TOKEN
    )
      ? String(
          CAMPMANAGER_BACKEND.PROP_BRIDGE_TOKEN
        ).trim()
      : CAMPMANAGER_V4_DRIVE_SYNC_20260820.BRIDGE_TOKEN_PROPERTY;

  const jeton =
    String(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          nomPropriete
        ) || ""
    ).trim();

  if (!jeton) {
    throw new Error(
      "Le jeton privé CampManager est absent. " +
      "Utilisez « Installer un nouvel établissement » dans le menu CampManager."
    );
  }

  return jeton;
}


function appelerPontSupabaseV4_(
  nomRpc,
  parametres
) {
  if (
    typeof appelerRpcCampManagerOpenSource_ !==
      "function"
  ) {
    throw new Error(
      "Le client du pont Supabase open source est introuvable. " +
      "Vérifiez le fichier 96b_Pont_Supabase_OpenSource.gs."
    );
  }

  return appelerRpcCampManagerOpenSource_(
    nomRpc,
    parametres || {}
  );
}


/**
 * ============================================================
 * ENVOI DRIVE -> SUPABASE
 * ============================================================
 */
function envoyerPayloadSupabaseV4_(
  payload
) {
  const resultat =
    appelerPontSupabaseV4_(
      "synchroniser_drive_v4",
      {
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
      "Réponse Supabase inattendue :\n" +
      JSON.stringify(
        resultat || {}
      )
    );
  }

  return resultat;
}


/**
 * ============================================================
 * CONTRÔLES
 * ============================================================
 */
function verifierPayloadSupabaseV4_(
  payload
) {
  if (
    !payload ||
    !Array.isArray(
      payload.personnel
    ) ||
    !Array.isArray(
      payload.logements
    ) ||
    !Array.isArray(
      payload.taches
    )
  ) {
    throw new Error(
      "Payload V4 invalide."
    );
  }

  if (
    payload.logements.length ===
    0
  ) {
    throw new Error(
      "Aucun logement n'a été trouvé dans la feuille Logements."
    );
  }

  const vraisLogements =
    payload.logements.filter(
      function(logement) {
        return (
          String(
            logement.numero ||
            ""
          ).indexOf(
            "TEST-"
          ) !==
          0
        );
      }
    );

  if (
    vraisLogements.length ===
    0
  ) {
    throw new Error(
      "Aucun logement réel détecté. Synchronisation annulée."
    );
  }

  const logementsConnus = {};

  payload.logements.forEach(
    function(logement) {
      logementsConnus[
        nettoyerTexteSupabaseV4_(
          logement.numero
        )
      ] =
        true;
    }
  );

  const inconnus =
    payload.taches
      .filter(
        function(tache) {
          return !logementsConnus[
            nettoyerTexteSupabaseV4_(
              tache.logement
            )
          ];
        }
      )
      .map(
        function(tache) {
          return tache.logement;
        }
      );

  if (
    inconnus.length > 0
  ) {
    throw new Error(
      "Des logements présents dans Ménage sont absents de la feuille Logements :\n" +
      inconnus
        .slice(0, 15)
        .join(", ")
    );
  }
}


/**
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */
function decomposerPersonnelSupabaseV4_(
  valeur
) {
  const texte =
    nettoyerTexteSupabaseV4_(
      valeur
    );

  if (!texte) {
    return [];
  }

  const resultat = [];

  texte
    .split("/")
    .map(function(item) {
      return nettoyerTexteSupabaseV4_(
        item
      );
    })
    .filter(function(item) {
      return !!item;
    })
    .forEach(function(item) {
      if (
        resultat.indexOf(
          item
        ) ===
          -1
      ) {
        resultat.push(
          item
        );
      }
    });

  return resultat;
}


function nettoyerTexteSupabaseV4_(
  valeur
) {
  return String(
    valeur === null ||
    typeof valeur ===
      "undefined"
      ? ""
      : valeur
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function creerCleSupabaseV4_(
  valeur
) {
  return nettoyerTexteSupabaseV4_(
    valeur
  )
    .toLocaleLowerCase(
      "fr"
    );
}


function dateVersIsoSupabaseV4_(
  valeur
) {
  if (!valeur) {
    return "";
  }

  let date =
    valeur;

  if (
    !(
      date instanceof
      Date
    )
  ) {
    date =
      new Date(
        valeur
      );
  }

  if (
    isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return Utilities
    .formatDate(
      date,
      Session
        .getScriptTimeZone() ||
        "Europe/Paris",
      "yyyy-MM-dd"
    );
}


function supprimerDeclencheursSupabaseV4_() {
  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(
        declencheur
      ) {
        if (
          declencheur
            .getHandlerFunction() ===
          "synchroniserGoogleDriveVersSupabaseV4"
        ) {
          ScriptApp
            .deleteTrigger(
              declencheur
            );
        }
      }
    );
}


/**
 * Appel RPC serveur commun via l'Edge Function sécurisée.
 */
function appelerRpcServeurSupabaseV4_(
  nomRpc,
  parametres
) {
  /*
   * Nom historique conservé pour le moteur V4 et pour le fichier 98.
   * Tous les appels passent désormais par le client open source 96b.
   */
  return appelerPontSupabaseV4_(
    nomRpc,
    parametres || {}
  );
}


/**
 * ============================================================
 * PONT SUPABASE -> GOOGLE DRIVE
 * ============================================================
 */
const CAMPMANAGER_V4_BRIDGE_20260820 = Object.freeze({
  VERSION:
    "4.0.0-production.4",

  LIMITE_ACTIONS:
    20,

  MAX_TENTATIVES:
    3,

  SOURCE_SIMULATION:
    "V4 PREPROD SIMULATION",

  SOURCE_DRIVE:
    "Google Drive",

  STATUT_APPLIQUE:
    "applique",
  STATUT_SIMULE:
    "simule",

  STATUT_ERREUR:
    "erreur",

  STATUT_EN_ATTENTE:
    "en_attente"
});


function testerPontV4VersDrive() {
  const resultat =
    traiterActionsV4VersDrive();

  const lignes = [
    "CAMPMANAGER V4 — TEST DU PONT",
    "",
    "Actions reçues : " +
      resultat.recues,
    "Appliquées au Drive : " +
      resultat.appliquees,
    "Simulations ignorées proprement : " +
      resultat.simulees,
    "Erreurs : " +
      resultat.erreurs
  ];

  if (
    resultat.details &&
    resultat.details.length
  ) {
    lignes.push(
      "",
      "DÉTAILS"
    );

    resultat.details
      .slice(0, 15)
      .forEach(
        function(detail) {
          lignes.push(
            "• " + detail
          );
        }
      );
  }

  SpreadsheetApp
    .getUi()
    .alert(
      "V4 — Pont vers Google Drive",
      lignes.join("\n"),
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return resultat;
}


function traiterActionsV4VersDrive() {
  const verrou =
    LockService.getScriptLock();

  if (
    !verrou.tryLock(
      5000
    )
  ) {
    return {
      ok:
        false,

      recues:
        0,

      appliquees:
        0,

      simulees:
        0,

      erreurs:
        0,

      details: [
        "Un autre traitement V4 est déjà en cours."
      ]
    };
  }

  try {
    const actions =
      appelerRpcServeurSupabaseV4_(
        "recuperer_actions_drive_v4",
        {
          p_limite:
            CAMPMANAGER_V4_BRIDGE_20260820
              .LIMITE_ACTIONS
        }
      );

    const liste =
      Array.isArray(
        actions
      )
        ? actions
        : [];

    const bilan = {
      ok:
        true,

      recues:
        liste.length,

      appliquees:
        0,

      simulees:
        0,

      erreurs:
        0,

      details:
        []
    };

    liste.forEach(
      function(action) {
        traiterUneActionV4VersDrive_(
          action,
          bilan
        );
      }
    );

    return bilan;

  } finally {
    verrou.releaseLock();
  }
}



/**
 * Compatibilité V4 -> moteur Ménage Drive actuel.
 *
 * Le pont Supabase appelle cette fonction pour rejouer dans Google Sheets
 * une action déjà validée côté mobile. Elle reprend les règles métier
 * actuelles sans réintroduire l'ancien module mobile V3 complet.
 *
 * Transitions :
 * - À faire -> À vérifier pour une femme de chambre ;
 * - À faire -> Prêt pour une personne en double rôle ;
 * - À vérifier / À recontrôler -> Prêt pour une gouvernante.
 */
function avancerEtatMenageMobile(
  demande
) {
  const verrou =
    LockService.getDocumentLock();

  verrou.waitLock(
    10000
  );

  try {
    if (
      !demande ||
      !demande.logement ||
      !demande.prenom ||
      !demande.etatActuel
    ) {
      throw new Error(
        "La demande est incomplète."
      );
    }

    const logement =
      normaliserValeurMenage(
        demande.logement
      );

    const prenom =
      String(
        demande.prenom || ""
      ).trim();

    const clePrenom =
      normaliserCleRoleMenageDriveV3210_(
        prenom
      );

    const etatAttendu =
      normaliserValeurMenage(
        demande.etatActuel
      );

    const classeur =
      SpreadsheetApp.getActiveSpreadsheet();

    const feuilleMenage =
      classeur.getSheetByName(
        FEUILLES.MENAGE
      );

    const feuilleReception =
      classeur.getSheetByName(
        FEUILLES.RECEPTION
      );

    if (
      !feuilleMenage ||
      !feuilleReception
    ) {
      throw new Error(
        "Les feuilles Ménage ou Réception sont introuvables."
      );
    }

    /*
     * Repart toujours de l'état Drive le plus récent.
     */
    mettreAJourMenage(
      false
    );

    const ligneMenage =
      trouverLigneMenageParLogement(
        feuilleMenage,
        logement
      );

    if (!ligneMenage) {
      return {
        succes: false,
        conflit: true,
        message:
          "Le logement " +
          logement +
          " n'est plus dans la liste Ménage."
      };
    }

    const ligneReception =
      trouverLigneReceptionParLogement(
        feuilleReception,
        logement
      );

    if (!ligneReception) {
      return {
        succes: false,
        conflit: true,
        message:
          "Le logement " +
          logement +
          " est introuvable dans Réception."
      };
    }

    const personnelActuel =
      normaliserPersonnelMenage_(
        feuilleMenage
          .getRange(
            ligneMenage,
            COLONNES_MENAGE.PERSONNEL
          )
          .getDisplayValue()
      );

    const gouvernanteActuelle =
      String(
        feuilleReception
          .getRange(
            ligneReception,
            COLONNES_RECEPTION.GOUVERNANTE
          )
          .getDisplayValue() || ""
      ).trim();

    const celluleEtat =
      feuilleMenage.getRange(
        ligneMenage,
        COLONNES_MENAGE.ETAT_MENAGE
      );

    const etatActuel =
      normaliserValeurMenage(
        celluleEtat.getValue()
      );

    if (
      etatActuel !==
        etatAttendu
    ) {
      return {
        succes: false,
        conflit: true,
        message:
          "L'état du logement " +
          logement +
          " a déjà changé. Actualisez la liste."
      };
    }

    const carteRoles =
      creerCarteRolesMenageDriveV3210_();

    const role =
      carteRoles[
        clePrenom
      ] || {
        femmeDeChambre: false,
        gouvernante: false
      };

    const estAffecteAuMenage =
      decomposerPersonnelMenageDriveV3210_(
        personnelActuel
      ).some(
        function(nom) {
          return (
            normaliserCleRoleMenageDriveV3210_(
              nom
            ) ===
              clePrenom
          );
        }
      );

    const estAffecteAuControle =
      decomposerPersonnelMenageDriveV3210_(
        gouvernanteActuelle
      ).some(
        function(nom) {
          return (
            normaliserCleRoleMenageDriveV3210_(
              nom
            ) ===
              clePrenom
          );
        }
      );

    let nouvelEtat =
      "";

    if (
      etatActuel ===
        ETAT_MENAGE.A_FAIRE &&
      estAffecteAuMenage &&
      role.femmeDeChambre
    ) {
      nouvelEtat =
        role.gouvernante
          ? ETAT_MENAGE.PRET
          : ETAT_MENAGE.A_VERIFIER;
    }

    if (
      (
        etatActuel ===
          ETAT_MENAGE.A_VERIFIER ||
        etatActuel ===
          ETAT_MENAGE.A_RECONTROLER
      ) &&
      estAffecteAuControle &&
      role.gouvernante
    ) {
      nouvelEtat =
        ETAT_MENAGE.PRET;
    }

    if (!nouvelEtat) {
      return {
        succes: false,
        conflit: true,
        message:
          "Cette action n'est plus attribuée à " +
          prenom +
          ". Actualisez la liste."
      };
    }

    celluleEtat.setValue(
      nouvelEtat
    );

    SpreadsheetApp.flush();

    const evenement = {
      range:
        celluleEtat,
      value:
        nouvelEtat,
      oldValue:
        etatActuel
    };

    if (
      bloquerEtatMenageSiOccupe(
        evenement
      )
    ) {
      return {
        succes: false,
        conflit: true,
        message:
          "Le client est encore présent. La réception doit d'abord passer le logement sur Parti."
      };
    }

    synchroniserEtatMenageVersReception(
      evenement
    );

    if (
      nouvelEtat ===
        ETAT_MENAGE.PRET &&
      typeof terminerAttenteClientPourLogementV323_ ===
        "function"
    ) {
      terminerAttenteClientPourLogementV323_(
        logement
      );
    }

    SpreadsheetApp.flush();

    mettreAJourMenage(
      false
    );

    SpreadsheetApp.flush();

    return {
      succes: true,
      logement:
        logement,
      ancienEtat:
        etatActuel,
      nouvelEtat:
        nouvelEtat,
      message:
        nouvelEtat ===
          ETAT_MENAGE.PRET
          ? "Le logement " +
            logement +
            " est validé Prêt."
          : "Le logement " +
            logement +
            " est envoyé à la gouvernante pour contrôle."
    };

  } finally {
    verrou.releaseLock();
  }
}



function traiterUneActionV4VersDrive_(
  action,
  bilan
) {
  const id =
    nettoyerTexteSupabaseV4_(
      action &&
      action.id
    );

  const logement =
    nettoyerTexteSupabaseV4_(
      action &&
      action.logement
    );

  const prenom =
    nettoyerTexteSupabaseV4_(
      action &&
      action.prenom
    );

  const ancienEtat =
    nettoyerTexteSupabaseV4_(
      action &&
      action.ancienEtat
    );

  const nouvelEtat =
    nettoyerTexteSupabaseV4_(
      action &&
      action.nouvelEtat
    );

  const source =
    nettoyerTexteSupabaseV4_(
      action &&
      action.sourceTache
    );

  const tentatives =
    Number(
      action &&
      action.tentatives
    ) || 1;

  if (
    !id ||
    !logement ||
    !prenom ||
    !ancienEtat ||
    !nouvelEtat
  ) {
    bilan.erreurs++;

    bilan.details.push(
      (
        logement ||
        "Action sans logement"
      ) +
      " : données incomplètes."
    );

    if (id) {
      marquerActionDriveV4_(
        id,
        CAMPMANAGER_V4_BRIDGE_20260820
          .STATUT_ERREUR,
        "Action incomplète."
      );
    }

    return;
  }

  if (
    source ===
      CAMPMANAGER_V4_BRIDGE_20260820
        .SOURCE_SIMULATION
  ) {
    marquerActionDriveV4_(
      id,
      CAMPMANAGER_V4_BRIDGE_20260820
        .STATUT_SIMULE,
      ""
    );

    bilan.simulees++;

    bilan.details.push(
      logement +
      " : simulation " +
      ancienEtat +
      " → " +
      nouvelEtat +
      " par " +
      prenom +
      " (Drive non modifié)."
    );

    return;
  }

  if (
    source !==
      CAMPMANAGER_V4_BRIDGE_20260820
        .SOURCE_DRIVE
  ) {
    marquerActionDriveV4_(
      id,
      CAMPMANAGER_V4_BRIDGE_20260820
        .STATUT_ERREUR,
      "Source de tâche non autorisée : " +
        source
    );

    bilan.erreurs++;

    bilan.details.push(
      logement +
      " : source non autorisée."
    );

    return;
  }

  try {
    if (
      typeof avancerEtatMenageMobile !==
        "function"
    ) {
      throw new Error(
        "La fonction stable avancerEtatMenageMobile() est introuvable."
      );
    }

    let resultatV3;

    if (
      (
        ancienEtat ===
          ETAT_MENAGE.A_VERIFIER ||
        ancienEtat ===
          ETAT_MENAGE.A_RECONTROLER
      ) &&
      nouvelEtat ===
        ETAT_MENAGE.PRET
    ) {
      resultatV3 =
        appliquerControleGouvernanteV4DansDrive_(
          logement,
          prenom,
          ancienEtat
        );

    } else {
      resultatV3 =
        avancerEtatMenageMobile({
          logement:
            logement,

          prenom:
            prenom,

          etatActuel:
            ancienEtat
        });
    }

    if (
      resultatV3 &&
      resultatV3.succes ===
        false
    ) {
      throw new Error(
        resultatV3.message ||
        "La V3 a refusé l'action."
      );
    }

    const etatRetour =
      nettoyerTexteSupabaseV4_(
        resultatV3 &&
        (
          resultatV3.nouvelEtat ||
          resultatV3.etatMenage ||
          resultatV3.etat
        )
      );

    if (
      etatRetour &&
      etatRetour !==
        nouvelEtat
    ) {
      throw new Error(
        "État Drive inattendu : " +
          etatRetour +
          " au lieu de " +
          nouvelEtat +
          "."
      );
    }

    marquerActionDriveV4_(
      id,
      CAMPMANAGER_V4_BRIDGE_20260820
        .STATUT_APPLIQUE,
      ""
    );

    bilan.appliquees++;

    bilan.details.push(
      logement +
      " : " +
      ancienEtat +
      " → " +
      nouvelEtat +
      " appliqué au Drive par " +
      prenom +
      "."
    );

  } catch (erreur) {
    const message =
      obtenirMessageErreurPontV4_(
        erreur
      );

    const statut =
      tentatives <
        CAMPMANAGER_V4_BRIDGE_20260820
          .MAX_TENTATIVES
        ? CAMPMANAGER_V4_BRIDGE_20260820
            .STATUT_EN_ATTENTE
        : CAMPMANAGER_V4_BRIDGE_20260820
            .STATUT_ERREUR;

    marquerActionDriveV4_(
      id,
      statut,
      message
    );

    bilan.erreurs++;

    bilan.details.push(
      logement +
      " : échec (" +
      message +
      ")" +
      (
        statut ===
          CAMPMANAGER_V4_BRIDGE_20260820
            .STATUT_EN_ATTENTE
          ? " — nouvel essai prévu."
          : " — bloqué après 3 essais."
      )
    );
  }
}


/**
 * ============================================================
 * CONTRÔLE GOUVERNANTE V4 -> DRIVE — COMPATIBLE V3.2.10
 * ============================================================
 */
function appliquerControleGouvernanteV4DansDrive_(
  logement,
  prenom,
  ancienEtatAttendu
) {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleMenage =
    classeur.getSheetByName(
      FEUILLES.MENAGE
    );

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  if (
    !feuilleMenage ||
    !feuilleReception
  ) {
    return {
      succes:
        false,

      conflit:
        true,

      message:
        "Les feuilles Ménage ou Réception sont introuvables."
    };
  }

  mettreAJourMenage(
    false
  );

  const ligneMenage =
    trouverLigneMenageParLogement(
      feuilleMenage,
      logement
    );

  if (!ligneMenage) {
    return {
      succes:
        false,

      conflit:
        true,

      message:
        "Le logement " +
        logement +
        " n'est plus dans la liste Ménage."
    };
  }

  const ligneReception =
    trouverLigneReceptionParLogement(
      feuilleReception,
      logement
    );

  if (!ligneReception) {
    return {
      succes:
        false,

      conflit:
        true,

      message:
        "Le logement " +
        logement +
        " est introuvable dans Réception."
    };
  }

  const celluleEtatMenage =
    feuilleMenage.getRange(
      ligneMenage,
      COLONNES_MENAGE.ETAT_MENAGE
    );

  const etatActuel =
    normaliserValeurMenage(
      celluleEtatMenage.getValue()
    );

  if (
    etatActuel !==
      ancienEtatAttendu
  ) {
    return {
      succes:
        false,

      conflit:
        true,

      message:
        "L'état du logement " +
        logement +
        " a déjà changé. Actualisez la liste."
    };
  }

  if (
    etatActuel !==
      ETAT_MENAGE.A_VERIFIER &&
    etatActuel !==
      ETAT_MENAGE.A_RECONTROLER
  ) {
    return {
      succes:
        false,

      conflit:
        true,

      message:
        "Le logement n'est pas en attente de contrôle."
    };
  }

  const gouvernanteReception =
    String(
      feuilleReception
        .getRange(
          ligneReception,
          COLONNES_RECEPTION.GOUVERNANTE
        )
        .getDisplayValue() || ""
    ).trim();

  if (
    !personnelContientPrenomMenageMobile_(
      gouvernanteReception,
      prenom
    )
  ) {
    return {
      succes:
        false,

      conflit:
        true,

      message:
        "Le contrôle du logement " +
        logement +
        " n'est plus attribué à " +
        prenom +
        "."
    };
  }

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

  const celluleCheck =
    feuilleMenage.getRange(
      ligneMenage,
      colonneCheck
    );

  const gouvernanteCheck =
    String(
      celluleCheck.getDisplayValue() ||
      ""
    ).trim();

  if (
    gouvernanteCheck !== "" &&
    !personnelContientPrenomMenageMobile_(
      gouvernanteCheck,
      prenom
    )
  ) {
    return {
      succes:
        false,

      conflit:
        true,

      message:
        "La colonne Check indique désormais " +
        gouvernanteCheck +
        "."
    };
  }

  const personnelActuel =
    normaliserPersonnelMenage_(
      feuilleMenage
        .getRange(
          ligneMenage,
          COLONNES_MENAGE.PERSONNEL
        )
        .getValue()
    );

  const celluleControle =
    feuilleMenage.getRange(
      ligneMenage,
      colonneEtatControle
    );

  const ancienneValidation =
    celluleEtatMenage.getDataValidation();

  try {
    celluleControle.setValue(
      ETAT_MENAGE.PRET
    );

    celluleEtatMenage.clearDataValidations();

    celluleEtatMenage.setValue(
      ETAT_MENAGE.PRET
    );

    SpreadsheetApp.flush();

    const evenement = {
      range:
        celluleEtatMenage,

      value:
        ETAT_MENAGE.PRET,

      oldValue:
        etatActuel
    };

    const bloque =
      bloquerEtatMenageSiOccupe(
        evenement
      );

    if (bloque) {
      if (ancienneValidation) {
        celluleEtatMenage.setDataValidation(
          ancienneValidation
        );
      }

      return {
        succes:
          false,

        conflit:
          true,

        message:
          "Le client est encore présent. La réception doit d'abord passer le logement sur Parti."
      };
    }

    synchroniserEtatMenageVersReception(
      evenement
    );

    if (
      typeof terminerAttenteClientPourLogementV323_ ===
        "function"
    ) {
      terminerAttenteClientPourLogementV323_(
        logement
      );
    }

    if (
      typeof enregistrerHistoriqueMenageDepuisApplication_ ===
        "function"
    ) {
      try {
        enregistrerHistoriqueMenageDepuisApplication_({
          logement:
            logement,

          prenomCliqueur:
            prenom,

          etatAvant:
            etatActuel,

          etatApres:
            ETAT_MENAGE.PRET,

          personnel:
            personnelActuel,

          gouvernante:
            gouvernanteReception,

          source:
            "Application V4"
        });
      } catch (
        erreurHistorique
      ) {
        console.error(
          "Historique V4 non enregistré : " +
          erreurHistorique.message
        );
      }
    }

    SpreadsheetApp.flush();

    mettreAJourMenage(
      false
    );

    SpreadsheetApp.flush();

    return {
      succes:
        true,

      logement:
        logement,

      ancienEtat:
        etatActuel,

      nouvelEtat:
        ETAT_MENAGE.PRET,

      message:
        "Le logement " +
        logement +
        " est validé Prêt par " +
        prenom +
        "."
    };

  } catch (erreur) {
    try {
      const etatReceptionApres =
        normaliserValeurMenage(
          feuilleReception
            .getRange(
              ligneReception,
              COLONNES_RECEPTION.ETAT
            )
            .getValue()
        );

      if (
        etatReceptionApres !==
          ETAT_RECEPTION.PRET &&
        etatReceptionApres !==
          ETAT_RECEPTION.LIBRE
      ) {
        celluleEtatMenage.clearDataValidations();

        celluleEtatMenage.setValue(
          etatActuel
        );

        if (ancienneValidation) {
          celluleEtatMenage.setDataValidation(
            ancienneValidation
          );
        }

        celluleControle.setValue(
          etatActuel
        );

        SpreadsheetApp.flush();
      }
    } catch (
      erreurRestauration
    ) {
      console.error(
        "Restauration après erreur V4 impossible : " +
        erreurRestauration.message
      );
    }

    throw erreur;
  }
}


function marquerActionDriveV4_(
  id,
  statut,
  erreur
) {
  return appelerRpcServeurSupabaseV4_(
    "marquer_action_drive_v4",
    {
      p_action_id:
        id,

      p_statut:
        statut,

      p_erreur:
        erreur || null
    }
  );
}


/**
 * ============================================================
 * SYNCHRONISATION BIDIRECTIONNELLE
 * ============================================================
 */
function synchroniserCampManagerV4Bidirectionnel() {
  /*
   * Fonction historique conservée.
   *
   * Si le correctif 98 est chargé, on utilise systématiquement le
   * chemin sécurisé qui ne reconstruit jamais Réception.
   */
  if (
    typeof synchroniserCampManagerV4BidirectionnelSecurise20260827 ===
      "function"
  ) {
    return synchroniserCampManagerV4BidirectionnelSecurise20260827();
  }

  /*
   * Repli de compatibilité uniquement si 98 n'est pas présent.
   */
  const entree =
    traiterActionsV4VersDrive();

  const sortie =
    synchroniserGoogleDriveVersSupabaseV4();

  return {
    ok:
      true,

    v4VersDrive:
      entree,

    driveVersV4:
      sortie
  };
}


function installerPontAutomatiqueV4VersDrive() {
  /*
   * Nom historique conservé pour compatibilité.
   * On ne crée plus de déclencheur brut sur traiterActionsV4VersDrive().
   */
  if (
    typeof installerActualisationAutomatiqueV4_20260827c !==
      "function"
  ) {
    throw new Error(
      "Installation V4 sécurisée introuvable. " +
      "Le module 98_Multi_Camping_OpenSource est requis."
    );
  }

  return installerActualisationAutomatiqueV4_20260827c();
}


function supprimerPontAutomatiqueV4VersDrive() {
  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        if (
          declencheur.getHandlerFunction() ===
            "traiterActionsV4VersDrive"
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );
}


function installerSynchronisationBidirectionnelleV4() {
  /*
   * Nom historique conservé pour compatibilité.
   * Toute synchronisation automatique est désormais installée par 98.
   */
  if (
    typeof installerActualisationAutomatiqueV4_20260827c !==
      "function"
  ) {
    throw new Error(
      "Installation V4 sécurisée introuvable. " +
      "Le module 98_Multi_Camping_OpenSource est requis."
    );
  }

  return installerActualisationAutomatiqueV4_20260827c();
}


function supprimerSynchronisationBidirectionnelleV4() {
  const fonctions = [
    "traiterActionsV4VersDrive",
    "synchroniserGoogleDriveVersSupabaseV4",
    "synchroniserCampManagerV4Bidirectionnel"
  ];

  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        if (
          fonctions.indexOf(
            declencheur.getHandlerFunction()
          ) !== -1
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );
}


function verifierDeclencheursV4() {
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
          return declencheur.getHandlerFunction();
        }
      )
      .filter(
        function(nom) {
          return nomsV4.indexOf(nom) !== -1;
        }
      );

  const message =
    trouves.length
      ? trouves.join("\n")
      : "Aucun déclencheur V4 installé.";

  SpreadsheetApp
    .getUi()
    .alert(
      "V4 — Déclencheurs installés",
      message,
      SpreadsheetApp
        .getUi()        .ButtonSet.OK
    );

  return trouves;
}


function obtenirMessageErreurPontV4_(
  erreur
) {
  if (!erreur) {
    return "Erreur inconnue.";
  }

  if (
    typeof erreur ===
      "string"
  ) {
    return erreur;
  }

  if (
    erreur.message
  ) {
    return String(
      erreur.message
    );
  }

  try {
    return JSON.stringify(
      erreur
    );
  } catch (e) {
    return String(
      erreur
    );
  }
}
