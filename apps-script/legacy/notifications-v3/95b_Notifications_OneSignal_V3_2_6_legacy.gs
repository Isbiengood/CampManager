/**
 * ============================================================
 * CAPFUN GRAND CERF
 * NOTIFICATIONS ONESIGNAL — CAMPMANAGER V3.2.6 STABLE
 * ============================================================
 *
 * Fonctionnalités :
 * - notification automatique quand Réception passe sur "Parti" ;
 * - notification ⚠️ quand un téléphone d'attente est saisi ;
 * - notification à la femme de chambre / au binôme ET à la gouvernante ;
 * - anti-doublon par logement et par personne ;
 * - cible uniquement les personnes affectées au logement ;
 * - External ID OneSignal basé sur le prénom ;
 * - clé API stockée dans Script Properties.
 *
 * À installer une seule fois :
 * 1. exécuter configurerOneSignalV32()
 * 2. exécuter installerDeclencheurNotificationsV32()
 *
 * IMPORTANT :
 * la clé REST OneSignal reste côté Apps Script.
 */


/**
 * Configuration OneSignal.
 *
 * Lance cette fonction manuellement une fois.
 */
function configurerOneSignalV32() {
  const ui =
    SpreadsheetApp.getUi();

  const proprietes =
    PropertiesService
      .getScriptProperties();

  const appIdActuel =
    proprietes.getProperty(
      "CAPFUN_ONESIGNAL_APP_ID"
    ) || "";

  const reponseAppId =
    ui.prompt(
      "🔔 OneSignal — App ID",
      (
        appIdActuel
          ? "App ID actuel : " +
            appIdActuel +
            "\n\n"
          : ""
      ) +
      "Saisissez l'App ID OneSignal du camping.",
      ui.ButtonSet.OK_CANCEL
    );

  if (
    reponseAppId.getSelectedButton() !==
      ui.Button.OK
  ) {
    return;
  }

  const appId =
    String(
      reponseAppId.getResponseText() || ""
    ).trim();

  if (
    appId === ""
  ) {
    ui.alert(
      "App ID vide."
    );

    return;
  }

  const reponseCle =
    ui.prompt(
      "🔐 OneSignal — App API Key",
      "Saisissez la clé App API Key OneSignal.\n\n" +
      "Elle sera stockée dans les Script Properties.",
      ui.ButtonSet.OK_CANCEL
    );

  if (
    reponseCle.getSelectedButton() !==
      ui.Button.OK
  ) {
    return;
  }

  const apiKey =
    String(
      reponseCle.getResponseText() || ""
    ).trim();

  if (
    apiKey === ""
  ) {
    ui.alert(
      "Clé API vide."
    );

    return;
  }

  const reponseUrl =
    ui.prompt(
      "📱 URL de l'application",
      "Saisissez l'URL GitHub Pages de Capfun Ménage Mobile.\n\n" +
      "Exemple : https://utilisateur.github.io/capfun-menage/",
      ui.ButtonSet.OK_CANCEL
    );

  if (
    reponseUrl.getSelectedButton() !==
      ui.Button.OK
  ) {
    return;
  }

  const appUrl =
    String(
      reponseUrl.getResponseText() || ""
    ).trim();

  proprietes.setProperties({
    CAPFUN_ONESIGNAL_APP_ID:
      appId,

    CAPFUN_ONESIGNAL_API_KEY:
      apiKey,

    CAPFUN_MOBILE_PUBLIC_URL:
      appUrl
  });

  ui.alert(
    "✅ Configuration OneSignal enregistrée."
  );
}


/**
 * Installe un déclencheur onEdit avec autorisations.
 *
 * Contrairement au simple onEdit(), ce déclencheur peut utiliser
 * UrlFetchApp pour appeler l'API OneSignal.
 */
function installerDeclencheurNotificationsV32() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        if (
          declencheur.getHandlerFunction() ===
            "gererNotificationDepartV32"
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );

  ScriptApp
    .newTrigger(
      "gererNotificationDepartV32"
    )
    .forSpreadsheet(
      classeur
    )
    .onEdit()
    .create();

  classeur.toast(
    "Notifications automatiques installées.",
    "🔔 OneSignal",
    5
  );
}


/**
 * Déclenchement automatique lorsqu'un état Réception
 * passe manuellement sur "Parti".
 */
function gererNotificationDepartV32(
  evenement
) {
  if (
    !evenement ||
    !evenement.range
  ) {
    return;
  }

  /*
   * Ce même déclencheur gère désormais :
   * - le départ réel ;
   * - le client en attente ;
   * - une nouvelle affectation pendant l'attente ;
   * - la fin d'attente lorsque le ménage passe sur Prêt.
   */
  gererClientAttenteV323_(
    evenement
  );

  gererNotificationDepartSeulementV323_(
    evenement
  );
}


/**
 * Ancienne logique V3.2.1 conservée :
 * notification lorsqu'un logement passe sur Parti.
 */
function gererNotificationDepartSeulementV323_(
  evenement
) {
  const cellule =
    evenement.range;

  const feuille =
    cellule.getSheet();

  if (
    feuille.getName() !==
      FEUILLES.RECEPTION ||
    cellule.getRow() <
      LIGNES.DEBUT ||
    cellule.getColumn() !==
      COLONNES_RECEPTION.ETAT
  ) {
    return;
  }

  const nouvelEtat =
    String(
      typeof evenement.value !==
        "undefined"
        ? evenement.value
        : cellule.getValue()
    ).trim();

  const ancienEtat =
    String(
      evenement.oldValue || ""
    ).trim();

  if (
    nouvelEtat !==
      ETAT_RECEPTION.PARTI ||
    ancienEtat ===
      ETAT_RECEPTION.PARTI
  ) {
    return;
  }

  const ligne =
    cellule.getRow();

  const logement =
    String(
      feuille
        .getRange(
          ligne,
          COLONNES_RECEPTION.LOGEMENT
        )
        .getDisplayValue() || ""
    ).trim();

  const personnel =
    String(
      feuille
        .getRange(
          ligne,
          COLONNES_RECEPTION.PERSONNEL
        )
        .getDisplayValue() || ""
    ).trim();

  if (
    logement === "" ||
    personnel === ""
  ) {
    return;
  }

  const destinataires =
    extraireExternalIdsPersonnelV32_(
      personnel
    );

  if (
    destinataires.length === 0
  ) {
    return;
  }

  envoyerNotificationOneSignalV32_({
    externalIds:
      destinataires,

    titre:
      "🟢 Logement " +
      logement +
      " disponible",

    message:
      "Le client est parti. Vous pouvez commencer le ménage.",

    logement:
      logement,

    type:
      "depart"
  });
}


/**
 * ============================================================
 * CM-005 — ⚠️ CLIENT EN ATTENTE
 * ============================================================
 */
function gererClientAttenteV323_(
  evenement
) {
  const cellule =
    evenement.range;

  const feuille =
    cellule.getSheet();

  /*
   * 1. Une femme de chambre passe le logement sur Prêt
   *    dans la feuille Ménage.
   */
  if (
    feuille.getName() ===
      FEUILLES.MENAGE &&
    cellule.getRow() >=
      LIGNES.DEBUT &&
    cellule.getColumn() ===
      COLONNES_MENAGE.ETAT_MENAGE
  ) {
    const nouvelEtatMenage =
      String(
        typeof evenement.value !==
          "undefined"
          ? evenement.value
          : cellule.getValue()
      ).trim();

    if (
      nouvelEtatMenage ===
        ETAT_MENAGE.PRET
    ) {
      const logement =
        String(
          feuille
            .getRange(
              cellule.getRow(),
              COLONNES_MENAGE.LOGEMENT
            )
            .getDisplayValue() || ""
        ).trim();

      terminerAttenteClientPourLogementV323_(
        logement
      );
    }

    return;
  }

  /*
   * 2. Les autres actions concernent Réception.
   */
  if (
    feuille.getName() !==
      FEUILLES.RECEPTION ||
    cellule.getRow() <
      LIGNES.DEBUT
  ) {
    return;
  }

  const colonne =
    cellule.getColumn();

  const colonnesSurveillees = [
    COLONNES_RECEPTION.TELEPHONE_ATTENTE,
    COLONNES_RECEPTION.PERSONNEL,
    COLONNES_RECEPTION.GOUVERNANTE,
    COLONNES_RECEPTION.ETAT
  ];

  if (
    colonnesSurveillees.indexOf(
      colonne
    ) === -1
  ) {
    return;
  }

  const ligne =
    cellule.getRow();

  const logement =
    String(
      feuille
        .getRange(
          ligne,
          COLONNES_RECEPTION.LOGEMENT
        )
        .getDisplayValue() || ""
    ).trim();

  if (
    logement === ""
  ) {
    return;
  }

  /*
   * Si Réception passe directement sur Prêt,
   * l'attente se termine également.
   */
  if (
    colonne ===
      COLONNES_RECEPTION.ETAT
  ) {
    const nouvelEtat =
      String(
        typeof evenement.value !==
          "undefined"
          ? evenement.value
          : cellule.getValue()
      ).trim();

    if (
      nouvelEtat ===
        ETAT_RECEPTION.PRET
    ) {
      terminerAttenteClientLigneReceptionV323_(
        feuille,
        ligne,
        logement
      );

      return;
    }
  }

  const telephone =
    String(
      feuille
        .getRange(
          ligne,
          COLONNES_RECEPTION.TELEPHONE_ATTENTE
        )
        .getDisplayValue() || ""
    ).trim();

  const etatReceptionActuel =
    String(
      feuille
        .getRange(
          ligne,
          COLONNES_RECEPTION.ETAT
        )
        .getDisplayValue() || ""
    ).trim();

  /*
   * Une fois Prêt/Libre, le téléphone reste pour permettre
   * à la Réception de rappeler le client, mais il ne doit plus
   * recréer la priorité ⚠️.
   */
  if (
    telephone !== "" &&
    (
      etatReceptionActuel === ETAT_RECEPTION.PRET ||
      etatReceptionActuel === ETAT_RECEPTION.LIBRE
    )
  ) {
    effacerEtatNotificationAttenteV323_(
      logement
    );

    restaurerPrioriteNormaleAttenteV323_(
      feuille,
      ligne
    );

    return;
  }

  /*
   * Suppression manuelle du numéro :
   * on retire l'alerte et on restaure la priorité normale.
   */
  if (
    telephone === ""
  ) {
    effacerEtatNotificationAttenteV323_(
      logement
    );

    restaurerPrioriteNormaleAttenteV323_(
      feuille,
      ligne
    );

    actualiserMenageApresAttenteV323_();

    return;
  }

  /*
   * Validation légère : on avertit sans bloquer.
   */
  if (
    colonne ===
      COLONNES_RECEPTION.TELEPHONE_ATTENTE &&
    !numeroTelephoneAttenteValideV323_(
      telephone
    )
  ) {
    SpreadsheetApp
      .getActiveSpreadsheet()
      .toast(
        "Le numéro saisi semble inhabituel. " +
        "Formats acceptés : 06..., +33..., +31..., +49..., etc.",
        "⚠️ Téléphone à vérifier",
        7
      );
  }

  /*
   * Priorité absolue.
   */
  feuille
    .getRange(
      ligne,
      COLONNES_RECEPTION.PRIORITE
    )
    .setValue(
      "⚠️"
    )
    .setBackground(
      "#FFD54F"
    )
    .setFontColor(
      "#000000"
    )
    .setFontWeight(
      "bold"
    );

  feuille
    .getRange(
      ligne,
      COLONNES_RECEPTION.TELEPHONE_ATTENTE
    )
    .setBackground(
      "#FFF3BF"
    )
    .setFontWeight(
      "bold"
    );

  /*
   * Si le numéro vient de changer, il s'agit d'une nouvelle attente :
   * l'anti-doublon repart à zéro.
   */
  preparerEpisodeAttenteV323_(
    logement,
    telephone
  );

  /*
   * Envoi aux personnes actuellement affectées.
   * Si personne n'est encore affecté, rien n'est envoyé.
   * Une affectation ultérieure déclenchera cette même fonction.
   */
  envoyerNotificationsClientAttenteV323_(
    feuille,
    ligne,
    logement,
    telephone
  );

  actualiserMenageApresAttenteV323_();
}


/**
 * Envoie l'alerte aux femmes de chambre/binômes et gouvernantes.
 * Chaque External ID ne reçoit qu'une seule notification par épisode.
 */
function envoyerNotificationsClientAttenteV323_(
  feuille,
  ligne,
  logement,
  telephone
) {
  const personnel =
    String(
      feuille
        .getRange(
          ligne,
          COLONNES_RECEPTION.PERSONNEL
        )
        .getDisplayValue() || ""
    ).trim();

  const gouvernante =
    String(
      feuille
        .getRange(
          ligne,
          COLONNES_RECEPTION.GOUVERNANTE
        )
        .getDisplayValue() || ""
    ).trim();

  const destinataires =
    Array.from(
      new Set(
        extraireExternalIdsPersonnelV32_(
          personnel
        ).concat(
          extraireExternalIdsPersonnelV32_(
            gouvernante
          )
        )
      )
    );

  if (
    destinataires.length === 0
  ) {
    return;
  }

  const etat =
    lireEtatNotificationAttenteV323_(
      logement,
      telephone
    );

  const nouveaux =
    destinataires.filter(
      function(id) {
        return etat.sent.indexOf(
          id
        ) === -1;
      }
    );

  if (
    nouveaux.length === 0
  ) {
    return;
  }

  envoyerNotificationOneSignalV32_({
    externalIds:
      nouveaux,

    titre:
      "⚠️ CLIENT EN ATTENTE — Logement " +
      logement,

    message:
      "Le client est arrivé à la réception et attend son logement. " +
      "Merci de traiter ce logement en priorité.",

    logement:
      logement,

    type:
      "client_attente"
  });

  etat.sent =
    Array.from(
      new Set(
        etat.sent.concat(
          nouveaux
        )
      )
    );

  enregistrerEtatNotificationAttenteV323_(
    logement,
    etat
  );
}


/**
 * Nouveau numéro = nouvel épisode.
 */
function preparerEpisodeAttenteV323_(
  logement,
  telephone
) {
  const cle =
    cleEtatAttenteV323_(
      logement
    );

  const proprietes =
    PropertiesService
      .getDocumentProperties();

  const brut =
    proprietes.getProperty(
      cle
    );

  if (
    !brut
  ) {
    enregistrerEtatNotificationAttenteV323_(
      logement,
      {
        phone:
          telephone,
        sent:
          []
      }
    );

    return;
  }

  try {
    const etat =
      JSON.parse(
        brut
      );

    if (
      String(
        etat.phone || ""
      ) !==
        String(
          telephone || ""
        )
    ) {
      enregistrerEtatNotificationAttenteV323_(
        logement,
        {
          phone:
            telephone,
          sent:
            []
        }
      );
    }
  } catch (erreur) {
    enregistrerEtatNotificationAttenteV323_(
      logement,
      {
        phone:
          telephone,
        sent:
          []
      }
    );
  }
}


function lireEtatNotificationAttenteV323_(
  logement,
  telephone
) {
  const brut =
    PropertiesService
      .getDocumentProperties()
      .getProperty(
        cleEtatAttenteV323_(
          logement
        )
      );

  if (
    !brut
  ) {
    return {
      phone:
        telephone,
      sent:
        []
    };
  }

  try {
    const etat =
      JSON.parse(
        brut
      );

    return {
      phone:
        String(
          etat.phone || telephone || ""
        ),
      sent:
        Array.isArray(
          etat.sent
        )
          ? etat.sent
          : []
    };
  } catch (erreur) {
    return {
      phone:
        telephone,
      sent:
        []
    };
  }
}


function enregistrerEtatNotificationAttenteV323_(
  logement,
  etat
) {
  PropertiesService
    .getDocumentProperties()
    .setProperty(
      cleEtatAttenteV323_(
        logement
      ),
      JSON.stringify(
        etat
      )
    );
}


function effacerEtatNotificationAttenteV323_(
  logement
) {
  PropertiesService
    .getDocumentProperties()
    .deleteProperty(
      cleEtatAttenteV323_(
        logement
      )
    );
}


function cleEtatAttenteV323_(
  logement
) {
  return (
    "CM_ATTENTE_" +
    String(
      logement || ""
    )
      .trim()
      .replace(
        /[^A-Za-z0-9_-]+/g,
        "_"
      )
  );
}


/**
 * Accepte France et international :
 * 06..., +33..., +31..., +49..., etc.
 *
 * Espaces, tirets, points et parenthèses autorisés.
 * Avertissement seulement : aucune saisie n'est bloquée.
 */
function numeroTelephoneAttenteValideV323_(
  telephone
) {
  const texte =
    String(
      telephone || ""
    ).trim();

  if (
    !/^[+0-9][0-9+().\s-]*$/.test(
      texte
    )
  ) {
    return false;
  }

  const chiffres =
    texte.replace(
      /\D/g,
      ""
    );

  return (
    chiffres.length >= 6 &&
    chiffres.length <= 15
  );
}


/**
 * Fin de l'attente depuis Ménage.
 */
function terminerAttenteClientPourLogementV323_(
  logement
) {
  if (
    !logement
  ) {
    return;
  }

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  if (
    !feuilleReception
  ) {
    return;
  }

  const ligne =
    trouverLigneReceptionAttenteV323_(
      feuilleReception,
      logement
    );

  if (
    ligne
  ) {
    terminerAttenteClientLigneReceptionV323_(
      feuilleReception,
      ligne,
      logement
    );
  }
}


/**
 * Efface le téléphone, l'anti-doublon et rétablit la priorité.
 */
function terminerAttenteClientLigneReceptionV323_(
  feuilleReception,
  ligne,
  logement
) {
  /*
   * IMPORTANT V3.2.4 :
   * le numéro NE DISPARAÎT PLUS lorsque le logement devient Prêt.
   *
   * Il reste à disposition de la Réception pour rappeler le client.
   * La Réception le supprimera manuellement après l'appel.
   */
  feuilleReception
    .getRange(
      ligne,
      COLONNES_RECEPTION.TELEPHONE_ATTENTE
    )
    .setNumberFormat(
      "@"
    )
    .setBackground(
      null
    )
    .setFontWeight(
      "normal"
    );

  effacerEtatNotificationAttenteV323_(
    logement
  );

  restaurerPrioriteNormaleAttenteV323_(
    feuilleReception,
    ligne
  );

  actualiserMenageApresAttenteV323_();
}


/**
 * Restaure uniquement la priorité de la ligne, sans reconstruire
 * Réception et sans risquer de modifier un état manuel.
 */
function restaurerPrioriteNormaleAttenteV323_(
  feuille,
  ligne
) {
  const etat =
    String(
      feuille
        .getRange(
          ligne,
          COLONNES_RECEPTION.ETAT
        )
        .getDisplayValue() || ""
    ).trim();

  const depart =
    feuille
      .getRange(
        ligne,
        COLONNES_RECEPTION.DEPART
      )
      .getValue();

  const arrivee =
    feuille
      .getRange(
        ligne,
        COLONNES_RECEPTION.ARRIVEE_SUIVANTE
      )
      .getValue();

  let priorite = "";

  if (
    etat ===
      ETAT_RECEPTION.INDISPONIBLE
  ) {
    priorite =
      PRIORITE.NOIR;

  } else if (
    etat ===
      ETAT_RECEPTION.A_RECONTROLER
  ) {
    priorite =
      PRIORITE.VIOLET;

  } else if (
    etat ===
      ETAT_RECEPTION.PRET
  ) {
    priorite =
      PRIORITE.BLANC;

  } else if (
    etat ===
      ETAT_RECEPTION.PARTI
  ) {
    priorite =
      estDateAujourdhuiAttenteV323_(
        arrivee
      )
        ? PRIORITE.ROUGE
        : PRIORITE.BLEU;

  } else if (
    etat ===
      ETAT_RECEPTION.OCCUPE
  ) {
    if (
      estDateAujourdhuiAttenteV323_(
        depart
      )
    ) {
      priorite =
        estDateAujourdhuiAttenteV323_(
          arrivee
        )
          ? PRIORITE.ROUGE
          : PRIORITE.BLEU;
    }
  }

  feuille
    .getRange(
      ligne,
      COLONNES_RECEPTION.PRIORITE
    )
    .setValue(
      priorite
    )
    .setBackground(
      null
    )
    .setFontWeight(
      "normal"
    );
}


function estDateAujourdhuiAttenteV323_(
  valeur
) {
  if (
    !(valeur instanceof Date) ||
    isNaN(
      valeur.getTime()
    )
  ) {
    return false;
  }

  const maintenant =
    new Date();

  return (
    valeur.getFullYear() ===
      maintenant.getFullYear() &&
    valeur.getMonth() ===
      maintenant.getMonth() &&
    valeur.getDate() ===
      maintenant.getDate()
  );
}


function trouverLigneReceptionAttenteV323_(
  feuille,
  logement
) {
  const derniereLigne =
    feuille.getLastRow();

  if (
    derniereLigne <
      LIGNES.DEBUT
  ) {
    return 0;
  }

  const valeurs =
    feuille
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.LOGEMENT,
        derniereLigne -
          LIGNES.DEBUT +
          1,
        1
      )
      .getDisplayValues();

  const recherche =
    String(
      logement || ""
    ).trim();

  for (
    let index = 0;
    index <
      valeurs.length;
    index++
  ) {
    if (
      String(
        valeurs[index][0] || ""
      ).trim() ===
        recherche
    ) {
      return (
        LIGNES.DEBUT +
        index
      );
    }
  }

  return 0;
}


function actualiserMenageApresAttenteV323_() {
  if (
    typeof mettreAJourMenage ===
      "function"
  ) {
    mettreAJourMenage(
      false
    );
  }
}



/**
 * Test manuel depuis Apps Script.
 *
 * Exemple :
 * testerNotificationV32("Sam")
 */
function testerNotificationV32(
  prenom
) {
  const identifiant =
    creerExternalIdPersonnelV32_(
      prenom
    );

  envoyerNotificationOneSignalV32_({
    externalIds: [
      identifiant
    ],

    titre:
      "🧪 Test CampManager",

    message:
      "Les notifications fonctionnent correctement.",

    logement:
      "TEST",

    type:
      "test"
  });
}


/**
 * Envoi REST OneSignal.
 */
function envoyerNotificationOneSignalV32_(
  donnees
) {
  const proprietes =
    PropertiesService
      .getScriptProperties();

  const appId =
    String(
      proprietes.getProperty(
        "CAPFUN_ONESIGNAL_APP_ID"
      ) || ""
    ).trim();

  const apiKey =
    String(
      proprietes.getProperty(
        "CAPFUN_ONESIGNAL_API_KEY"
      ) || ""
    ).trim();

  const appUrl =
    String(
      proprietes.getProperty(
        "CAPFUN_MOBILE_PUBLIC_URL"
      ) || ""
    ).trim();

  if (
    appId === "" ||
    apiKey === ""
  ) {
    throw new Error(
      "OneSignal n'est pas configuré. Lancez configurerOneSignalV32()."
    );
  }

  const externalIds =
    Array.from(
      new Set(
        (
          donnees.externalIds || []
        )
          .map(
            function(id) {
              return String(
                id || ""
              ).trim();
            }
          )
          .filter(
            function(id) {
              return id !== "";
            }
          )
      )
    );

  if (
    externalIds.length ===
      0
  ) {
    return;
  }

  const payload = {
    app_id:
      appId,

    include_aliases: {
      external_id:
        externalIds
    },

    target_channel:
      "push",

    headings: {
      fr:
        donnees.titre,
      en:
        donnees.titre
    },

    contents: {
      fr:
        donnees.message,
      en:
        donnees.message
    },

    data: {
      type:
        donnees.type || "",
      logement:
        donnees.logement || ""
    }
  };

  if (
    appUrl !== ""
  ) {
    payload.url =
      appUrl;
  }

  const reponse =
    UrlFetchApp.fetch(
      "https://api.onesignal.com/notifications",
      {
        method:
          "post",

        contentType:
          "application/json",

        headers: {
          Authorization:
            "Key " +
            apiKey
        },

        payload:
          JSON.stringify(
            payload
          ),

        muteHttpExceptions:
          true
      }
    );

  const code =
    reponse.getResponseCode();

  if (
    code < 200 ||
    code >= 300
  ) {
    throw new Error(
      "Erreur OneSignal " +
      code +
      " : " +
      reponse.getContentText()
    );
  }

  return reponse.getContentText();
}


/**
 * Personnel "Alicia/Sam" → external IDs.
 */
function extraireExternalIdsPersonnelV32_(
  personnel
) {
  return String(
    personnel || ""
  )
    .split(
      /[\/,;]+/
    )
    .map(
      function(prenom) {
        return prenom.trim();
      }
    )
    .filter(
      function(prenom) {
        return prenom !== "";
      }
    )
    .map(
      creerExternalIdPersonnelV32_
    );
}


/**
 * Même règle dans Apps Script et sur GitHub Pages.
 *
 * Marine → capfun_gc_marine
 * Aurélie → capfun_gc_aurelie
 */
function creerExternalIdPersonnelV32_(
  prenom
) {
  const normalise =
    String(
      prenom || ""
    )
      .trim()
      .toLowerCase()
      .normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-z0-9]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      );

  return (
    "capfun_gc_" +
    normalise
  );
}
