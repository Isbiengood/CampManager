/**
 * ============================================================
 * CAMP MANAGER — MENU PRINCIPAL MULTI-CAMPING
 * VERSION V4.2.8 MULTI-ÉTABLISSEMENT — IMPORT XLSX/TXT/CSV — 25/09/2026
 * ============================================================
 *
 * Ce fichier remplace EN ENTIER l'ancien fichier 10_Menu.
 *
 * Organisation finale :
 * - Import des réservations
 * - Actualisation V4 sécurisée
 * - Tableau de bord
 * - CampManager V4
 * - Tri / organisation de Réception
 * - Rapport ménage
 * - Aide
 * - Effacement personnel / gouvernantes
 * - Sauvegarde
 * - Réinitialisation
 *
 * Les tris Réception ne recalculent aucun état : ils déplacent
 * uniquement les lignes complètes.
 * ============================================================
 */


/**
 * Adresse publique COMMUNE de CampManager V4.
 *
 * Tous les campings utilisent la même application GitHub Pages.
 * La fonction construireUrlCampManagerV4_() ajoute automatiquement
 * le code du camping de CE Google Sheet :
 *
 *   .../v4.html?v=503&camping=camping-du-lac
 *   .../v4.html?v=503&camping=autre-camping
 *
 * Le code est lu dans la propriété :
 *   CAMPMANAGER_V4_CAMPING_CODE
 *
 * Cette propriété est déjà gérée par le fichier 98 Multi-Camping.
 */
const URL_CAPFUN_MENAGE_MOBILE = "";


/**
 * Retourne le code du camping associé à CE classeur.
 *
 * Priorité :
 * 1. fonction Multi-Camping du fichier 98 ;
 * 2. propriété de script.
 *
 * Aucun camping n'est choisi par défaut.
 */
function obtenirCodeCampingPourMenuV4_() {
  let code =
    "";

  if (
    typeof obtenirCodeCampingCampManagerV4_ ===
      "function"
  ) {
    code =
      String(
        obtenirCodeCampingCampManagerV4_() ||
        ""
      ).trim();

  } else {
    code =
      String(
        PropertiesService
          .getScriptProperties()
          .getProperty(
            "CAMPMANAGER_V4_CAMPING_CODE"
          ) ||
        ""
      ).trim();
  }

  if (!code) {
    throw new Error(
      "Aucun camping n'est associé à ce Google Sheet. " +
      "Configurez d'abord l'établissement dans le module Multi-Camping."
    );
  }

  code =
    code.toLowerCase();

  if (
    !/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(
      code
    )
  ) {
    throw new Error(
      "Code camping invalide pour CampManager V4 : " +
      code
    );
  }

  return code;
}


/**
 * Construit l'adresse CampManager correspondant au camping
 * associé au Google Sheet courant.
 */
function construireUrlCampManagerV4_() {
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
        URL_CAPFUN_MENAGE_MOBILE ||
        ""
      ).trim();
  }

  if (!base) {
    return "";
  }

  const separateur =
    base.indexOf("?") ===
      -1
      ? "?"
      : "&";

  return (
    base +
    separateur +
    "camping=" +
    encodeURIComponent(
      obtenirCodeCampingPourMenuV4_()
    )
  );
}


/**
 * Crée automatiquement le menu CampManager
 * à l'ouverture du classeur.
 */
function onOpen(e) {
  construireMenusCampManagerV4();
}


/**
 * Construit TOUS les menus CampManager.
 *
 * Cette fonction est appelée :
 * - par le onOpen simple ;
 * - par le déclencheur installable de partage.
 *
 * Le déclencheur installable rend l'affichage des menus
 * plus fiable pour les autres comptes ayant le droit Éditeur.
 */
function construireMenusCampManagerV4() {
  const ui =
    SpreadsheetApp.getUi();


  /*
   * ==========================================================
   * ÉTABLISSEMENT / INSTALLATION
   * ==========================================================
   *
   * Ce menu doit rester accessible même sur une copie neuve
   * de CampManager qui n'a encore aucun code établissement.
   */
  const menuEtablissement =
    ui.createMenu(
      "⚙️ Établissement / installation"
    )
      .addItem(
        "🚀 Installer un nouvel établissement",
        "installerCampManagerNouvelEtablissement"
      )
      .addItem(
        "✅ Vérifier l’installation",
        "verifierInstallationCampManagerEtablissement"
      )
      .addItem(
        "🛠️ Réparer les déclencheurs",
        "reparerInstallationCampManagerEtablissement"
      )
      .addSeparator()
      .addItem(
        "🏷️ Afficher l’établissement associé",
        "afficherConfigurationEtablissementCampManager"
      );


  /*
   * ==========================================================
   * APPLICATION MOBILE V4
   * ==========================================================
   */
  const menuApplicationMobile =
    ui.createMenu(
      "📱 CampManager V4"
    )
      .addItem(
        "📱 Ouvrir l’application",
        "ouvrirCapfunMenageMobile"
      )
      .addItem(
        "🔗 Afficher et copier le lien",
        "afficherLienCapfunMenageMobile"
      )
      .addItem(
        "📷 Afficher le QR Code",
        "afficherQrCodeCapfunMenageMobile"
      );


  /*
   * ==========================================================
   * TRIER / ORGANISER RÉCEPTION
   * ==========================================================
   *
   * Les trois premiers choix utilisent les fonctions ajoutées
   * dans 32_Planning_Reception V1.4.
   *
   * Tous les tris déplacent les lignes complètes : aucun état,
   * personnel, gouvernante ou téléphone n'est recalculé.
   */
  const menuTriReception =
    ui.createMenu(
      "↕️ Trier / organiser Réception"
    )
      .addItem(
        "🟢 Libres en premier",
        "receptionLibresEnPremier"
      )
      .addItem(
        "⚪ Prêts en premier",
        "receptionPretsEnPremier"
      )
      .addItem(
        "🟠 Occupés en premier",
        "receptionOccupesEnPremier"
      )
      .addSeparator()
      .addItem(
        "📤 Départs aujourd’hui en premier",
        "receptionDepartsAujourdhuiEnPremier"
      )
      .addItem(
        "📆 Départs — choisir une date",
        "receptionChoisirDateDepartsEnPremier"
      )
      .addSeparator()
      .addItem(
        "📅 Arrivées demain en premier",
        "receptionArriveesDemainEnPremier"
      )
      .addItem(
        "📆 Arrivées — choisir une date",
        "receptionChoisirDateArriveesEnPremier"
      )
      .addSeparator()
      .addItem(
        "↩️ Rétablir le tri normal",
        "receptionRetablirTriNormal"
      );


  /*
   * ==========================================================
   * RAPPORT MÉNAGE
   * ==========================================================
   */
  /*
   * ==========================================================
   * ACTIONS GROUPÉES — MODE TEST / EXPLOITATION RAPIDE
   * ==========================================================
   *
   * Toutes les actions sont limitées aux DÉPARTS DU JOUR.
   * Un départ anticipé prévu demain ou plus tard n'est jamais
   * touché par les actions « tous les départs du jour ».
   *
   * Les actions sur sélection utilisent uniquement les lignes
   * sélectionnées dans la feuille Réception.
   */
  const menuActionsGroupees =
    ui.createMenu(
      "⚡ Actions groupées"
    )
      .addItem(
        "🚪 Aujourd'hui : Occupé → Parti",
        "passerTousDepartsAujourdhuiOccupeVersParti"
      )
      .addItem(
        "✅ Aujourd'hui : Parti → Prêt",
        "passerTousDepartsAujourdhuiPartiVersPret"
      )
      .addSeparator()
      .addItem(
        "📅 Date au choix : Occupé → Parti",
        "passerDepartsDateChoisieOccupeVersParti"
      )
      .addItem(
        "📅 Date au choix : Parti → Prêt",
        "passerDepartsDateChoisiePartiVersPret"
      )
      .addSeparator()
      .addItem(
        "🎯 Sélection : Occupé → Parti",
        "passerSelectionOccupeVersParti"
      )
      .addItem(
        "🎯 Sélection : Parti → Prêt",
        "passerSelectionPartiVersPret"
      );


  const menuRapportMenage =
    ui.createMenu(
      "📧 Rapport ménage"
    )
      .addItem(
        "🧪 Envoyer un rapport de test",
        "envoyerRapportMenageTest"
      );


  /*
   * ==========================================================
   * MENU PRINCIPAL
   * ==========================================================
   */
  ui.createMenu(
    "🏢 CampManager"
  )
    .addSubMenu(
      menuEtablissement
    )
    .addSeparator()
    .addItem(
      "📥 Importer des réservations (.xlsx / .txt / .csv)",
      "ouvrirImportESeason"
    )
    .addItem(
      "🔄 Actualiser le logiciel",
      "actualiserLogicielV4Securise20260827"
    )
    .addItem(
      "📊 Ouvrir le tableau de bord",
      "ouvrirTableauDeBord"
    )
    .addSeparator()
    .addSubMenu(
      menuApplicationMobile
    )
    .addSubMenu(
      menuTriReception
    )
    .addSubMenu(
      menuActionsGroupees
    )
    .addSeparator()
    .addSubMenu(
      menuRapportMenage
    )
    .addItem(
      "📘 Aide",
      "ouvrirAideCampManager"
    )
    .addSeparator()
    .addItem(
      "👥 Effacer personnel + gouvernantes",
      "menuEffacerPersonnel"
    )
    .addSeparator()
    .addItem(
      "💾 Créer une sauvegarde",
      "sauvegardeManuelle"
    )
    .addItem(
      "⚠️ Réinitialiser le logiciel",
      "menuReinitialiserLogiciel"
    )
    .addToUi();

  /*
   * Le seul autre menu visible est « 🔐 Accès V4 ».
   * Les outils techniques sont rangés dans son sous-menu
   * « 🛠️ Maintenance / réparation ».
   */
  if (
    typeof creerMenuBackOfficeV4 ===
      "function"
  ) {
    creerMenuBackOfficeV4();
  }
}


/**
 * ============================================================
 * INSTALLATION DES MENUS POUR LES COMPTES PARTAGÉS
 * ============================================================
 *
 * À lancer UNE SEULE FOIS depuis le compte principal :
 *
 * installerMenusPartagesCampManagerV4
 *
 * Cette fonction :
 * - supprime uniquement les anciens déclencheurs de menus V4 ;
 * - ne touche pas au déclencheur de synchronisation V4 ;
 * - ne touche pas aux déclencheurs V3 ;
 * - installe un seul déclencheur "À l'ouverture".
 */
function installerMenusPartagesCampManagerV4() {
  const classeur =
    SpreadsheetApp
      .getActiveSpreadsheet();

  /*
   * NETTOYAGE DÉFINITIF DES ANCIENS MENUS
   * --------------------------------------
   * Plusieurs versions V4 ont installé leur propre déclencheur
   * « À l'ouverture ». C'est ce qui peut recréer l'ancien menu
   * « ⚙️ Admin V4 » même si le fichier 97 actuel ne le demande plus.
   *
   * CampManager ne doit désormais conserver qu'UN SEUL déclencheur
   * installable À L'OUVERTURE : construireMenusCampManagerV4.
   *
   * On ne touche PAS aux déclencheurs horaires, notamment la
   * synchronisation automatique V4 toutes les minutes.
   */
  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(
        declencheur
      ) {
        try {
          if (
            declencheur.getEventType() ===
              ScriptApp.EventType.ON_OPEN
          ) {
            ScriptApp.deleteTrigger(
              declencheur
            );
          }
        } catch (
          erreur
        ) {
          console.log(
            "Déclencheur d'ouverture non supprimé : " +
              String(
                erreur && erreur.message
                  ? erreur.message
                  : erreur
              )
          );
        }
      }
    );

  /*
   * On recrée ensuite le SEUL déclencheur d'ouverture autorisé.
   */
  ScriptApp
    .newTrigger(
      "construireMenusCampManagerV4"
    )
    .forSpreadsheet(
      classeur
    )
    .onOpen()
    .create();

  construireMenusCampManagerV4();

  classeur.toast(
    "Menus nettoyés : CampManager + Accès V4 uniquement après réouverture.",
    "✅ Menus V4",
    8
  );
}


/**
 * ============================================================
 * OUVRIR CAMP MANAGER V4
 * ============================================================
 *
 * Affiche une petite fenêtre avec un bouton ouvrant la V4
 * dans un nouvel onglet.
 */
function ouvrirCapfunMenageMobile() {
  verifierUrlCapfunMenageMobile_();

  const url =
    echapperHtmlMenu_(
      construireUrlCampManagerV4_()
    );

  const contenuHtml =
    `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <base target="_blank">
          <meta charset="UTF-8">

          <style>
            body {
              margin: 0;
              padding: 26px;
              font-family: Arial, sans-serif;
              text-align: center;
              color: #17202a;
              background: #f3f5f8;
            }

            h2 {
              margin: 0 0 12px;
              color: #17365d;
            }

            p {
              margin: 0 0 22px;
              line-height: 1.5;
            }

            a {
              display: block;
              padding: 16px 20px;
              border-radius: 12px;
              color: #ffffff;
              background: #17365d;
              font-size: 17px;
              font-weight: bold;
              text-decoration: none;
            }

            .info {
              margin-top: 14px;
              color: #66717d;
              font-size: 12px;
              line-height: 1.4;
            }
          </style>
        </head>

        <body>
          <h2>📱 CampManager V4</h2>

          <p>
            Cliquez sur le bouton pour ouvrir l’application.
          </p>

          <a
            href="${url}"
            onclick="google.script.host.close();"
          >
            Ouvrir CampManager V4
          </a>

          <div class="info">
            Camping : <strong>${echapperHtmlMenu_(obtenirCodeCampingPourMenuV4_())}</strong><br>
            Connexion sécurisée par prénom + code PIN.
          </div>
        </body>
      </html>
    `;

  const fenetre =
    HtmlService
      .createHtmlOutput(
        contenuHtml
      )
      .setWidth(
        390
      )
      .setHeight(
        250
      );

  SpreadsheetApp
    .getUi()
    .showModalDialog(
      fenetre,
      "CampManager V4"
    );
}


/**
 * ============================================================
 * AFFICHER / COPIER LE LIEN V4
 * ============================================================
 */
function afficherLienCapfunMenageMobile() {
  verifierUrlCapfunMenageMobile_();

  const url =
    echapperHtmlMenu_(
      construireUrlCampManagerV4_()
    );

  const contenuHtml =
    `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <base target="_top">
          <meta charset="UTF-8">

          <style>
            body {
              margin: 0;
              padding: 22px;
              font-family: Arial, sans-serif;
              color: #17202a;
              background: #f3f5f8;
            }

            h2 {
              margin: 0 0 14px;
              color: #17365d;
              text-align: center;
            }

            p {
              line-height: 1.45;
            }

            input {
              width: 100%;
              padding: 12px;
              border: 1px solid #cfd8dc;
              border-radius: 9px;
              box-sizing: border-box;
              background: #ffffff;
              color: #17202a;
            }

            button {
              width: 100%;
              margin-top: 14px;
              padding: 14px;
              border: 0;
              border-radius: 10px;
              color: #ffffff;
              background: #17365d;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
            }

            #confirmation {
              min-height: 20px;
              margin-top: 12px;
              color: #2e7d32;
              font-weight: bold;
              text-align: center;
            }

            .info {
              margin-top: 14px;
              padding: 11px;
              border-radius: 9px;
              background: #eaf6ec;
              color: #257b36;
              font-size: 12px;
              line-height: 1.4;
            }
          </style>
        </head>

        <body>
          <h2>🔗 Lien CampManager V4</h2>

          <p>
            Copiez ce lien pour l’envoyer par WhatsApp,
            SMS ou courriel.
          </p>

          <input
            id="lien"
            type="text"
            value="${url}"
            readonly
          >

          <button
            type="button"
            onclick="copierLien()"
          >
            📋 Copier le lien
          </button>

          <div id="confirmation"></div>

          <div class="info">
            Camping : <strong>${echapperHtmlMenu_(obtenirCodeCampingPourMenuV4_())}</strong><br><br>
            Pour une première connexion, le responsable doit
            d'abord générer le code d'activation dans
            « 🔐 Accès V4 ».
          </div>

          <script>
            function copierLien() {
              const champ =
                document.getElementById("lien");

              champ.focus();
              champ.select();
              champ.setSelectionRange(
                0,
                champ.value.length
              );

              const confirmation =
                document.getElementById(
                  "confirmation"
                );

              if (
                navigator.clipboard &&
                window.isSecureContext
              ) {
                navigator.clipboard
                  .writeText(
                    champ.value
                  )
                  .then(
                    function() {
                      confirmation.textContent =
                        "✅ Lien copié.";
                    }
                  )
                  .catch(
                    function() {
                      copierAncienneMethode();
                    }
                  );

              } else {
                copierAncienneMethode();
              }
            }

            function copierAncienneMethode() {
              const champ =
                document.getElementById(
                  "lien"
                );

              champ.focus();
              champ.select();

              const reussite =
                document.execCommand(
                  "copy"
                );

              document
                .getElementById(
                  "confirmation"
                )
                .textContent =
                  reussite
                    ? "✅ Lien copié."
                    : "Sélectionnez le lien et copiez-le manuellement.";
            }
          </script>
        </body>
      </html>
    `;

  const fenetre =
    HtmlService
      .createHtmlOutput(
        contenuHtml
      )
      .setWidth(
        530
      )
      .setHeight(
        380
      );

  SpreadsheetApp
    .getUi()
    .showModalDialog(
      fenetre,
      "Lien de CampManager V4"
    );
}


/**
 * ============================================================
 * QR CODE CAMP MANAGER V4
 * ============================================================
 */
function afficherQrCodeCapfunMenageMobile() {
  verifierUrlCapfunMenageMobile_();

  const urlEncodee =
    encodeURIComponent(
      construireUrlCampManagerV4_()
    );

  const urlQrCode =
    "https://quickchart.io/qr" +
    "?text=" +
    urlEncodee +
    "&size=300" +
    "&margin=2" +
    "&ecLevel=H" +
    "&dark=17365d" +
    "&light=ffffff";

  const urlApplication =
    echapperHtmlMenu_(
      construireUrlCampManagerV4_()
    );

  const contenuHtml =
    `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <base target="_top">
          <meta charset="UTF-8">

          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              color: #17202a;
              background: #ffffff;
              text-align: center;
            }

            h2 {
              margin: 0 0 10px;
              color: #17365d;
            }

            .qr-container {
              min-height: 310px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 14px 0;
            }

            .qr-container img {
              display: block;
              width: 300px;
              max-width: 100%;
              height: 300px;
              border: 8px solid #ffffff;
              box-shadow: 0 3px 14px rgba(0, 0, 0, 0.15);
            }

            .instructions {
              margin-top: 14px;
              padding: 14px;
              border-radius: 10px;
              background: #f3f5f8;
              line-height: 1.5;
              text-align: left;
            }

            .activation {
              margin-top: 12px;
              padding: 12px;
              border-radius: 10px;
              background: #eaf6ec;
              color: #257b36;
              line-height: 1.45;
              text-align: left;
            }

            .lien-secours {
              display: inline-block;
              margin-top: 14px;
              color: #17365d;
              font-weight: bold;
            }

            strong {
              color: #17365d;
            }
          </style>
        </head>

        <body>
          <h2>📱 CampManager V4</h2>

          <p>
            Scannez ce QR Code avec l’appareil photo du téléphone.<br>
            <strong>${echapperHtmlMenu_(obtenirCodeCampingPourMenuV4_())}</strong>
          </p>

          <div class="qr-container">
            <img
              src="${urlQrCode}"
              alt="QR Code CampManager V4"
            >
          </div>

          <a
            class="lien-secours"
            href="${urlApplication}"
            target="_blank"
          >
            Ouvrir directement CampManager V4
          </a>

          <div class="activation">
            <strong>Première connexion :</strong><br>
            le responsable génère d'abord le code temporaire
            dans le menu « 🔐 Accès V4 ».
            La personne choisit ensuite elle-même son PIN.
          </div>

          <div class="instructions">
            <strong>Android :</strong>
            ouvrez le lien dans Chrome, puis choisissez
            « Ajouter à l’écran d’accueil ».
            <br><br>

            <strong>iPhone :</strong>
            ouvrez le lien dans Safari, touchez
            « Partager », puis « Sur l’écran d’accueil ».
          </div>
        </body>
      </html>
    `;

  const fenetre =
    HtmlService
      .createHtmlOutput(
        contenuHtml
      )
      .setWidth(
        450
      )
      .setHeight(
        790
      );

  SpreadsheetApp
    .getUi()
    .showModalDialog(
      fenetre,
      "QR Code — CampManager V4"
    );
}


/**
 * ============================================================
 * VÉRIFICATION URL APPLICATION
 * ============================================================
 */
function verifierUrlCapfunMenageMobile_() {
  const url =
    String(
      construireUrlCampManagerV4_() ||
      ""
    ).trim();

  if (
    url === "" ||
    url ===
      "COLLER_ICI_URL_APPLICATION"
  ) {
    SpreadsheetApp
      .getUi()
      .alert(
        "📱 CampManager V4",
        "L’adresse publique GitHub Pages de CampManager V4 " +          "n’a pas encore été renseignée.",
        SpreadsheetApp
          .getUi()
          .ButtonSet
          .OK
      );

    throw new Error(
      "URL de CampManager V4 absente."
    );
  }
}


/**
 * ============================================================
 * ÉCHAPPEMENT HTML
 * ============================================================
 */
function echapperHtmlMenu_(
  valeur
) {
  return String(
    valeur ||
    ""
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


/**
 * ============================================================
 * EFFACER PERSONNEL + GOUVERNANTES
 * ============================================================
 */
function menuEffacerPersonnel() {
  const ui =
    SpreadsheetApp.getUi();

  const confirmation =
    ui.alert(
      "👥 Effacer le personnel",
      "Toutes les affectations de personnel ET de gouvernantes seront supprimées " +
        "dans Réception et Ménage.\n\n" +
        "Les états et les priorités des logements seront conservés.\n\n" +
        "Continuer ?",
      ui.ButtonSet.YES_NO
    );

  if (
    confirmation !==
      ui.Button.YES
  ) {
    return;
  }

  effacerPersonnelReceptionEtMenage_();

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      "Personnel et gouvernantes ont été effacés.",
      "✅ Personnel",
      5
    );
}


/**
 * Efface les affectations dans Réception,
 * puis reconstruit Ménage.
 */
function effacerPersonnelReceptionEtMenage_() {
  const classeur =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  const feuilleMenage =
    classeur.getSheetByName(
      FEUILLES.MENAGE
    );

  if (!feuilleReception) {
    throw new Error(
      "La feuille Réception est introuvable."
    );
  }

  const nombreLignesReception =
    feuilleReception.getMaxRows() -
    LIGNES.DEBUT +
    1;

  if (
    nombreLignesReception >
      0
  ) {
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.PERSONNEL,
        nombreLignesReception,
        1
      )
      .clearContent();

    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.GOUVERNANTE,
        nombreLignesReception,
        1
      )
      .clearContent();
  }

  /*
   * Effacement direct dans Ménage pour obtenir
   * un résultat visible immédiatement.
   */
  if (feuilleMenage) {
    const nombreLignesMenage =
      feuilleMenage.getMaxRows() -
      LIGNES.DEBUT +
      1;

    if (
      nombreLignesMenage >
        0
    ) {
      feuilleMenage
        .getRange(
          LIGNES.DEBUT,
          COLONNES_MENAGE.PERSONNEL,
          nombreLignesMenage,
          1
        )
        .clearContent();
    }
  }

  /*
   * Reconstruction complète de la feuille Ménage.
   */
  if (
    typeof mettreAJourMenage ===
      "function"
  ) {
    mettreAJourMenage(
      false
    );
  }

  SpreadsheetApp.flush();
}


/**
 * ============================================================
 * ACTIONS GROUPÉES — DATES ISSUES DE BASE — 07/09/2026
 * ============================================================
 *
 * But :
 * permettre un fonctionnement rapide pendant les tests, sans
 * modifier manuellement 100 logements un par un.
 *
 * Sécurités :
 * - mode Aujourd'hui : uniquement la date du jour ;
 * - mode Date au choix : n'importe quelle date passée ou future ;
 * - mode Sélection : uniquement les lignes réellement sélectionnées ;
 * - uniquement l'état attendu (Occupé ou Parti) ;
 * - les autres dates ne sont pas touchées par une action globale ;
 * - aucune reconstruction globale de Réception ;
 * - Personnel / Gouvernante sont conservés ;
 * - Ménage est recalculé une seule fois à la fin ;
 * - confirmation avant toute action massive.
 */


function passerTousDepartsAujourdhuiOccupeVersParti() {
  return executerTransitionGroupeeDepartsReception_(
    ETAT_RECEPTION.OCCUPE,
    ETAT_RECEPTION.PARTI,
    false,
    new Date()
  );
}


function passerTousDepartsAujourdhuiPartiVersPret() {
  return executerTransitionGroupeeDepartsReception_(
    ETAT_RECEPTION.PARTI,
    ETAT_RECEPTION.PRET,
    false,
    new Date()
  );
}


/**
 * Demande une date, puis traite TOUS les logements de cette date.
 */
function passerDepartsDateChoisieOccupeVersParti() {
  const dateChoisie =
    demanderDateActionGroupeeReception_(
      "Occupé → Parti"
    );

  if (!dateChoisie) {
    return;
  }

  return executerTransitionGroupeeDepartsReception_(
    ETAT_RECEPTION.OCCUPE,
    ETAT_RECEPTION.PARTI,
    false,
    dateChoisie
  );
}


function passerDepartsDateChoisiePartiVersPret() {
  const dateChoisie =
    demanderDateActionGroupeeReception_(
      "Parti → Prêt"
    );

  if (!dateChoisie) {
    return;
  }

  return executerTransitionGroupeeDepartsReception_(
    ETAT_RECEPTION.PARTI,
    ETAT_RECEPTION.PRET,
    false,
    dateChoisie
  );
}


/**
 * En mode SÉLECTION, la date n'est volontairement pas imposée.
 *
 * Tu peux donc sélectionner :
 * - des départs d'hier ;
 * - des départs plus anciens ;
 * - plusieurs dates à la fois.
 *
 * Seules les lignes ayant l'état attendu sont modifiées.
 */
function passerSelectionOccupeVersParti() {
  return executerTransitionGroupeeDepartsReception_(
    ETAT_RECEPTION.OCCUPE,
    ETAT_RECEPTION.PARTI,
    true,
    null
  );
}


function passerSelectionPartiVersPret() {
  return executerTransitionGroupeeDepartsReception_(
    ETAT_RECEPTION.PARTI,
    ETAT_RECEPTION.PRET,
    true,
    null
  );
}


/**
 * Demande une date au format JJ/MM/AAAA.
 */
function demanderDateActionGroupeeReception_(
  libelleAction
) {
  const ui =
    SpreadsheetApp.getUi();

  const reponse =
    ui.prompt(
      "⚡ Actions groupées — " +
        libelleAction,
      "Indique la date de départ à traiter au format JJ/MM/AAAA.\n\n" +
        "Exemple : 06/09/2026",
      ui.ButtonSet.OK_CANCEL
    );

  if (
    reponse.getSelectedButton() !==
      ui.Button.OK
  ) {
    return null;
  }

  const date =
    convertirDateActionGroupeeReception_(
      reponse.getResponseText()
    );

  if (!date) {
    ui.alert(
      "Date invalide",
      "Utilise le format JJ/MM/AAAA, par exemple 06/09/2026.",
      ui.ButtonSet.OK
    );

    return null;
  }

  return date;
}


/**
 * Moteur commun des actions groupées.
 *
 * @param {string} etatAvant
 * @param {string} etatApres
 * @param {boolean} uniquementSelection
 */
function executerTransitionGroupeeDepartsReception_(
  etatAvant,
  etatApres,
  uniquementSelection,
  dateCible
) {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  const feuilleBase =
    classeur.getSheetByName(
      FEUILLES.BASE
    );

  if (!feuilleReception) {
    throw new Error(
      "La feuille Réception est introuvable."
    );
  }

  if (
    !uniquementSelection &&
    !feuilleBase
  ) {
    throw new Error(
      "La feuille Base est introuvable."
    );
  }

  const ui =
    SpreadsheetApp.getUi();

  const debut =
    LIGNES.DEBUT;

  const derniereLigneReception =
    feuilleReception.getLastRow();

  if (
    derniereLigneReception <
      debut
  ) {
    classeur.toast(
      "Aucun logement dans Réception.",
      "CampManager",
      5
    );

    return {
      modifies: 0
    };
  }

  /*
   * ==========================================================
   * MODE SÉLECTION
   * ==========================================================
   *
   * La sélection agit uniquement sur les lignes choisies dans
   * Réception, quelle que soit leur date.
   *
   * C'est volontaire : cela permet de corriger rapidement
   * quelques logements anciens sans avoir besoin d'une date.
   */
  const lignesSelectionnees =
    uniquementSelection
      ? obtenirLignesSelectionneesReception_(
          feuilleReception
        )
      : null;

  if (
    uniquementSelection &&
    Object.keys(
      lignesSelectionnees
    ).length ===
      0
  ) {
    ui.alert(
      "Actions groupées",
      "Sélectionne d'abord une ou plusieurs lignes dans la feuille Réception.",
      ui.ButtonSet.OK
    );

    return {
      modifies: 0
    };
  }

  /*
   * ==========================================================
   * MODE DATE — SOURCE DE VÉRITÉ = BASE
   * ==========================================================
   *
   * IMPORTANT :
   * On ne cherche PLUS la date de départ dans Réception.
   *
   * Après un changement de journée, une validation ménage ou
   * certaines opérations de nettoyage, la colonne Départ de
   * Réception peut être vide alors que la réservation historique
   * existe toujours dans Base.
   *
   * Base contient la réservation et reste donc la référence pour
   * savoir quels logements avaient un départ à la date choisie.
   */
  const dateFiltre =
    uniquementSelection
      ? null
      : convertirDateActionGroupeeReception_(
          dateCible || new Date()
        );

  let logementsDepartBase = {};
  let nombreReservationsBase = 0;

  if (!uniquementSelection) {
    const resultatBase =
      rechercherLogementsDepartBasePourDate_(
        feuilleBase,
        dateFiltre
      );

    logementsDepartBase =
      resultatBase.logements;

    nombreReservationsBase =
      resultatBase.nombreReservations;
  }

  const nombreLignesReception =
    derniereLigneReception -
    debut +
    1;

  const donneesReception =
    feuilleReception
      .getRange(
        debut,
        1,
        nombreLignesReception,
        COLONNES_RECEPTION.NOMBRE_COLONNES
      )
      .getValues();

  const cibles = [];

  donneesReception.forEach(
    function(
      ligne,
      index
    ) {
      const numeroLigne =
        debut +
        index;

      if (
        uniquementSelection &&
        !lignesSelectionnees[
          numeroLigne
        ]
      ) {
        return;
      }

      const logement =
        normaliserLogementActionGroupeeReception_(
          ligne[
            COLONNES_RECEPTION.LOGEMENT - 1
          ]
        );

      if (!logement) {
        return;
      }

      /*
       * Pour une action par DATE :
       * le logement doit faire partie des départs trouvés dans Base.
       *
       * Pour une action par SÉLECTION :
       * aucune date n'est imposée.
       */
      if (
        !uniquementSelection &&
        !logementsDepartBase[
          logement
        ]
      ) {
        return;
      }

      const etat =
        String(
          ligne[
            COLONNES_RECEPTION.ETAT - 1
          ] || ""
        ).trim();

      if (
        etat !==
          etatAvant
      ) {
        return;
      }

      cibles.push({
        ligne:
          numeroLigne,
        logement:
          logement,
        arriveeSuivante:
          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ]
      });
    }
  );

  if (
    cibles.length ===
      0
  ) {
    if (uniquementSelection) {
      classeur.toast(
        "Aucune ligne sélectionnée n'est en état « " +
          etatAvant +
          " ».",
        "CampManager",
        6
      );

    } else {
      const dateTexte =
        Utilities.formatDate(
          dateFiltre,
          Session.getScriptTimeZone(),
          "dd/MM/yyyy"
        );

      const nombreLogementsBase =
        Object.keys(
          logementsDepartBase
        ).length;

      ui.alert(
        "⚡ Actions groupées",
        "Base contient " +
          nombreReservationsBase +
          " réservation(s), soit " +
          nombreLogementsBase +
          " logement(s) avec un départ le " +
          dateTexte +
          ".\n\n" +
          "Mais aucun de ces logements n'est actuellement en état « " +
          etatAvant +
          " » dans Réception.",
        ui.ButtonSet.OK
      );
    }

    return {
      modifies: 0,
      reservationsBase:
        nombreReservationsBase,
      logementsBase:
        Object.keys(
          logementsDepartBase
        ).length
    };
  }

  let texteConfirmation = "";

  if (uniquementSelection) {
    texteConfirmation =
      cibles.length +
      " logement(s) sélectionné(s) vont passer de « " +
      etatAvant +
      " » à « " +
      etatApres +
      " ».\n\n" +
      "La date n'est pas prise en compte en mode sélection.";

  } else {
    const dateTexte =
      Utilities.formatDate(
        dateFiltre,
        Session.getScriptTimeZone(),
        "dd/MM/yyyy"
      );

    const nombreLogementsBase =
      Object.keys(
        logementsDepartBase
      ).length;

    texteConfirmation =
      "Base : " +
      nombreReservationsBase +
      " réservation(s), soit " +
      nombreLogementsBase +
      " logement(s) avec un départ le " +
      dateTexte +
      ".\n\n" +
      cibles.length +
      " de ces logements sont actuellement « " +
      etatAvant +
      " » et vont passer sur « " +
      etatApres +
      " ».\n\n" +
      "Les logements d'une autre date ne seront pas touchés.";
  }

  const confirmation =
    ui.alert(
      "⚡ Actions groupées",
      texteConfirmation +
        "\n\nConfirmer ?",
      ui.ButtonSet.YES_NO
    );

  if (
    confirmation !==
      ui.Button.YES
  ) {
    return {
      modifies: 0,
      annule: true
    };
  }

  const verrou =
    LockService.getScriptLock();

  verrou.waitLock(
    30000
  );

  try {
    cibles.forEach(
      function(cible) {
        /*
         * OCCUPÉ -> PARTI
         */
        if (
          etatAvant ===
            ETAT_RECEPTION.OCCUPE &&
          etatApres ===
            ETAT_RECEPTION.PARTI
        ) {
          feuilleReception
            .getRange(
              cible.ligne,
              COLONNES_RECEPTION.ETAT
            )
            .setValue(
              ETAT_RECEPTION.PARTI
            );

          const arriveeSuivante =
            convertirDateActionGroupeeReception_(
              cible.arriveeSuivante
            );

          /*
           * Rouge uniquement si l'arrivée suivante est aujourd'hui.
           * Sinon bleu.
           */
          const aujourdHui =
            new Date();

          aujourdHui.setHours(
            0,
            0,
            0,
            0
          );

          const priorite =
            arriveeSuivante &&
            sontMemeJourActionGroupeeReception_(
              arriveeSuivante,
              aujourdHui
            )
              ? PRIORITE.ROUGE
              : PRIORITE.BLEU;

          feuilleReception
            .getRange(
              cible.ligne,
              COLONNES_RECEPTION.PRIORITE
            )
            .setValue(
              priorite
            );

          return;
        }

        /*
         * PARTI -> PRÊT
         *
         * Aucun recalcul global de Réception.
         */
        if (
          etatAvant ===
            ETAT_RECEPTION.PARTI &&
          etatApres ===
            ETAT_RECEPTION.PRET
        ) {
          feuilleReception
            .getRange(
              cible.ligne,
              COLONNES_RECEPTION.ETAT
            )
            .setValue(
              ETAT_RECEPTION.PRET
            );

          feuilleReception
            .getRange(
              cible.ligne,
              COLONNES_RECEPTION.PRIORITE
            )
            .setValue(
              PRIORITE.BLANC
            );

          feuilleReception
            .getRange(
              cible.ligne,
              COLONNES_RECEPTION.CLIENT_ACTUEL
            )
            .clearContent();

          feuilleReception
            .getRange(
              cible.ligne,
              COLONNES_RECEPTION.DEPART
            )
            .clearContent();
        }
      }
    );

    SpreadsheetApp.flush();

    /*
     * Une seule reconstruction de Ménage à la fin.
     */
    if (
      typeof mettreAJourMenage ===
        "function"
    ) {
      mettreAJourMenage(
        false
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

    SpreadsheetApp.flush();

    classeur.toast(
      cibles.length +
        " logement(s) : " +
        etatAvant +
        " → " +
        etatApres +
        ".",
      "✅ Actions groupées",
      7
    );

    return {
      modifies:
        cibles.length,
      reservationsBase:
        nombreReservationsBase,
      logementsBase:
        Object.keys(
          logementsDepartBase
        ).length,
      etatAvant:
        etatAvant,
      etatApres:
        etatApres
    };

  } finally {
    verrou.releaseLock();
  }
}


/**
 * Recherche dans BASE les logements dont une réservation ACTIVE
 * a une date de départ égale à la date demandée.
 *
 * Retour :
 * {
 *   logements: { "101": true, "205": true },
 *   nombreReservations: 2
 * }
 */
function rechercherLogementsDepartBasePourDate_(
  feuilleBase,
  dateCible
) {
  const resultat = {
    logements: {},
    nombreReservations: 0
  };

  if (
    !feuilleBase ||
    !dateCible
  ) {
    return resultat;
  }

  const derniereLigne =
    feuilleBase.getLastRow();

  if (
    derniereLigne <
      LIGNES.DEBUT
  ) {
    return resultat;
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const donnees =
    feuilleBase
      .getRange(
        LIGNES.DEBUT,
        1,
        nombreLignes,
        COLONNES_BASE.NOMBRE_COLONNES
      )
      .getValues();

  donnees.forEach(
    function(ligne) {
      const etatReservation =
        String(
          ligne[
            COLONNES_BASE.ETAT_RESERVATION - 1
          ] || ""
        ).trim();

      if (
        typeof ETAT_RESERVATION !==
          "undefined" &&
        ETAT_RESERVATION.ACTIVE &&
        etatReservation !==
          ETAT_RESERVATION.ACTIVE
      ) {
        return;
      }

      /*
       * Si ETAT_RESERVATION n'est pas disponible pour une raison
       * quelconque, on accepte uniquement les libellés vides/Active.
       */
      if (
        typeof ETAT_RESERVATION ===
          "undefined" &&
        etatReservation !== "" &&
        etatReservation.toLocaleLowerCase(
          "fr"
        ) !== "active"
      ) {
        return;
      }

      const depart =
        convertirDateActionGroupeeReception_(
          ligne[
            COLONNES_BASE.DATE_DEPART - 1
          ]
        );

      if (
        !depart ||
        !sontMemeJourActionGroupeeReception_(
          depart,
          dateCible
        )
      ) {
        return;
      }

      const logement =
        normaliserLogementActionGroupeeReception_(
          ligne[
            COLONNES_BASE.LOGEMENT - 1
          ]
        );

      if (!logement) {
        return;
      }

      resultat.nombreReservations++;

      resultat.logements[
        logement
      ] = true;
    }
  );

  return resultat;
}


/**
 * Normalise le numéro/nom de logement afin que Base et Réception
 * soient comparés de manière fiable.
 */
function normaliserLogementActionGroupeeReception_(
  valeur
) {
  return String(
    valeur === null ||
    typeof valeur ===
      "undefined"
      ? ""
      : valeur
  )
    .trim()
    .replace(
      /\s+/g,
      " "
    )
    .toUpperCase();
}

function obtenirLignesSelectionneesReception_(
  feuilleReception
) {
  const resultat = {};

  if (
    SpreadsheetApp
      .getActiveSheet()
      .getName() !==
        feuilleReception.getName()
  ) {
    return resultat;
  }

  let plages = [];

  try {
    const liste =
      SpreadsheetApp.getActiveRangeList();

    if (liste) {
      plages =
        liste.getRanges();
    }
  } catch (
    erreur
  ) {
    plages = [];
  }

  if (
    plages.length ===
      0
  ) {
    const plage =
      SpreadsheetApp.getActiveRange();

    if (plage) {
      plages = [
        plage
      ];
    }
  }

  plages.forEach(
    function(plage) {
      const premiere =
        Math.max(
          plage.getRow(),
          LIGNES.DEBUT
        );

      const derniere =
        plage.getLastRow();

      for (
        let ligne =
          premiere;
        ligne <=
          derniere;
        ligne++
      ) {
        resultat[
          ligne
        ] = true;
      }
    }
  );

  return resultat;
}


function convertirDateActionGroupeeReception_(
  valeur
) {
  if (
    valeur instanceof Date &&
    !isNaN(
      valeur.getTime()
    )
  ) {
    const date =
      new Date(
        valeur
      );

    date.setHours(
      0,
      0,
      0,
      0
    );

    return date;
  }

  const texte =
    String(
      valeur || ""
    ).trim();

  const match =
    texte.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    );

  if (!match) {
    return null;
  }

  const date =
    new Date(
      Number(
        match[3]
      ),
      Number(
        match[2]
      ) - 1,
      Number(
        match[1]
      )
    );

  date.setHours(
    0,
    0,
    0,
    0
  );

  return isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function sontMemeJourActionGroupeeReception_(
  dateA,
  dateB
) {
  const a =
    convertirDateActionGroupeeReception_(
      dateA
    );

  const b =
    convertirDateActionGroupeeReception_(
      dateB
    );

  if (
    !a ||
    !b
  ) {
    return false;
  }

  return (
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate()
  );
}


/**
 * ============================================================
 * BASCULE QUOTIDIENNE DES CLIENTS — 06/09/2026
 * ============================================================
 *
 * Problème corrigé :
 * depuis la sécurisation V4, le bouton "Actualiser le logiciel"
 * et la synchro automatique ne reconstruisent volontairement plus
 * toute la feuille Réception.
 *
 * C'était nécessaire pour préserver :
 * - les états Parti ;
 * - les départs anticipés ;
 * - Personnel / Gouvernante ;
 * - les tris manuels.
 *
 * Mais cela empêchait le changement de journée :
 * un client arrivé AVANT aujourd'hui pouvait rester dans
 * "Client suivant" au lieu de passer dans "Client actuel".
 *
 * Cette fonction fait UNIQUEMENT la bascule calendaire.
 *
 * Elle ne réordonne aucune ligne et ne reconstruit pas Réception.
 * Elle travaille par numéro de logement, donc elle reste sûre
 * même si la feuille Réception est triée.
 */
function basculerClientsActuelsReceptionV4Securise_(
  afficherMessage
) {
  if (
    typeof afficherMessage ===
      "undefined"
  ) {
    afficherMessage =
      false;
  }

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleBase =
    classeur.getSheetByName(
      FEUILLES.BASE
    );

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  if (
    !feuilleBase ||
    !feuilleReception
  ) {
    throw new Error(
      "La feuille Base ou Réception est introuvable."
    );
  }

  const aujourdHui =
    supprimerHeureBasculeReceptionV4_(
      new Date()
    );

  const reservationsParLogement =
    lireReservationsBasculeReceptionV4_(
      feuilleBase
    );

  const derniereLigne =
    feuilleReception.getLastRow();

  if (
    derniereLigne <
      LIGNES.DEBUT
  ) {
    return {
      succes: true,
      bascules: 0,
      partisPreserves: 0
    };
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const plage =
    feuilleReception.getRange(
      LIGNES.DEBUT,
      1,
      nombreLignes,
      COLONNES_RECEPTION.NOMBRE_COLONNES
    );

  const donnees =
    plage.getValues();

  let bascules =
    0;

  let partisPreserves =
    0;

  donnees.forEach(
    function(ligne) {
      const logement =
        normaliserLogementBasculeReceptionV4_(
          ligne[
            COLONNES_RECEPTION.LOGEMENT - 1
          ]
        );

      if (!logement) {
        return;
      }

      const etat =
        String(
          ligne[
            COLONNES_RECEPTION.ETAT - 1
          ] || ""
        ).trim();

      /*
       * Indisponible reste totalement sous contrôle manuel.
       */
      if (
        etat ===
          ETAT_RECEPTION.INDISPONIBLE
      ) {
        return;
      }

      const reservations =
        reservationsParLogement[
          logement
        ] || [];

      const situation =
        determinerSituationBasculeReceptionV4_(
          reservations,
          aujourdHui
        );

      const clientPresent =
        situation.clientPresent;

      /*
       * V4.2.7 — MÉMOIRE DU DÉPART RÉEL
       *
       * La colonne technique "Départ réel" est renseignée par 90_OnEdit
       * au moment précis où la Réception passe un logement sur Parti.
       *
       * C'est indispensable pour distinguer :
       * - un client encore réellement présent ;
       * - un client parti plus tôt que sa date de départ théorique.
       */
      const colonneDepartReel =
        (
          typeof COLONNES_RECEPTION.DEPART_REEL !==
            "undefined" &&
          COLONNES_RECEPTION.DEPART_REEL
        )
          ? COLONNES_RECEPTION.DEPART_REEL
          : null;

      const departReel =
        colonneDepartReel
          ? convertirDateBasculeReceptionV4_(
              ligne[
                colonneDepartReel - 1
              ]
            )
          : null;

      /*
       * Retrouve la réservation qui était en cours au moment
       * du départ réellement enregistré.
       *
       * Cela permet de continuer à identifier le client sortant
       * même lorsqu'il est parti avant la date prévue.
       */
      const reservationSortante =
        departReel
          ? (
              reservations.find(
                function(reservation) {
                  return (
                    reservation.dateArrivee.getTime() <=
                      departReel.getTime() &&
                    reservation.dateDepart.getTime() >=
                      departReel.getTime()
                  );
                }
              ) || null
            )
          : null;

      const departReelConcerneClientPresent =
        !!(
          departReel &&
          clientPresent &&
          clientPresent.dateArrivee.getTime() <=
            departReel.getTime() &&
          clientPresent.dateDepart.getTime() >=
            departReel.getTime()
        );

      /*
       * PARTI est sacré.
       *
       * V4.2.7 :
       * - l'état Parti reste protégé ;
       * - le nom du client sortant ET sa date de départ théorique
       *   restent visibles tant que le ménage n'est pas terminé ;
       * - un départ anticipé ne peut jamais redevenir Occupé.
       */
      if (
        etat ===
          ETAT_RECEPTION.PARTI
      ) {
        partisPreserves++;

        const clientSortant =
          reservationSortante ||
          clientPresent;

        if (
          clientSortant
        ) {
          ligne[
            COLONNES_RECEPTION.CLIENT_ACTUEL - 1
          ] =
            clientSortant.nomClient;

          ligne[
            COLONNES_RECEPTION.DEPART - 1
          ] =
            clientSortant.dateDepart;
        }

        let suivanteApresParti =
          null;

        const seuilSuivant =
          departReel
            ? departReel.getTime()
            : aujourdHui.getTime();

        reservations.some(
          function(reservation) {
            if (
              clientSortant &&
              reservation.id ===
                clientSortant.id
            ) {
              return false;
            }

            if (
              reservation.dateArrivee.getTime() >=
                seuilSuivant
            ) {
              suivanteApresParti =
                reservation;

              return true;
            }

            return false;
          }
        );

        if (
          suivanteApresParti
        ) {
          ligne[
            COLONNES_RECEPTION.CLIENT_SUIVANT - 1
          ] =
            suivanteApresParti.nomClient;

          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ] =
            suivanteApresParti.dateArrivee;

        } else {
          ligne[
            COLONNES_RECEPTION.CLIENT_SUIVANT - 1
          ] = "";

          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ] = "";
        }

        return;
      }

      /*
       * V4.2.7 — LOGEMENT DÉJÀ NETTOYÉ APRÈS UN DÉPART
       *
       * On protège Prêt / Libre lorsque :
       * - le départ théorique est aujourd'hui ; OU
       * - un "Départ réel" a été enregistré et correspond bien
       *   à la réservation encore vue comme active dans Base.
       *
       * Le second cas couvre précisément les départs anticipés.
       *
       * Le marqueur n'est PAS appliqué au client suivant :
       * sa date d'arrivée est postérieure au Départ réel.
       */
      if (
        clientPresent &&
        (
          etat ===
            ETAT_RECEPTION.PRET ||
          etat ===
            ETAT_RECEPTION.LIBRE
        ) &&
        String(
          ligne[
            COLONNES_RECEPTION.CLIENT_ACTUEL - 1
          ] || ""
        ).trim() === "" &&
        (
          sontMemeJourBasculeReceptionV4_(
            clientPresent.dateDepart,
            aujourdHui
          ) ||
          departReelConcerneClientPresent
        )
      ) {
        ligne[
          COLONNES_RECEPTION.CLIENT_ACTUEL - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.DEPART - 1
        ] = "";

        const suivanteApresNettoyage =
          situation.prochaineApresClient;

        if (
          suivanteApresNettoyage
        ) {
          ligne[
            COLONNES_RECEPTION.CLIENT_SUIVANT - 1
          ] =
            suivanteApresNettoyage.nomClient;

          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ] =
            suivanteApresNettoyage.dateArrivee;

        } else {
          ligne[
            COLONNES_RECEPTION.CLIENT_SUIVANT - 1
          ] = "";

          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ] = "";
        }

        /*
         * Prêt garde sa priorité blanche.
         * Libre n'a pas de priorité ménage.
         */
        ligne[
          COLONNES_RECEPTION.PRIORITE - 1
        ] =
          etat ===
            ETAT_RECEPTION.PRET
            ? PRIORITE.BLANC
            : "";

        return;
      }

      /*
       * Une réservation arrivée AVANT aujourd'hui et dont
       * le départ est aujourd'hui ou plus tard devient
       * automatiquement le client actuel.
       *
       * Ceci ne dépend PAS du fait qu'on ait pensé ou non
       * à sélectionner "Occupé" le jour de son arrivée.
       */
      if (
        clientPresent
      ) {
        /*
         * Si le marqueur Départ réel appartient à un ancien séjour,
         * on le vide avant de basculer le nouveau client sur Occupé.
         */
        if (
          colonneDepartReel &&
          departReel &&
          !departReelConcerneClientPresent
        ) {
          ligne[
            colonneDepartReel - 1
          ] = "";
        }

        const ancienClient =
          String(
            ligne[
              COLONNES_RECEPTION.CLIENT_ACTUEL - 1
            ] || ""
          ).trim();

        const ancienneDateDepart =
          ligne[
            COLONNES_RECEPTION.DEPART - 1
          ];

        ligne[
          COLONNES_RECEPTION.CLIENT_ACTUEL - 1
        ] =
          clientPresent.nomClient;

        ligne[
          COLONNES_RECEPTION.DEPART - 1
        ] =
          clientPresent.dateDepart;

        const suivante =
          situation.prochaineApresClient;

        if (
          suivante
        ) {
          ligne[
            COLONNES_RECEPTION.CLIENT_SUIVANT - 1
          ] =
            suivante.nomClient;

          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ] =
            suivante.dateArrivee;
        } else {
          ligne[
            COLONNES_RECEPTION.CLIENT_SUIVANT - 1
          ] = "";

          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ] = "";
        }

        /*
         * Si le logement était simplement Libre ou Prêt,
         * la date prouve désormais qu'un client est présent :
         * il devient Occupé.
         *
         * À recontrôler est conservé pour ne jamais supprimer
         * une tâche de contrôle non terminée.
         */
        if (
          etat !==
            ETAT_RECEPTION.A_RECONTROLER
        ) {
          ligne[
            COLONNES_RECEPTION.ETAT - 1
          ] =
            ETAT_RECEPTION.OCCUPE;
        }

        /*
         * Priorité du départ :
         * rouge si départ + arrivée le même jour,
         * bleu si départ uniquement.
         */
        const departAujourdhui =
          sontMemeJourBasculeReceptionV4_(
            clientPresent.dateDepart,
            aujourdHui
          );

        if (
          etat ===
            ETAT_RECEPTION.A_RECONTROLER
        ) {
          ligne[
            COLONNES_RECEPTION.PRIORITE - 1
          ] =
            PRIORITE.VIOLET;

        } else if (
          departAujourdhui
        ) {
          const arriveeMemeJour =
            suivante &&
            sontMemeJourBasculeReceptionV4_(
              suivante.dateArrivee,
              aujourdHui
            );

          ligne[
            COLONNES_RECEPTION.PRIORITE - 1
          ] =
            arriveeMemeJour
              ? PRIORITE.ROUGE
              : PRIORITE.BLEU;

        } else {
          ligne[
            COLONNES_RECEPTION.PRIORITE - 1
          ] = "";
        }

        if (
          ancienClient !==
            String(
              clientPresent.nomClient || ""
            ).trim() ||
          !sontMemeJourBasculeReceptionV4_(
            ancienneDateDepart,
            clientPresent.dateDepart
          )
        ) {
          bascules++;
        }

        return;
      }

      /*
       * Pas de client déjà arrivé :
       * on maintient l'arrivée du jour / future dans Client suivant.
       *
       * On ne force aucun état ici.
       */
      ligne[
        COLONNES_RECEPTION.CLIENT_ACTUEL - 1
      ] = "";

      ligne[
        COLONNES_RECEPTION.DEPART - 1
      ] = "";

      const suivante =
        situation.prochaineApresClient;

      if (
        suivante
      ) {
        ligne[
          COLONNES_RECEPTION.CLIENT_SUIVANT - 1
        ] =
          suivante.nomClient;

        ligne[
          COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
        ] =
          suivante.dateArrivee;
      } else {
        ligne[
          COLONNES_RECEPTION.CLIENT_SUIVANT - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
        ] = "";
      }
    }
  );

  /*
   * On réécrit les lignes COMPLÈTES à leur emplacement actuel.
   * Aucun tri ni changement d'ordre.
   */
  plage.setValues(
    donnees
  );

  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.DEPART,
      nombreLignes,
      1
    )
    .setNumberFormat(
      "dd/MM/yyyy"
    );

  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.ARRIVEE_SUIVANTE,
      nombreLignes,
      1
    )
    .setNumberFormat(
      "dd/MM/yyyy"
    );

  if (
    typeof appliquerCouleursReception ===
      "function"
  ) {
    appliquerCouleursReception(
      feuilleReception
    );
  }

  SpreadsheetApp.flush();

  if (
    afficherMessage
  ) {
    classeur.toast(
      bascules +
        " client(s) basculé(s) en Client actuel.",
      "✅ Réception",
      7
    );
  }

  return {
    succes: true,
    bascules: bascules,
    partisPreserves: partisPreserves
  };
}


/**
 * Lit les réservations actives de Base et les classe par logement.
 */
function lireReservationsBasculeReceptionV4_(
  feuilleBase
) {
  const resultat = {};

  const derniereLigne =
    feuilleBase.getLastRow();

  if (
    derniereLigne <
      LIGNES.DEBUT
  ) {
    return resultat;
  }

  const donnees =
    feuilleBase
      .getRange(
        LIGNES.DEBUT,
        1,
        derniereLigne -
          LIGNES.DEBUT +
          1,
        COLONNES_BASE.NOMBRE_COLONNES
      )
      .getValues();

  donnees.forEach(
    function(ligne) {
      const etatReservation =
        String(
          ligne[
            COLONNES_BASE.ETAT_RESERVATION - 1
          ] || ""
        ).trim();

      if (
        etatReservation !==
          ETAT_RESERVATION.ACTIVE
      ) {
        return;
      }

      const logement =
        normaliserLogementBasculeReceptionV4_(
          ligne[
            COLONNES_BASE.LOGEMENT - 1
          ]
        );

      const arrivee =
        convertirDateBasculeReceptionV4_(
          ligne[
            COLONNES_BASE.DATE_ARRIVEE - 1
          ]
        );

      const depart =
        convertirDateBasculeReceptionV4_(
          ligne[
            COLONNES_BASE.DATE_DEPART - 1
          ]
        );

      if (
        !logement ||
        !arrivee ||
        !depart
      ) {
        return;
      }

      if (
        !resultat[
          logement
        ]
      ) {
        resultat[
          logement
        ] = [];
      }

      resultat[
        logement
      ].push({
        id:
          String(
            ligne[
              COLONNES_BASE.NUMERO_RESERVATION - 1
            ] || ""
          ),
        nomClient:
          String(
            ligne[
              COLONNES_BASE.NOM_CLIENT - 1
            ] || ""
          ),
        dateArrivee:
          supprimerHeureBasculeReceptionV4_(
            arrivee
          ),
        dateDepart:
          supprimerHeureBasculeReceptionV4_(
            depart
          )
      });
    }
  );

  Object.keys(
    resultat
  ).forEach(
    function(logement) {
      resultat[
        logement
      ].sort(
        function(a, b) {
          const diff =
            a.dateArrivee.getTime() -
            b.dateArrivee.getTime();

          if (
            diff !== 0
          ) {
            return diff;
          }

          return (
            a.dateDepart.getTime() -
            b.dateDepart.getTime()
          );
        }
      );
    }
  );

  return resultat;
}


/**
 * Détermine le client réellement présent selon la DATE,
 * indépendamment de l'ancien état Réception.
 */
function determinerSituationBasculeReceptionV4_(
  reservations,
  aujourdHui
) {
  const t =
    aujourdHui.getTime();

  const clientPresent =
    reservations.find(
      function(reservation) {
        return (
          reservation.dateArrivee.getTime() <
            t &&
          reservation.dateDepart.getTime() >=
            t
        );
      }
    ) || null;

  let prochaineApresClient =
    null;

  reservations.some(
    function(reservation) {
      if (
        clientPresent &&
        reservation.id ===
          clientPresent.id
      ) {
        return false;
      }

      if (
        reservation.dateArrivee.getTime() >=
          t
      ) {
        prochaineApresClient =
          reservation;

        return true;
      }

      return false;
    }
  );

  return {
    clientPresent:      clientPresent,
    prochaineApresClient:
      prochaineApresClient
  };
}


function normaliserLogementBasculeReceptionV4_(
  valeur
) {
  return String(
    valeur === null ||
    typeof valeur ===
      "undefined"
      ? ""
      : valeur
  )
    .trim()
    .replace(
      /\s+/g,
      " "
    )
    .toUpperCase();
}


function convertirDateBasculeReceptionV4_(
  valeur
) {
  if (
    valeur instanceof Date &&
    !isNaN(
      valeur.getTime()
    )
  ) {
    return new Date(
      valeur.getFullYear(),
      valeur.getMonth(),
      valeur.getDate()
    );
  }

  const texte =
    String(
      valeur || ""
    ).trim();

  const match =
    texte.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    );

  if (
    !match
  ) {
    return null;
  }

  const date =
    new Date(
      Number(
        match[3]
      ),
      Number(
        match[2]
      ) - 1,
      Number(
        match[1]
      )
    );

  return isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function supprimerHeureBasculeReceptionV4_(
  date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}


function sontMemeJourBasculeReceptionV4_(
  a,
  b
) {
  const dateA =
    convertirDateBasculeReceptionV4_(
      a
    );

  const dateB =
    convertirDateBasculeReceptionV4_(
      b
    );

  if (
    !dateA ||
    !dateB
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


/**
 * ============================================================
 * DÉCLENCHEUR QUOTIDIEN
 * ============================================================
 *
 * À exécuter UNE SEULE FOIS :
 *
 * installerBasculeQuotidienneClientsReceptionV4
 *
 * Le déclencheur est prévu autour de 00:05.
 * Apps Script peut l'exécuter avec quelques minutes de décalage.
 */
function installerBasculeQuotidienneClientsReceptionV4() {
  const handler =
    "executerBasculeQuotidienneClientsReceptionV4";

  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        if (
          declencheur.getHandlerFunction() ===
            handler
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );

  ScriptApp
    .newTrigger(
      handler
    )
    .timeBased()
    .atHour(
      0
    )
    .nearMinute(
      5
    )
    .everyDays(
      1
    )
    .create();

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      "Bascule quotidienne installée autour de 00:05.",
      "✅ Réception",
      7
    );
}


function executerBasculeQuotidienneClientsReceptionV4() {
  const verrou =
    LockService.getScriptLock();

  verrou.waitLock(
    30000
  );

  try {
    basculerClientsActuelsReceptionV4Securise_(
      false
    );

    /*
     * La feuille Ménage est immédiatement recalculée,
     * puis le déclencheur V4 1 minute transmettra la situation
     * à Supabase sans reconstruire Réception.
     */
    if (
      typeof mettreAJourMenage ===
        "function"
    ) {
      mettreAJourMenage(
        false
      );
    }

    SpreadsheetApp.flush();

  } finally {
    verrou.releaseLock();
  }
}


/**
 * ============================================================
 * V4.2.3 — PRÉPARATION DES DONNÉES D'UN NOUVEL ÉTABLISSEMENT
 * ============================================================
 *
 * Le bouton « Actualiser le logiciel » reste SÉCURISÉ en production :
 * il ne reconstruit jamais globalement Réception lorsqu'elle contient
 * déjà des données.
 *
 * En revanche, sur une installation neuve :
 * - si Base est vide mais Import contient des réservations :
 *     Import -> Base ;
 * - si Réception est vide et des logements existent :
 *     Base/Logements -> Réception.
 *
 * Cela permet à un nouvel hôtel/camping de démarrer normalement sans
 * réintroduire le risque historique Parti -> Occupé.
 */


/**
 * Met à jour les deux colonnes techniques :
 * - I = Personnel disponible ;
 * - P = Gouvernantes disponibles.
 *
 * Source :
 * - G/H = Personnel + statut ;
 * - N/O = Gouvernantes + statut.
 *
 * Sont disponibles : Actif et Extra.
 */
function actualiserListesPersonnelDisponiblesCampManagerV423_(
  classeur
) {
  const feuille =
    classeur.getSheetByName(
      FEUILLES.PARAMETRES
    );

  if (!feuille) {
    return {
      personnel: 0,
      gouvernantes: 0
    };
  }

  const debut =
    LIGNES.DEBUT;

  const derniereLigne =
    Math.max(
      feuille.getLastRow(),
      debut
    );

  const nombreLignes =
    derniereLigne -
    debut +
    1;

  const colonnePersonnel =
    (
      typeof COLONNES_PARAMETRES !== "undefined" &&
      COLONNES_PARAMETRES.PERSONNEL
    )
      ? COLONNES_PARAMETRES.PERSONNEL
      : 7;

  const colonneStatutPersonnel =
    (
      typeof COLONNES_PARAMETRES !== "undefined" &&
      COLONNES_PARAMETRES.STATUT_PERSONNEL
    )
      ? COLONNES_PARAMETRES.STATUT_PERSONNEL
      : 8;

  const colonnePersonnelDisponible =
    (
      typeof COLONNES_PARAMETRES !== "undefined" &&
      COLONNES_PARAMETRES.PERSONNEL_DISPONIBLE
    )
      ? COLONNES_PARAMETRES.PERSONNEL_DISPONIBLE
      : 9;

  const colonneGouvernantes =
    (
      typeof COLONNES_PARAMETRES !== "undefined" &&
      COLONNES_PARAMETRES.GOUVERNANTES
    )
      ? COLONNES_PARAMETRES.GOUVERNANTES
      : 14;

  const colonneStatutGouvernante =
    (
      typeof COLONNES_PARAMETRES !== "undefined" &&
      COLONNES_PARAMETRES.STATUT_GOUVERNANTE
    )
      ? COLONNES_PARAMETRES.STATUT_GOUVERNANTE
      : 15;

  const colonneGouvernantesDisponibles =
    (
      typeof COLONNES_PARAMETRES !== "undefined" &&
      COLONNES_PARAMETRES.GOUVERNANTES_DISPONIBLES
    )
      ? COLONNES_PARAMETRES.GOUVERNANTES_DISPONIBLES
      : 16;

  const personnel =
    feuille
      .getRange(
        debut,
        colonnePersonnel,
        nombreLignes,
        colonneStatutPersonnel -
          colonnePersonnel +
          1
      )
      .getDisplayValues();

  const gouvernantes =
    feuille
      .getRange(
        debut,
        colonneGouvernantes,
        nombreLignes,
        colonneStatutGouvernante -
          colonneGouvernantes +
          1
      )
      .getDisplayValues();

  function statutDisponible_(valeur) {
    const statut =
      String(
        valeur || ""
      )
        .trim()
        .toLocaleLowerCase("fr");

    return (
      statut === "actif" ||
      statut === "extra"
    );
  }

  const personnelDisponible =
    personnel
      .filter(function(ligne) {
        return (
          String(
            ligne[0] || ""
          ).trim() !== "" &&
          statutDisponible_(
            ligne[
              colonneStatutPersonnel -
                colonnePersonnel
            ]
          )
        );
      })
      .map(function(ligne) {
        return [
          String(
            ligne[0] || ""
          ).trim()
        ];
      });

  const gouvernantesDisponibles =
    gouvernantes
      .filter(function(ligne) {
        return (
          String(
            ligne[0] || ""
          ).trim() !== "" &&
          statutDisponible_(
            ligne[
              colonneStatutGouvernante -
                colonneGouvernantes
            ]
          )
        );
      })
      .map(function(ligne) {
        return [
          String(
            ligne[0] || ""
          ).trim()
        ];
      });

  /*
   * On nettoie les anciennes listes techniques, sans toucher
   * aux colonnes de saisie G/H et N/O.
   */
  const nombreLignesNettoyage =
    Math.max(
      feuille.getMaxRows() -
        debut +
        1,
      1
    );

  feuille
    .getRange(
      debut,
      colonnePersonnelDisponible,
      nombreLignesNettoyage,
      1
    )
    .clearContent();

  feuille
    .getRange(
      debut,
      colonneGouvernantesDisponibles,
      nombreLignesNettoyage,
      1
    )
    .clearContent();

  if (
    personnelDisponible.length >
      0
  ) {
    feuille
      .getRange(
        debut,
        colonnePersonnelDisponible,
        personnelDisponible.length,
        1
      )
      .setValues(
        personnelDisponible
      );
  }

  if (
    gouvernantesDisponibles.length >
      0
  ) {
    feuille
      .getRange(
        debut,
        colonneGouvernantesDisponibles,
        gouvernantesDisponibles.length,
        1
      )
      .setValues(
        gouvernantesDisponibles
      );
  }

  SpreadsheetApp.flush();

  return {
    personnel:
      personnelDisponible.length,
    gouvernantes:
      gouvernantesDisponibles.length
  };
}


/**
 * Indique si une feuille possède au moins une donnée utile
 * à partir de la ligne 5.
 */
function feuilleContientDonneesCampManagerV423_(
  feuille,
  premiereColonne,
  nombreColonnes
) {
  if (!feuille) {
    return false;
  }

  const debut =
    LIGNES.DEBUT;

  const derniereLigne =
    feuille.getLastRow();

  if (
    derniereLigne <
      debut
  ) {
    return false;
  }

  const valeurs =
    feuille
      .getRange(
        debut,
        premiereColonne,
        derniereLigne -
          debut +
          1,
        nombreColonnes
      )
      .getDisplayValues();

  return valeurs.some(
    function(ligne) {
      return ligne.some(
        function(valeur) {
          return (
            String(
              valeur || ""
            ).trim() !== ""
          );
        }
      );
    }
  );
}


/**
 * Première initialisation uniquement.
 *
 * Retourne true si une reconstruction initiale a été effectuée.
 */
function initialiserDonneesNouvelEtablissementCampManagerV423_(
  classeur
) {
  const feuilleImport =
    classeur.getSheetByName(
      FEUILLES.IMPORT
    );

  const feuilleBase =
    classeur.getSheetByName(
      FEUILLES.BASE
    );

  const feuilleLogements =
    classeur.getSheetByName(
      FEUILLES.LOGEMENTS
    );

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  const importContientDonnees =
    feuilleContientDonneesCampManagerV423_(
      feuilleImport,
      1,
      5
    );

  const baseContientDonnees =
    feuilleContientDonneesCampManagerV423_(
      feuilleBase,
      1,
      9
    );

  const logementsContiennentDonnees =
    feuilleContientDonneesCampManagerV423_(
      feuilleLogements,
      1,
      2
    );

  /*
   * En Réception, on teste à partir de la colonne B (N° logement).
   * Les cellules décoratives de la colonne A ne doivent pas faire
   * croire que la feuille est déjà initialisée.
   */
  const receptionContientDonnees =
    feuilleContientDonneesCampManagerV423_(
      feuilleReception,
      2,
      9
    );

  let importSynchronise =
    false;

  let receptionReconstruite =
    false;

  /*
   * Cas 1 : toute première réservation.
   * Base est encore vide, Import contient les premiers séjours.
   */
  if (
    !baseContientDonnees &&
    importContientDonnees
  ) {
    if (
      typeof synchroniserImport !==
        "function"
    ) {
      throw new Error(
        "Impossible d'initialiser Base : synchroniserImport() est introuvable."
      );
    }

    synchroniserImport(
      false
    );

    SpreadsheetApp.flush();

    importSynchronise =
      true;
  }

  /*
   * Cas 2 :
   * - Réception est encore vide, mais des logements existent ;
   * - OU on vient de créer la première Base depuis Import.
   *
   * Ce recalcul global est autorisé uniquement ici car aucune
   * exploitation Réception n'existait encore à préserver.
   */
  if (
    (
      !receptionContientDonnees &&
      logementsContiennentDonnees
    ) ||
    importSynchronise
  ) {
    if (
      typeof mettreAJourReception !==
        "function"
    ) {
      throw new Error(
        "Impossible d'initialiser Réception : mettreAJourReception() est introuvable."
      );
    }

    mettreAJourReception(
      false
    );

    SpreadsheetApp.flush();

    receptionReconstruite =
      true;
  }

  return {
    effectuee:
      importSynchronise ||
      receptionReconstruite,
    importSynchronise:
      importSynchronise,
    receptionReconstruite:
      receptionReconstruite
  };
}


/**
 * ============================================================
 * V4.2.4 — CATÉGORIES / IMPORT / STRUCTURE RÉCEPTION
 * ============================================================
 */


/**
 * Complète automatiquement la colonne Catégorie de la feuille Import
 * à partir de la feuille Logements.
 *
 * Une catégorie déjà présente dans Import est conservée.
 */
function completerCategoriesImportDepuisLogementsCampManagerV424_(
  classeur
) {
  const feuilleImport =
    classeur.getSheetByName(
      FEUILLES.IMPORT
    );

  const feuilleLogements =
    classeur.getSheetByName(
      FEUILLES.LOGEMENTS
    );

  if (
    !feuilleImport ||
    !feuilleLogements
  ) {
    return {
      completees: 0
    };
  }

  const debut =
    LIGNES.DEBUT;

  const derniereLigneLogements =
    feuilleLogements.getLastRow();

  if (
    derniereLigneLogements <
      debut
  ) {
    return {
      completees: 0
    };
  }

  const logements =
    feuilleLogements
      .getRange(
        debut,
        1,
        derniereLigneLogements -
          debut +
          1,
        2
      )
      .getDisplayValues();

  const categorieParLogement =
    {};

  logements.forEach(
    function(ligne) {
      const numero =
        String(
          ligne[0] || ""
        ).trim();

      const categorie =
        String(
          ligne[1] || ""
        ).trim();

      if (
        numero &&
        categorie
      ) {
        categorieParLogement[
          numero.toLocaleUpperCase("fr")
        ] =
          categorie;
      }
    }
  );

  const derniereLigneImport =
    feuilleImport.getLastRow();

  if (
    derniereLigneImport <
      debut
  ) {
    return {
      completees: 0
    };
  }

  /*
   * Import :
   * D = N° emplacement
   * E = Catégorie
   */
  const nombre =
    derniereLigneImport -
    debut +
    1;

  const numeros =
    feuilleImport
      .getRange(
        debut,
        4,
        nombre,
        1
      )
      .getDisplayValues();

  const categories =
    feuilleImport
      .getRange(
        debut,
        5,
        nombre,
        1
      )
      .getDisplayValues();

  let completees =
    0;

  const nouvellesCategories =
    categories.map(
      function(ligne, index) {
        const actuelle =
          String(
            ligne[0] || ""
          ).trim();

        if (actuelle) {
          return [
            actuelle
          ];
        }

        const numero =
          String(
            numeros[index][0] || ""
          )
            .trim()
            .toLocaleUpperCase("fr");

        const categorie =
          categorieParLogement[
            numero
          ] || "";

        if (categorie) {
          completees++;
        }

        return [
          categorie
        ];
      }
    );

  feuilleImport
    .getRange(
      debut,
      5,
      nombre,
      1
    )
    .setValues(
      nouvellesCategories
    );

  SpreadsheetApp.flush();

  return {
    completees:
      completees
  };
}


/**
 * S'assure que tous les logements permanents existent dans Réception
 * sans reconstruire les lignes déjà exploitées.
 *
 * - met à jour uniquement la catégorie des lignes existantes ;
 * - ajoute uniquement les logements manquants ;
 * - ne modifie jamais un état existant, un Parti, un personnel, etc.
 */
function synchroniserStructureReceptionLogementsCampManagerV424_(
  classeur
) {
  const feuilleLogements =
    classeur.getSheetByName(
      FEUILLES.LOGEMENTS
    );

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  const feuilleParametres =
    classeur.getSheetByName(
      FEUILLES.PARAMETRES
    );

  if (
    !feuilleLogements ||
    !feuilleReception
  ) {
    return {
      ajoutes: 0,
      categoriesMisesAJour: 0
    };
  }

  const debut =
    LIGNES.DEBUT;

  const derniereLigneLogements =
    feuilleLogements.getLastRow();

  if (
    derniereLigneLogements <
      debut
  ) {
    return {
      ajoutes: 0,
      categoriesMisesAJour: 0
    };
  }

  const logements =
    feuilleLogements
      .getRange(
        debut,
        1,
        derniereLigneLogements -
          debut +
          1,
        2
      )
      .getDisplayValues()
      .filter(
        function(ligne) {
          return (
            String(
              ligne[0] || ""
            ).trim() !== ""
          );
        }
      );

  const derniereLigneReception =
    Math.max(
      feuilleReception.getLastRow(),
      debut - 1
    );

  const nombreReception =
    derniereLigneReception >=
      debut
      ? (
          derniereLigneReception -
          debut +
          1
        )
      : 0;

  const indexParLogement =
    {};

  if (
    nombreReception >
      0
  ) {
    const reception =
      feuilleReception
        .getRange(
          debut,
          COLONNES_RECEPTION.LOGEMENT,
          nombreReception,
          2
        )
        .getDisplayValues();

    reception.forEach(
      function(ligne, index) {
        const numero =
          String(
            ligne[0] || ""
          ).trim();

        if (numero) {
          indexParLogement[
            numero.toLocaleUpperCase("fr")
          ] =
            {
              ligne:
                debut +
                index,
              categorie:
                String(
                  ligne[1] || ""
                ).trim()
            };
        }
      }
    );
  }

  let ajoutes =
    0;

  let categoriesMisesAJour =
    0;
  let prochaineLigne =
    Math.max(
      derniereLigneReception +
        1,
      debut
    );

  logements.forEach(
    function(ligne) {
      const numero =
        String(
          ligne[0] || ""
        ).trim();

      const categorie =
        String(
          ligne[1] || ""
        ).trim();

      const cle =
        numero.toLocaleUpperCase(
          "fr"
        );

      const existant =
        indexParLogement[
          cle
        ];

      if (existant) {
        if (
          categorie &&
          existant.categorie !==
            categorie
        ) {
          feuilleReception
            .getRange(
              existant.ligne,
              COLONNES_RECEPTION.CATEGORIE
            )
            .setValue(
              categorie
            );

          categoriesMisesAJour++;
        }

        return;
      }

      feuilleReception
        .getRange(
          prochaineLigne,
          COLONNES_RECEPTION.LOGEMENT
        )
        .setValue(
          numero
        );

      feuilleReception
        .getRange(
          prochaineLigne,
          COLONNES_RECEPTION.CATEGORIE
        )
        .setValue(
          categorie
        );

      feuilleReception
        .getRange(
          prochaineLigne,
          COLONNES_RECEPTION.ETAT
        )
        .setValue(
          ETAT_RECEPTION.LIBRE
        );

      indexParLogement[
        cle
      ] =
        {
          ligne:
            prochaineLigne,
          categorie:
            categorie
        };

      prochaineLigne++;
      ajoutes++;
    }
  );

  const nombreFinal =
    Math.max(
      feuilleReception.getLastRow() -
        debut +
        1,
      0
    );

  /*
   * On réapplique seulement les validations/mises en forme
   * sur la structure obtenue.
   */
  if (
    nombreFinal >
      0
  ) {
    if (
      typeof appliquerListeEtatsReception ===
        "function"
    ) {
      appliquerListeEtatsReception(
        feuilleReception,
        feuilleParametres,
        nombreFinal
      );
    }

    if (
      typeof appliquerListePersonnelReception ===
        "function"
    ) {
      appliquerListePersonnelReception(
        feuilleReception,
        feuilleParametres,
        nombreFinal
      );
    }

    if (
      typeof appliquerListeGouvernantesReception_ ===
        "function"
    ) {
      appliquerListeGouvernantesReception_(
        feuilleReception,
        feuilleParametres,
        nombreFinal
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

  SpreadsheetApp.flush();

  return {
    ajoutes:
      ajoutes,
    categoriesMisesAJour:
      categoriesMisesAJour
  };
}


/**
 * Synchronise Import -> Base à CHAQUE actualisation, mais sans lancer
 * la reconstruction globale de Réception.
 *
 * C'est la combinaison qui permet :
 * - d'intégrer de nouvelles réservations ;
 * - de préserver les états manuels déjà présents en Réception.
 */
function synchroniserImportBaseSecuriseCampManagerV424_(
  classeur
) {
  const feuilleImport =
    classeur.getSheetByName(
      FEUILLES.IMPORT
    );

  const importContientDonnees =
    feuilleContientDonneesCampManagerV423_(
      feuilleImport,
      1,
      5
    );

  if (
    !importContientDonnees
  ) {
    return {
      synchronise:
        false,
      resultat:
        null
    };
  }

  if (
    typeof synchroniserImport !==
      "function"
  ) {
    throw new Error(
      "La fonction synchroniserImport() est introuvable."
    );
  }

  const resultat =
    synchroniserImport(
      false
    );

  SpreadsheetApp.flush();

  return {
    synchronise:
      true,
    resultat:
      resultat
  };
}


/**
 * Un HTTP 504 du pont est traité comme un incident temporaire :
 * les données Google Sheets restent valides et le déclencheur V4
 * retentera automatiquement à la minute suivante.
 */
function estTimeoutPontSupabaseCampManagerV424_(
  erreur
) {
  const message =
    String(
      erreur &&
      erreur.message
        ? erreur.message
        : erreur
    );

  return (
    message.indexOf(
      "HTTP 504"
    ) !== -1 ||
    message.indexOf(
      "Gateway Timeout"
    ) !== -1
  );
}


/**
 * ============================================================
 * V4.2.5 — LISTES DÉROULANTES LOCALES
 * ============================================================
 *
 * Lorsqu'un Google Sheet est copié, les anciennes règles de validation
 * peuvent rester présentes dans Réception même après nettoyage des données.
 *
 * Exemple observé :
 * - Paramètres P contient uniquement « Léon »
 * - mais Réception J propose encore « Marine / Sam »
 *
 * Ce ne sont PAS des données lues dans l'ancien établissement :
 * ce sont d'anciennes règles ONE_OF_LIST copiées avec le modèle.
 *
 * Cette fonction efface donc les anciennes validations Personnel/Gouvernante
 * et les reconstruit exclusivement depuis CE Google Sheet.
 */
function reconstruireListesDeroulantesLocalesCampManagerV425_(
  classeur
) {
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
    return {
      personnel: 0,
      gouvernantes: 0
    };
  }

  const debut =
    LIGNES.DEBUT;

  const colonnePersonnelReception =
    (
      typeof COLONNES_RECEPTION !== "undefined" &&
      COLONNES_RECEPTION.PERSONNEL
    )
      ? COLONNES_RECEPTION.PERSONNEL
      : 9;

  const colonneGouvernanteReception =
    (
      typeof COLONNES_RECEPTION !== "undefined" &&
      COLONNES_RECEPTION.GOUVERNANTE
    )
      ? COLONNES_RECEPTION.GOUVERNANTE
      : 10;

  const colonnePersonnelDisponible =
    (
      typeof COLONNES_PARAMETRES !== "undefined" &&
      COLONNES_PARAMETRES.PERSONNEL_DISPONIBLE
    )
      ? COLONNES_PARAMETRES.PERSONNEL_DISPONIBLE
      : 9;

  const colonneGouvernantesDisponibles =
    (
      typeof COLONNES_PARAMETRES !== "undefined" &&
      COLONNES_PARAMETRES.GOUVERNANTES_DISPONIBLES
    )
      ? COLONNES_PARAMETRES.GOUVERNANTES_DISPONIBLES
      : 16;

  const derniereLigneParametres =
    Math.max(
      feuilleParametres.getLastRow(),
      debut
    );

  const nombreParametres =
    derniereLigneParametres -
    debut +
    1;

  const personnel =
    feuilleParametres
      .getRange(
        debut,
        colonnePersonnelDisponible,
        nombreParametres,
        1
      )
      .getDisplayValues()
      .map(function(ligne) {
        return String(
          ligne[0] || ""
        ).trim();
      })
      .filter(function(valeur) {
        return valeur !== "";
      });

  const gouvernantes =
    feuilleParametres
      .getRange(
        debut,
        colonneGouvernantesDisponibles,
        nombreParametres,
        1
      )
      .getDisplayValues()
      .map(function(ligne) {
        return String(
          ligne[0] || ""
        ).trim();
      })
      .filter(function(valeur) {
        return valeur !== "";
      });

  function uniques_(valeurs) {
    const resultat = [];

    valeurs.forEach(
      function(valeur) {
        if (
          resultat.indexOf(
            valeur
          ) === -1
        ) {
          resultat.push(
            valeur
          );
        }
      }
    );

    return resultat;
  }

  const choixPersonnel =
    uniques_(
      personnel
    );

  const choixGouvernantes =
    uniques_(
      gouvernantes
    );

  /*
   * « 🗑 Effacer » est une commande métier existante.
   */
  choixPersonnel.push(
    "🗑 Effacer"
  );

  choixGouvernantes.push(
    "🗑 Effacer"
  );

  const nombreLignesReception =
    Math.max(
      feuilleReception.getMaxRows() -
        debut +
        1,
      1
    );

  const plagePersonnel =
    feuilleReception.getRange(
      debut,
      colonnePersonnelReception,
      nombreLignesReception,
      1
    );

  const plageGouvernantes =
    feuilleReception.getRange(
      debut,
      colonneGouvernanteReception,
      nombreLignesReception,
      1
    );

  /*
   * Étape indispensable :
   * on retire d'abord toutes les anciennes règles copiées.
   */
  plagePersonnel.clearDataValidations();
  plageGouvernantes.clearDataValidations();

  const validationPersonnel =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        choixPersonnel,
        true
      )
      .setAllowInvalid(
        false
      )
      .setHelpText(
        "Sélectionnez le personnel disponible de cet établissement."
      )
      .build();

  const validationGouvernantes =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        choixGouvernantes,
        true
      )
      .setAllowInvalid(
        false
      )
      .setHelpText(
        "Sélectionnez la gouvernante de cet établissement."
      )
      .build();

  plagePersonnel.setDataValidation(
    validationPersonnel
  );

  plageGouvernantes.setDataValidation(
    validationGouvernantes
  );

  SpreadsheetApp.flush();

  return {
    personnel:
      personnel.length,
    gouvernantes:
      gouvernantes.length
  };
}


/**
 * ============================================================
 * ACTUALISATION MANUELLE V4 SÉCURISÉE — V4.2.6
 * ============================================================
 *
 * EN PRODUCTION :
 * - ne relance jamais Import -> Base -> Réception ;
 * - conserve donc Parti, départs anticipés, personnel, etc.
 *
 * PREMIÈRE INSTALLATION :
 * - si Base/Réception sont encore vierges, la chaîne initiale
 *   est autorisée une seule fois afin de démarrer le logiciel.
 */
function actualiserLogicielV4Securise20260827() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  classeur.toast(
    "Actualisation CampManager en cours…",
    "🔄 CampManager V4",
    8
  );

  try {
    /*
     * 0. Première initialisation d'un nouvel établissement.
     *
     * Cette fonction ne reconstruit Réception que si elle est encore
     * vierge. Une Réception déjà exploitée reste donc totalement
     * préservée (Parti, départs anticipés, personnel, tris, etc.).
     */
    const initialisation =
      initialiserDonneesNouvelEtablissementCampManagerV423_(
        classeur
      );

    /*
     * 0 bis. Paramètres -> listes techniques disponibles.
     */
    const listes =
      actualiserListesPersonnelDisponiblesCampManagerV423_(
        classeur
      );

    /*
     * V4.2.5 :
     * supprime les anciennes listes copiées du modèle et les reconstruit
     * exclusivement depuis les Paramètres de CE classeur.
     */
    const listesLocales =
      reconstruireListesDeroulantesLocalesCampManagerV425_(
        classeur
      );

    /*
     * 1. Logements -> catégorie Import si elle est vide.
     */
    const categories =
      completerCategoriesImportDepuisLogementsCampManagerV424_(
        classeur
      );

    /*
     * 2. Import -> Base.
     *
     * IMPORTANT :
     * on synchronise Base, mais on NE lance PAS ici
     * mettreAJourReception(false).
     */
    const importBase =
      synchroniserImportBaseSecuriseCampManagerV424_(
        classeur
      );

    /*
     * 3. Logements -> structure Réception, de façon ciblée.
     *
     * Les lignes existantes ne sont jamais reconstruites.
     */
    const structure =
      synchroniserStructureReceptionLogementsCampManagerV424_(
        classeur
      );

    /*
     * 4. Base -> lignes Réception existantes.
     *
     * Cette fonction préserve notamment PARTI et les départs anticipés.
     */
    basculerClientsActuelsReceptionV4Securise_(
      false
    );

    SpreadsheetApp.flush();

    /*
     * 5. Actions V4 -> Drive.
     */
    let actions =
      null;

    if (
      typeof traiterActionsV4VersDriveSansReconstructionReception20260827_ ===
        "function"
    ) {
      actions =
        traiterActionsV4VersDriveSansReconstructionReception20260827_();

    } else if (
      typeof traiterActionsV4VersDrive ===
        "function"
    ) {
      actions =
        traiterActionsV4VersDrive();
    }

    SpreadsheetApp.flush();

    /*
     * 6. Réception -> Ménage.
     */
    if (
      typeof mettreAJourMenage ===
        "function"
    ) {
      mettreAJourMenage(
        false
      );
      SpreadsheetApp.flush();
    }

    if (
      typeof purgerMenageNonEligibleDepuisReceptionV4_ ===
        "function"
    ) {
      purgerMenageNonEligibleDepuisReceptionV4_();
      SpreadsheetApp.flush();
    }

    /*
     * 7. On régénère les listes juste avant Supabase.
     */
    const listesFinales =
      actualiserListesPersonnelDisponiblesCampManagerV423_(
        classeur
      );

    reconstruireListesDeroulantesLocalesCampManagerV425_(
      classeur
    );

    /*
     * 8. Drive -> Supabase.
     *
     * Un 504 ne doit plus faire croire que toute l'actualisation
     * locale a échoué : le déclencheur automatique réessaiera.
     */
    let supabase =
      true;

    let supabaseDifferee =
      false;

    if (
      typeof synchroniserGoogleDriveVersSupabaseV4SansReconstruireReception20260827_ ===
        "function"
    ) {
      try {
        synchroniserGoogleDriveVersSupabaseV4SansReconstruireReception20260827_();
        SpreadsheetApp.flush();

      } catch (erreurSupabase) {
        if (
          estTimeoutPontSupabaseCampManagerV424_(
            erreurSupabase
          )
        ) {
          supabase =
            false;

          supabaseDifferee =
            true;

          console.warn(
            "Pont Supabase temporairement indisponible : nouvelle tentative automatique à la prochaine synchronisation."
          );

        } else {
          throw erreurSupabase;
        }
      }
    }

    if (
      typeof mettreAJourStatistiques ===
        "function"
    ) {
      mettreAJourStatistiques();
      SpreadsheetApp.flush();
    }

    if (
      typeof mettreAJourTableauDeBord ===
        "function"
    ) {
      mettreAJourTableauDeBord();
      SpreadsheetApp.flush();
    }

    const appliquees =
      actions &&
      typeof actions.appliquees !==
        "undefined"
        ? Number(
            actions.appliquees || 0
          )
        : 0;

    const erreurs =
      actions &&
      typeof actions.erreurs !==
        "undefined"
        ? Number(
            actions.erreurs || 0
          )
        : 0;

    let texteFinal =
      "Actualisation terminée";

    if (
      importBase.synchronise
    ) {
      texteFinal +=
        " — Import → Base OK";
    }

    if (
      categories.completees >
        0
    ) {
      texteFinal +=
        " — " +
        categories.completees +
        " catégorie(s) complétée(s)";
    }

    if (
      structure.ajoutes >
        0
    ) {
      texteFinal +=
        " — " +
        structure.ajoutes +
        " logement(s) ajouté(s) à Réception";
    }

    texteFinal +=
      " — " +
      listesFinales.personnel +
      " personnel(s), " +
      listesFinales.gouvernantes +
      " gouvernante(s)";

    if (
      supabaseDifferee
    ) {
      texteFinal +=
        " — Supabase : nouvelle tentative automatique";
    }

    if (
      appliquees >
        0
    ) {
      texteFinal +=
        " — " +
        appliquees +
        " validation(s)";
    }

    if (
      erreurs >
        0
    ) {
      texteFinal +=
        " — " +
        erreurs +
        " erreur(s)";
    }

    classeur.toast(
      texteFinal,
      supabaseDifferee
        ? "⚠️ CampManager V4"
        : "✅ CampManager V4",
      10
    );

    return {
      succes: true,
      categories:
        categories,
      importBase:
        importBase,
      structure:
        structure,
      actions:
        actions,
      listes:
        listes,
      listesLocales:
        listesLocales,
      supabase:
        supabase,
      supabaseDifferee:
        supabaseDifferee
    };

  } catch (erreur) {
    const message =
      erreur &&
      erreur.message
        ? erreur.message
        : String(erreur);

    classeur.toast(
      "Échec : " +
        message,
      "❌ CampManager V4",
      10
    );

    throw erreur;
  }
}