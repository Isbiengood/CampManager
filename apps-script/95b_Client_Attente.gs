/**
 * ============================================================
 * CAMPMANAGER — CLIENT EN ATTENTE
 * VERSION 1.1.0 OPEN SOURCE — 26/09/2026
 * ============================================================
 *
 * Ce module conserve uniquement la logique métier « client en attente ».
 *
 * Il gère :
 * - la saisie d'un téléphone d'attente dans Réception ;
 * - la priorité ⚠️ tant que le logement n'est pas Prêt/Libre ;
 * - la restauration de la priorité normale lorsque l'attente se termine ;
 * - la conservation du numéro pour permettre à la Réception de rappeler ;
 * - la mise à jour de Ménage après un changement d'attente.
 *
 * V1.1 :
 * - le déclencheur installable surveille uniquement Réception ;
 * - la validation Ménage -> Prêt reste traitée par 90_OnEdit (Drive)
 *   ou par le moteur V4/94, qui appellent directement le helper
 *   terminerAttenteClientPourLogementV323_() ;
 * - cela évite un double traitement du même clic Ménage ;
 * - l'installateur est bloqué sur CampManager-MASTER.
 *
 * Il ne contient :
 * - aucune dépendance OneSignal ;
 * - aucune clé API ;
 * - aucun External ID ;
 * - aucune référence Capfun / Grand Cerf.
 *
 * COMPATIBILITÉ
 * -------------
 * Les noms historiques terminerAttenteClientPourLogementV323_() et
 * actualiserMenageApresAttenteV323_() sont conservés car les fichiers
 * 90_OnEdit et 96_Supabase les utilisent encore.
 */

const CLIENT_ATTENTE_CAMPMANAGER = Object.freeze({
  VERSION: "1.1.0-opensource",
  HANDLER: "gererClientAttenteCampManager"
});


/**
 * Installe le déclencheur onEdit autorisé pour la logique Client en attente.
 *
 * À exécuter une fois après remplacement de l'ancien module notifications.
 * L'installateur supprime aussi l'ancien déclencheur OneSignal V3 s'il existe.
 */
function installerDeclencheurClientAttenteCampManager() {
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
      "Installation Client en attente bloquée : " +
      "aucun établissement n'est installé. " +
      "Ne lance pas cet installateur dans CampManager-MASTER."
    );
  }

  const handlersASupprimer = [
    "gererNotificationDepartV32",
    CLIENT_ATTENTE_CAMPMANAGER.HANDLER
  ];

  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(declencheur) {
        if (
          handlersASupprimer.indexOf(
            declencheur.getHandlerFunction()
          ) !== -1
        ) {
          ScriptApp.deleteTrigger(
            declencheur
          );
        }
      }
    );

  ScriptApp
    .newTrigger(
      CLIENT_ATTENTE_CAMPMANAGER.HANDLER
    )
    .forSpreadsheet(
      classeur
    )
    .onEdit()
    .create();

  classeur.toast(
    "Gestion Client en attente installée.",
    "⚠️ CampManager",
    5
  );
}


/**
 * Nouveau handler installable générique.
 */
function gererClientAttenteCampManager(
  evenement
) {
  gererClientAttenteV323_(
    evenement
  );
}


/**
 * Compatibilité avec un ancien déclencheur encore présent.
 * Aucun envoi OneSignal n'est effectué.
 */
function gererNotificationDepartV32(
  evenement
) {
  gererClientAttenteV323_(
    evenement
  );
}


/**
 * Gère les modifications liées à un client en attente.
 *
 * Réception :
 * - Téléphone attente ;
 * - État.
 *
 * Ménage :
 * - passage à Prêt.
 */
function gererClientAttenteV323_(
  evenement
) {
  if (
    !evenement ||
    !evenement.range
  ) {
    return;
  }

  const cellule =
    evenement.range;

  const feuille =
    cellule.getSheet();

  /*
   * Depuis la V1.1, le déclencheur installable Client en attente
   * ne traite plus la colonne E de Ménage.
   *
   * - 90_OnEdit gère les validations manuelles Drive ;
   * - le moteur V4 / 94 gère les validations application / H ;
   * - ces chemins appellent directement
   *   terminerAttenteClientPourLogementV323_().
   *
   * On évite ainsi deux traitements concurrents pour le même clic.
   */

  /*
   * Les traitements du déclencheur concernent Réception.
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

  if (
    colonne !==
      COLONNES_RECEPTION.TELEPHONE_ATTENTE &&
    colonne !==
      COLONNES_RECEPTION.ETAT
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
   * Si Réception passe sur Prêt, l'attente est terminée.
   * Le numéro reste disponible pour rappeler le client.
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
   * Un logement déjà Prêt ou Libre ne doit plus conserver
   * la priorité d'attente, même si le numéro reste affiché.
   */
  if (
    telephone !== "" &&
    (
      etatReceptionActuel ===
        ETAT_RECEPTION.PRET ||
      etatReceptionActuel ===
        ETAT_RECEPTION.LIBRE
    )
  ) {
    nettoyerPresentationTelephoneAttenteV323_(
      feuille,
      ligne
    );

    restaurerPrioriteNormaleAttenteV323_(
      feuille,
      ligne
    );

    actualiserMenageApresAttenteV323_();

    return;
  }

  /*
   * Suppression manuelle du numéro : fin d'attente.
   */
  if (
    telephone === ""
  ) {
    nettoyerPresentationTelephoneAttenteV323_(
      feuille,
      ligne
    );

    restaurerPrioriteNormaleAttenteV323_(
      feuille,
      ligne
    );

    actualiserMenageApresAttenteV323_();

    return;
  }

  /*
   * Validation légère du numéro : avertissement uniquement.
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
   * Priorité absolue tant que le client attend son logement.
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
    .setNumberFormat(
      "@"
    )
    .setBackground(
      "#FFF3BF"
    )
    .setFontWeight(
      "bold"
    );

  actualiserMenageApresAttenteV323_();
}


/**
 * Validation légère d'un numéro de téléphone.
 * France et international acceptés.
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
 * Termine l'attente à partir du numéro de logement.
 *
 * Nom conservé pour compatibilité avec 90_OnEdit et 96_Supabase.
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

  if (!classeur) {
    return;
  }

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
 * Termine l'attente sur une ligne Réception.
 *
 * Le téléphone n'est pas supprimé : il reste disponible pour rappeler
 * le client. Seule sa mise en évidence est retirée.
 */
function terminerAttenteClientLigneReceptionV323_(
  feuilleReception,
  ligne,
  logement
) {
  nettoyerPresentationTelephoneAttenteV323_(
    feuilleReception,
    ligne
  );

  restaurerPrioriteNormaleAttenteV323_(
    feuilleReception,
    ligne
  );

  actualiserMenageApresAttenteV323_();
}


/**
 * Retire uniquement la mise en évidence du téléphone.
 */
function nettoyerPresentationTelephoneAttenteV323_(
  feuilleReception,
  ligne
) {
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
}


/**
 * Restaure la priorité normale sans reconstruire Réception.
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

  let priorite =
    "";

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
    .setFontColor(
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


/**
 * Reconstruit uniquement Ménage après une modification d'attente.
 * Réception n'est pas recalculée ici.
 */
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