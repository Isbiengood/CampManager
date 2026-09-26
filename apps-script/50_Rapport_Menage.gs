/**
 * ============================================================
 * CAMPMANAGER
 * RAPPORT MÉNAGE QUOTIDIEN — VERSION 2.3 OPEN SOURCE
 * 25/09/2026
 * ============================================================
 *
 * Le nom de l'établissement est lu automatiquement dans les
 * Script Properties créées par l'installation CampManager.
 *
 * Toute la configuration est lue dans la feuille "Paramètres".
 *
 * Colonne K = nom du paramètre
 * Colonne L = valeur
 *
 * Paramètres reconnus :
 *
 * Email rapport 1
 * Email rapport 2
 * Email rapport 3
 * Email rapport 4...
 * Heure envoi
 * Rapport activé
 * Rapport format
 *
 * Le nombre d'adresses e-mail est illimité :
 * toute ligne dont le nom commence par "Email rapport"
 * est automatiquement prise en compte.
 *
 * Heure d'envoi par défaut : 19:00
 *
 * Rapport activé :
 * Oui = envoi automatique
 * Non = aucun envoi automatique
 *
 * Rapport format :
 * HTML = e-mail HTML
 * PDF = réservé à une future version
 * Les deux = réservé à une future version
 *
 * Pour cette version, HTML est utilisé par défaut.
 *
 * V2.1 : si les rapports sont désactivés ou si toutes les adresses
 * « Email rapport ... » sont supprimées, aucun envoi automatique
 * n'est effectué. Le déclencheur peut rester installé sans risque.
 */


/**
 * Configuration générale du rapport.
 */
const RAPPORT_MENAGE = {
  FONCTION_ENVOI:
    "envoyerRapportMenageQuotidien",

  HEURE_PAR_DEFAUT:
    19,

  MINUTE_PAR_DEFAUT:
    0,

  PROP_SPREADSHEET_ID:
    "CAMPMANAGER_RAPPORT_MENAGE_SPREADSHEET_ID"
};


/**
 * Retourne le classeur CampManager même lors d'un déclencheur horaire,
 * où aucun classeur actif n'est garanti.
 */
function obtenirClasseurRapportMenage_() {
  let classeur = null;

  try {
    classeur =
      SpreadsheetApp.getActiveSpreadsheet();
  } catch (erreur) {}

  if (classeur) {
    try {
      PropertiesService
        .getScriptProperties()
        .setProperty(
          RAPPORT_MENAGE.PROP_SPREADSHEET_ID,
          classeur.getId()
        );
    } catch (erreur) {}

    return classeur;
  }

  const proprietes =
    PropertiesService.getScriptProperties();

  const id =
    String(
      proprietes.getProperty(
        RAPPORT_MENAGE.PROP_SPREADSHEET_ID
      ) ||
      proprietes.getProperty(
        "CAMPMANAGER_V4_SPREADSHEET_ID"
      ) ||
      ""
    ).trim();

  if (!id) {
    throw new Error(
      "Identifiant du classeur CampManager introuvable. " +
      "Réinstalle le déclencheur du rapport ménage depuis l'établissement."
    );
  }

  return SpreadsheetApp.openById(
    id
  );
}


/**
 * ============================================================
 * CONFIGURATION LUE DANS PARAMÈTRES
 * ============================================================
 */


/**
 * Lit tous les paramètres de K/L.
 *
 * @return {Object}
 */
function lireConfigurationRapportMenage_() {
  const classeur =
    obtenirClasseurRapportMenage_();

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
    feuille.getLastRow();

  const configuration = {
    emails: [],
    heure: 19,
    minute: 0,
    actif: false,
    format: "HTML"
  };

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return configuration;
  }

  const donnees =
    feuille
      .getRange(
        LIGNES.DEBUT,
        COLONNES_PARAMETRES.PARAMETRE,
        derniereLigne -
          LIGNES.DEBUT +
          1,
        2
      )
      .getValues();

  donnees.forEach(
    function(ligne) {
      const nom =
        String(
          ligne[0] || ""
        ).trim();

      const valeur =
        ligne[1];

      if (
        nom === ""
      ) {
        return;
      }

      /*
       * Toutes les lignes commençant par
       * "Email rapport" sont prises en compte.
       */
      if (
        /^email rapport/i.test(
          nom
        )
      ) {
        const email =
          String(
            valeur || ""
          ).trim();

        if (
          emailValideRapportMenage_(
            email
          ) &&
          configuration.emails.indexOf(
            email
          ) === -1
        ) {
          configuration.emails.push(
            email
          );
        }

        return;
      }

      if (
        normaliserCleRapportMenage_(
          nom
        ) ===
        "heure envoi"
      ) {
        const heure =
          convertirHeureRapportMenage_(
            valeur
          );

        if (
          heure
        ) {
          configuration.heure =
            heure.heure;

          configuration.minute =
            heure.minute;
        }

        return;
      }

      if (
        normaliserCleRapportMenage_(
          nom
        ) ===
        "rapport active"
      ) {
        const texte =
          normaliserCleRapportMenage_(
            valeur
          );

        configuration.actif =
          (
            texte === "oui" ||
            texte === "true" ||
            texte === "actif" ||
            texte === "active"
          );

        return;
      }

      if (
        normaliserCleRapportMenage_(
          nom
        ) ===
        "rapport format"
      ) {
        const format =
          String(
            valeur || ""
          ).trim();

        configuration.format =
          format || "HTML";
      }
    }
  );

  return configuration;
}


/**
 * Convertit une valeur de cellule en heure/minute.
 *
 * Accepte :
 * - vraie heure Google Sheets
 * - "19:00"
 * - "19"
 *
 * @return {Object|null}
 */
function convertirHeureRapportMenage_(
  valeur
) {
  if (
    valeur instanceof Date &&
    !isNaN(
      valeur.getTime()
    )
  ) {
    return {
      heure:
        valeur.getHours(),
      minute:
        valeur.getMinutes()
    };
  }

  if (
    typeof valeur ===
    "number" &&
    isFinite(
      valeur
    )
  ) {
    /*
     * Google Sheets peut renvoyer une heure
     * comme fraction de journée.
     */
    if (
      valeur >= 0 &&
      valeur < 1
    ) {
      const totalMinutes =
        Math.round(
          valeur * 24 * 60
        );

      return {
        heure:
          Math.floor(
            totalMinutes / 60
          ) % 24,

        minute:
          totalMinutes % 60
      };
    }

    if (
      valeur >= 0 &&
      valeur <= 23
    ) {
      return {
        heure:
          Math.floor(
            valeur
          ),
        minute:
          0
      };
    }
  }

  const texte =
    String(
      valeur || ""
    ).trim();

  const correspondance =
    texte.match(
      /^(\d{1,2})(?:[:hH](\d{1,2}))?$/
    );

  if (
    !correspondance
  ) {
    return null;
  }

  const heure =
    Number(
      correspondance[1]
    );

  const minute =
    Number(
      correspondance[2] || 0
    );

  if (
    heure < 0 ||
    heure > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return {
    heure:
      heure,
    minute:
      minute
  };
}


/**
 * ============================================================
 * DÉCLENCHEUR AUTOMATIQUE
 * ============================================================
 */


/**
 * Installe ou réinstalle le déclencheur quotidien
 * selon "Heure envoi" dans Paramètres.
 *
 * À exécuter sur l'établissement lorsque l'envoi automatique
 * est souhaité, puis à relancer uniquement si l'heure change.
 *
 * Si "Rapport activé" = Non ou si aucune adresse valide n'est
 * configurée, le déclencheur peut rester installé sans envoyer de mail.
 */
function installerDeclencheurRapportMenage() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!classeur) {
    throw new Error(
      "Aucun classeur CampManager actif."
    );
  }

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
      "Installation du rapport ménage bloquée : " +
      "aucun établissement n'est installé. " +
      "Ne lance pas cet installateur dans CampManager-MASTER."
    );
  }

  PropertiesService
    .getScriptProperties()
    .setProperty(
      RAPPORT_MENAGE.PROP_SPREADSHEET_ID,
      classeur.getId()
    );

  const configuration =
    lireConfigurationRapportMenage_();

  supprimerDeclencheurRapportMenage_();

  ScriptApp
    .newTrigger(
      RAPPORT_MENAGE.FONCTION_ENVOI
    )
    .timeBased()
    .atHour(
      configuration.heure
    )
    .nearMinute(
      configuration.minute
    )
    .everyDays(
      1
    )
    .create();

  classeur
    .toast(
      "Envoi automatique installé vers " +
        String(
          configuration.heure
        ).padStart(
          2,
          "0"
        ) +
        ":" +
        String(
          configuration.minute
        ).padStart(
          2,
          "0"
        ) +
        ".",
      "📧 Rapport ménage",
      6
    );
}


/**
 * Supprime uniquement les anciens déclencheurs
 * du rapport ménage.
 */
function supprimerDeclencheurRapportMenage_() {
  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        if (
          declencheur.getHandlerFunction() ===
          RAPPORT_MENAGE.FONCTION_ENVOI
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );
}


/**
 * Retourne le nom de l'établissement lié à ce Google Sheet.
 *
 * Priorité :
 * 1. propriété créée par l'installation CampManager ;
 * 2. nom du classeur ;
 * 3. "CampManager".
 */
function obtenirNomEtablissementRapportMenage_() {
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

  return nom || "CampManager";
}


/**
 * ============================================================
 * ENVOI
 * ============================================================
 */


/**
 * Envoi automatique quotidien.
 */
function envoyerRapportMenageQuotidien() {
  const configuration =
    lireConfigurationRapportMenage_();

  /*
   * V2.1 — arrêt automatique du rapport.
   *
   * Aucun mail n'est envoyé si :
   * - "Rapport activé" n'est pas sur Oui ;
   * - ou aucune adresse "Email rapport ..." valide
   *   n'est renseignée dans Paramètres.
   *
   * Le déclencheur peut rester installé :
   * il devient simplement inactif.
   */
  if (
    !configuration.actif ||
    configuration.emails.length === 0
  ) {
    return;
  }

  envoyerRapportMenageAvecConfiguration_(
    configuration,
    false
  );
}


/**
 * Envoi manuel depuis le menu.
 *
 * Le test est envoyé même si "Rapport activé" = Non.
 */
function envoyerRapportMenageTest() {
  const configuration =
    lireConfigurationRapportMenage_();

  envoyerRapportMenageAvecConfiguration_(
    configuration,
    true
  );

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      "Rapport de test envoyé.",
      "📧 Rapport ménage",
      5
    );
}


/**
 * Envoie le rapport aux adresses configurées.
 */
function envoyerRapportMenageAvecConfiguration_(
  configuration,
  estTest
) {
  if (
    !configuration ||
    configuration.emails.length === 0
  ) {
    throw new Error(
      "Aucune adresse valide n'est renseignée dans Paramètres."
    );
  }

  const maintenant =
    new Date();

  const fuseau =
    Session.getScriptTimeZone();

  const rapport =
    construireRapportMenageDuJour_(
      maintenant
    );

  const nomEtablissement =
    obtenirNomEtablissementRapportMenage_();

  const sujet =
    (
      estTest
        ? "🧪 TEST — "
        : ""
    ) +
    "🏢 " +
    nomEtablissement +
    " — Rapport ménage du " +
    Utilities.formatDate(
      maintenant,
      fuseau,
      "dd/MM/yyyy"
    );

  const html =
    construireHtmlRapportMenage_(
      rapport
    );

  const texte =
    construireTexteRapportMenage_(
      rapport
    );

  /*
   * Un seul envoi avec tous les destinataires.
   */
  MailApp.sendEmail({
    to:
      configuration.emails.join(
        ","
      ),

    subject:
      sujet,

    body:
      texte,

    htmlBody:
      html,

    name:
      "CampManager — " +
      nomEtablissement
  });
}


/**
 * ============================================================
 * CONSTRUCTION DU RAPPORT
 * ============================================================
 */


/**
 * Construit les statistiques du jour.
 */
function construireRapportMenageDuJour_(
  dateReference
) {
  const feuille =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        FEUILLE_HISTORIQUE_MENAGE
      );

  const resultat = {
    date:
      dateReference,

    nettoyes:
      0,

    controles:
      0,

    recontroles:
      0,

    dureesDepartMenage:
      [],

    dureesControle:
      [],

    personnel:
      {},

    gouvernantes:
      {},

    lignes:
      []
  };

  if (
    !feuille ||
    feuille.getLastRow() <
      LIGNES.DEBUT
  ) {
    resultat.moyenneDepartMenage = "";
    resultat.moyenneControle = "";
    resultat.restants =
      compterLogementsRestantsRapportMenage_();

    return resultat;
  }

  const donnees =
    feuille
      .getRange(
        LIGNES.DEBUT,
        1,
        feuille.getLastRow() -
          LIGNES.DEBUT +
          1,
        COLONNES_HISTORIQUE_MENAGE.NOMBRE_COLONNES
      )
      .getValues();

  donnees.forEach(
    function(ligne) {
      const date =
        ligne[
          COLONNES_HISTORIQUE_MENAGE.DATE - 1
        ];

      if (
        !datesMemeJourRapportMenage_(
          date,
          dateReference
        )
      ) {
        return;
      }

      const action =
        String(
          ligne[
            COLONNES_HISTORIQUE_MENAGE.ACTION - 1
          ] || ""
        ).trim();

      const logement =
        String(
          ligne[
            COLONNES_HISTORIQUE_MENAGE.LOGEMENT - 1
          ] || ""
        ).trim();

      const realisePar =
        String(
          ligne[
            COLONNES_HISTORIQUE_MENAGE.REALISE_PAR - 1
          ] || ""
        ).trim();

      const gouvernante =
        String(
          ligne[
            COLONNES_HISTORIQUE_MENAGE.GOUVERNANTE - 1
          ] || ""
        ).trim();

      const dureeDepartBrute =
        ligne[
          COLONNES_HISTORIQUE_MENAGE.DUREE_DEPUIS_DEPART - 1
        ];

      const dureeControleBrute =
        ligne[
          COLONNES_HISTORIQUE_MENAGE.TEMPS_CONTROLE - 1
        ];

      const dureeDepart =
        dureeDepartBrute === "" ||
        dureeDepartBrute === null
          ? NaN
          : Number(
              dureeDepartBrute
            );

      const dureeControle =
        dureeControleBrute === "" ||
        dureeControleBrute === null
          ? NaN
          : Number(
              dureeControleBrute
            );

      if (
        action ===
          "Ménage" ||
        action ===
          "Ménage + Contrôle"
      ) {
        resultat.nettoyes++;

        incrementerCompteurRapportMenage_(
          resultat.personnel,
          realisePar
        );
      }

      if (
        action ===
          "Ménage + Contrôle"
      ) {
        resultat.controles++;

        incrementerCompteurRapportMenage_(
          resultat.gouvernantes,
          gouvernante
        );
      }

      if (
        action ===
          "Recontrôle"
      ) {
        resultat.recontroles++;
        resultat.controles++;

        incrementerCompteurRapportMenage_(
          resultat.gouvernantes,
          gouvernante
        );
      }

      if (
        isFinite(
          dureeDepart
        ) &&
        dureeDepart >= 0 &&
        (
          action ===
            "Ménage" ||
          action ===
            "Ménage + Contrôle"
        )
      ) {
        resultat.dureesDepartMenage.push(
          dureeDepart
        );
      }

      if (
        isFinite(
          dureeControle
        ) &&
        dureeControle >= 0 &&
        action ===
          "Ménage + Contrôle"
      ) {
        resultat.dureesControle.push(
          dureeControle
        );
      }

      resultat.lignes.push({
        logement:
          logement,
        action:
          action,
        realisePar:
          realisePar,
        gouvernante:
          gouvernante,
        dureeDepart:
          isFinite(
            dureeDepart
          )
            ? dureeDepart
            : "",
        dureeControle:
          isFinite(
            dureeControle
          )
            ? dureeControle
            : ""
      });
    }
  );

  resultat.moyenneDepartMenage =
    moyenneRapportMenage_(
      resultat.dureesDepartMenage
    );

  resultat.moyenneControle =
    moyenneRapportMenage_(
      resultat.dureesControle
    );

  resultat.restants =
    compterLogementsRestantsRapportMenage_();

  return resultat;
}


/**
 * Compte les tâches encore non terminées.
 */
function compterLogementsRestantsRapportMenage_() {
  const feuille =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        FEUILLES.MENAGE
      );

  if (
    !feuille ||
    feuille.getLastRow() <
      LIGNES.DEBUT
  ) {
    return 0;
  }

  const valeurs =
    feuille
      .getRange(
        LIGNES.DEBUT,
        COLONNES_MENAGE.ETAT_MENAGE,
        feuille.getLastRow() -
          LIGNES.DEBUT +
          1,
        1
      )
      .getDisplayValues();

  return valeurs.filter(
    function(ligne) {
      const etat =
        String(
          ligne[0] || ""
        ).trim();

      return (
        etat ===
          ETAT_MENAGE.A_FAIRE ||
        etat ===
          ETAT_MENAGE.A_VERIFIER ||        etat ===
          ETAT_MENAGE.A_RECONTROLER
      );
    }
  ).length;
}


/**
 * ============================================================
 * PRÉSENTATION DU MAIL
 * ============================================================
 */


function construireHtmlRapportMenage_(
  rapport
) {
  const fuseau =
    Session.getScriptTimeZone();

  const date =
    Utilities.formatDate(
      rapport.date,
      fuseau,
      "dd/MM/yyyy"
    );

  function ligneStat_(
    libelle,
    valeur
  ) {
    return (
      "<tr>" +
      "<td style='padding:8px;border-bottom:1px solid #eee'>" +
      libelle +
      "</td>" +
      "<td style='padding:8px;text-align:right;font-weight:bold;border-bottom:1px solid #eee'>" +
      valeur +
      "</td>" +
      "</tr>"
    );
  }

  return (
    "<div style='font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#17202a'>" +
      "<div style='background:#17365d;color:white;padding:20px;border-radius:14px 14px 0 0'>" +
        "<h2 style='margin:0'>🏢 " +
          echapperHtmlRapportMenage_(
            obtenirNomEtablissementRapportMenage_()
          ) +
        "</h2>" +
        "<div style='margin-top:6px'>Rapport ménage — " +
          date +
        "</div>" +
      "</div>" +

      "<div style='padding:20px;border:1px solid #dfe4ea;border-top:0'>" +
        "<h3>📊 Activité</h3>" +
        "<table style='width:100%;border-collapse:collapse'>" +
          ligneStat_("🧹 Logements nettoyés", rapport.nettoyes) +
          ligneStat_("👑 Contrôles effectués", rapport.controles) +
          ligneStat_("🔁 Recontrôles", rapport.recontroles) +
          ligneStat_("⚠️ Tâches restantes", rapport.restants) +
        "</table>" +

        "<h3 style='margin-top:24px'>⏱ Temps moyens</h3>" +
        "<table style='width:100%;border-collapse:collapse'>" +
          ligneStat_(
            "Départ réel → fin ménage",
            formaterMinutesRapportMenage_(
              rapport.moyenneDepartMenage
            )
          ) +
          ligneStat_(
            "Fin ménage → contrôle",
            formaterMinutesRapportMenage_(
              rapport.moyenneControle
            )
          ) +
        "</table>" +

        construireTableCompteursRapportMenage_(
          "🧹 Personnel / binômes",
          rapport.personnel
        ) +

        construireTableCompteursRapportMenage_(
          "👑 Gouvernantes",
          rapport.gouvernantes
        ) +
      "</div>" +
    "</div>"
  );
}


function construireTexteRapportMenage_(
  rapport
) {
  const date =
    Utilities.formatDate(
      rapport.date,
      Session.getScriptTimeZone(),
      "dd/MM/yyyy"
    );

  return (
    obtenirNomEtablissementRapportMenage_() +
    "\n" +
    "Rapport ménage du " +
    date +
    "\n\n" +
    "Logements nettoyés : " +
    rapport.nettoyes +
    "\nContrôles : " +
    rapport.controles +
    "\nRecontrôles : " +
    rapport.recontroles +
    "\nTâches restantes : " +
    rapport.restants +
    "\n\nTemps moyen départ → ménage : " +
    formaterMinutesRapportMenage_(
      rapport.moyenneDepartMenage
    ) +
    "\nTemps moyen ménage → contrôle : " +
    formaterMinutesRapportMenage_(
      rapport.moyenneControle
    )
  );
}


function construireTableCompteursRapportMenage_(
  titre,
  compteurs
) {
  const noms =
    Object.keys(
      compteurs
    ).sort();

  if (
    noms.length === 0
  ) {
    return "";
  }

  let html =
    "<h3 style='margin-top:24px'>" +
    titre +
    "</h3>" +
    "<table style='width:100%;border-collapse:collapse'>";

  noms.forEach(
    function(nom) {
      html +=
        "<tr>" +
        "<td style='padding:8px;border-bottom:1px solid #eee'>" +
          echapperHtmlRapportMenage_(
            nom
          ) +
        "</td>" +
        "<td style='padding:8px;text-align:right;font-weight:bold;border-bottom:1px solid #eee'>" +
          compteurs[nom] +
        "</td>" +
        "</tr>";
    }
  );

  return html + "</table>";
}


function incrementerCompteurRapportMenage_(
  objet,
  cle
) {
  const nom =
    String(
      cle || ""
    ).trim();

  if (
    nom === ""
  ) {
    return;
  }

  objet[nom] =
    (
      objet[nom] || 0
    ) + 1;
}


function moyenneRapportMenage_(
  valeurs
) {
  if (
    !Array.isArray(
      valeurs
    ) ||
    valeurs.length === 0
  ) {
    return "";
  }

  const total =
    valeurs.reduce(
      function(somme, valeur) {
        return somme + valeur;
      },
      0
    );

  return Math.round(
    total /
    valeurs.length
  );
}


function formaterMinutesRapportMenage_(
  minutes
) {
  const valeur =
    Number(
      minutes
    );

  if (
    !isFinite(
      valeur
    )
  ) {
    return "—";
  }

  if (
    valeur < 60
  ) {
    return (
      Math.round(
        valeur
      ) +
      " min"
    );
  }

  const heures =
    Math.floor(
      valeur / 60
    );

  const reste =
    Math.round(
      valeur % 60
    );

  return (
    heures +
    " h " +
    String(
      reste
    ).padStart(
      2,
      "0"
    )
  );
}


function datesMemeJourRapportMenage_(
  dateA,
  dateB
) {
  if (
    !(dateA instanceof Date) ||
    isNaN(
      dateA.getTime()
    ) ||
    !(dateB instanceof Date) ||
    isNaN(
      dateB.getTime()
    )
  ) {
    return false;
  }

  return (
    dateA.getFullYear() ===
      dateB.getFullYear() &&
    dateA.getMonth() ===
      dateB.getMonth() &&
    dateA.getDate() ===
      dateB.getDate()
  );
}


function emailValideRapportMenage_(
  email
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(
      email || ""
    ).trim()
  );
}


function normaliserCleRapportMenage_(
  valeur
) {
  return String(
    valeur === null ||
    typeof valeur === "undefined"
      ? ""
      : valeur
  )
    .trim()
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}


function echapperHtmlRapportMenage_(
  valeur
) {
  return String(
    valeur || ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}