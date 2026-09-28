/**
 * ============================================================
 * CAMPMANAGER — GESTION DES MODIFICATIONS MANUELLES
 * VERSION V2.35 OPEN SOURCE — HISTORIQUE DRIVE + PRIORITÉ ATTENTE PROTÉGÉE + H DÉLÉGUÉE AU 94
 * ============================================================
 *
 * V2.35
 * - si un téléphone d'attente est déjà renseigné lorsque Réception
 *   passe sur « Parti », la priorité ⚠️ est conservée directement
 *   par le onEdit principal ;
 * - cela évite toute course entre le onEdit simple et le déclencheur
 *   installable 95b_Client_Attente.
 *
 * V2.34
 * - les changements manuels de l'état Ménage en colonne E alimentent
 *   désormais Historique Ménage, comme l'application V4 ;
 * - aucune modification programmatique V4 n'est dupliquée : setValue()
 *   ne déclenche pas le onEdit simple.
 *
 * NETTOYAGE V2.33
 * - suppression de l'ancien moteur de contrôle gouvernante V2.31/V2.30 ;
 * - la colonne H de Ménage reste gérée exclusivement par le fichier 94 ;
 * - aucune logique métier active de V2.32 n'est modifiée.
 *
 * Important :
 * une seule fonction onEdit(e) doit exister
 * dans l’ensemble du projet Apps Script.
 *
 * Modifications prises en charge :
 *
 * - ajout manuel d’une réservation dans Base ;
 * - passage automatique de cette réservation sur « Active » ;
 * - enregistrement de la date et de l’heure en colonne H ;
 * - sélection multiple du personnel dans Réception ;
 * - sélection de la gouvernante dans Réception ;
 * - enregistrement automatique du départ réel en colonne M ;
 * - classement alphabétique des prénoms ;
 * - affichage des binômes avec le séparateur « / » ;
 * - changement de l’état dans Réception ;
 * - enregistrement du dernier contrôle ;
 * - changement de l’état ménage dans Ménage ;
 * - synchronisation entre Réception et Ménage ;
 * - actualisation immédiate des couleurs ;
 * - validation gouvernante manuelle sans reconstruction globale de Réception.
 */


/**
 * Déclencheur simple appelé automatiquement
 * lors d’une modification manuelle du tableur.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} evenement
 */
function onEdit(evenement) {
  if (
    !evenement ||
    !evenement.range
  ) {
    return;
  }

  /*
   * ==========================================================
   * 1. Ajout manuel dans Base
   * ==========================================================
   *
   * Ce traitement est volontairement placé avant
   * le contrôle des modifications sur plusieurs cellules.
   *
   * Ainsi, une réservation collée sur une ligne complète
   * est également initialisée automatiquement.
   */
  if (
    initialiserReservationManuelleBase_(
      evenement
    )
  ) {
    return;
  }

  /*
   * Les autres traitements concernent uniquement
   * une modification sur une seule cellule.
   */
  if (
    evenement.range.getNumRows() !== 1 ||
    evenement.range.getNumColumns() !== 1
  ) {
    return;
  }

  const cellule =
    evenement.range;

  const feuille =
    cellule.getSheet();

  const nomFeuille =
    feuille.getName();

  const ligne =
    cellule.getRow();

  const colonne =
    cellule.getColumn();

  if (
    ligne <
    LIGNES.DEBUT
  ) {
    return;
  }

  /*
   * ==========================================================
   * 2. Sélection multiple du personnel dans Réception
   * ==========================================================
   */
  if (
    gererSelectionPersonnelReception_(
      evenement
    )
  ) {
    return;
  }

  /*
   * ==========================================================
   * 3. Sélection de la gouvernante dans Réception
   * ==========================================================
   */
  if (
    gererSelectionGouvernanteReception_(
      evenement
    )
  ) {
    return;
  }

  /*
   * ==========================================================
   * 4. Modification de l’état dans Réception
   * ==========================================================
   */

  if (
    enregistrerDepartReelReception_(
      evenement
    )
  ) {
    /*
     * On ne retourne pas ici :
     * les autres traitements liés à l'état Réception
     * doivent continuer à s'exécuter normalement.
     */
  }

  if (
    nomFeuille ===
      FEUILLES.RECEPTION &&
    colonne ===
      COLONNES_RECEPTION.ETAT
  ) {
    traiterModificationEtatReception(
      evenement
    );

    return;
  }

  /*
   * ==========================================================
   * 5. Contrôle gouvernante dans Ménage (colonne H)
   * ==========================================================
   */
  if (
    nomFeuille ===
      FEUILLES.MENAGE &&
    colonne ===
      COLONNE_CONTROLE_MENAGE_V329_
  ) {
    /*
     * 07/09/2026 :
     * le contrôle gouvernante manuel de la colonne H est désormais
     * pris en charge EXCLUSIVEMENT par le déclencheur installable
     * 94_Controle_Gouvernante_Manuel_V4.
     *
     * Cela évite tout conflit avec le onEdit simple et garantit que
     * le contrôle manuel utilise le même moteur autorisé que la V4.
     */
    return;
  }

  /*
   * ==========================================================
   * 6. Modification de l’état ménage (colonne E)
   * ==========================================================
   */
  if (
    nomFeuille ===
      FEUILLES.MENAGE &&
    colonne ===
      COLONNES_MENAGE.ETAT_MENAGE
  ) {
    if (
      !autoriserModificationEtatMenageDriveV329_(
        evenement
      )
    ) {
      return;
    }

    traiterModificationEtatMenage(
      evenement
    );

    /*
     * V2.34 — Historique des modifications faites directement
     * dans Google Sheets.
     *
     * On enregistre seulement APRÈS le traitement métier et uniquement
     * si la cellule contient encore la valeur demandée. Ainsi une action
     * bloquée (client encore présent, validation refusée, etc.) ne crée
     * jamais une fausse ligne dans Historique Ménage.
     */
    enregistrerHistoriqueMenageDepuisEditionDriveV234_(
      evenement
    );

    const valeurMenage =
      String(
        evenement.value || ""
      ).trim();

    if (
      valeurMenage ===
        ETAT_MENAGE.PRET &&
      typeof terminerAttenteClientPourLogementV323_ ===
        "function"
    ) {
      const logement =
        String(
          feuille
            .getRange(
              ligne,
              COLONNES_MENAGE.LOGEMENT
            )
            .getDisplayValue() || ""
        ).trim();

      terminerAttenteClientPourLogementV323_(
        logement
      );
    }

    if (
      typeof mettreAJourMenage ===
        "function"
    ) {
      mettreAJourMenage(
        false
      );
    }

    return;
  }
}


/**
 * V2.34 — Alimente Historique Ménage lors d'une modification
 * manuelle de la colonne E directement dans Google Sheets.
 *
 * Les actions provenant de l'application V4 ne passent pas ici :
 * une modification faite par script avec setValue() ne déclenche
 * pas le onEdit simple.
 */
function enregistrerHistoriqueMenageDepuisEditionDriveV234_(
  evenement
) {
  if (
    !evenement ||
    !evenement.range ||
    typeof enregistrerHistoriqueMenageDepuisApplication_ !==
      "function"
  ) {
    return;
  }

  const cellule =
    evenement.range;

  const feuille =
    cellule.getSheet();

  if (
    feuille.getName() !==
      FEUILLES.MENAGE ||
    cellule.getColumn() !==
      COLONNES_MENAGE.ETAT_MENAGE
  ) {
    return;
  }

  const etatAvant =
    String(
      typeof evenement.oldValue !==
        "undefined"
        ? evenement.oldValue
        : ""
    ).trim();

  const etatDemande =
    String(
      typeof evenement.value !==
        "undefined"
        ? evenement.value
        : cellule.getDisplayValue()
    ).trim();

  const etatActuel =
    String(
      cellule.getDisplayValue() || ""
    ).trim();

  /*
   * Si le traitement métier a restauré l'ancienne valeur,
   * l'action a été refusée : aucun historique ne doit être créé.
   */
  if (
    etatAvant === "" ||
    etatDemande === "" ||
    etatAvant === etatDemande ||
    etatActuel !== etatDemande
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
          COLONNES_MENAGE.LOGEMENT
        )
        .getDisplayValue() || ""
    ).trim();

  if (!logement) {
    return;
  }

  const personnel =
    String(
      feuille
        .getRange(
          ligne,
          COLONNES_MENAGE.PERSONNEL
        )
        .getDisplayValue() || ""
    ).trim();

  const colonneCheck =
    (
      typeof MENAGE_SECOURS_V3210 !==
        "undefined" &&
      MENAGE_SECOURS_V3210.COLONNE_CHECK
    )
      ? MENAGE_SECOURS_V3210.COLONNE_CHECK
      : 7;

  let gouvernante =
    String(
      feuille
        .getRange(
          ligne,
          colonneCheck
        )
        .getDisplayValue() || ""
    ).trim();

  let prenomCliqueur =
    gouvernante;

  /*
   * Cas double rôle en solo :
   * si aucun Check n'est renseigné, le personnel affecté est
   * suffisamment précis pour historiser la personne qui assure
   * ménage + contrôle.
   *
   * Pour un binôme, on ne devine jamais qui a cliqué.
   */
  if (
    etatDemande ===
      ETAT_MENAGE.PRET &&
    !prenomCliqueur &&
    personnel &&
    typeof decomposerPersonnelReception_ ===
      "function"
  ) {
    const personnes =
      decomposerPersonnelReception_(
        personnel
      );

    if (
      personnes.length === 1 &&
      typeof estDoubleRolePersonnelMenageDriveV329_ ===
        "function" &&
      estDoubleRolePersonnelMenageDriveV329_(
        personnel
      )
    ) {
      prenomCliqueur =
        personnes[0];

      gouvernante =
        personnes[0];
    }
  }

  try {
    enregistrerHistoriqueMenageDepuisApplication_({
      logement:
        logement,

      prenomCliqueur:
        prenomCliqueur,

      etatAvant:
        etatAvant,

      etatApres:
        etatDemande,

      personnel:
        personnel,

      gouvernante:
        gouvernante,

      source:
        "Google Sheets"
    });

  } catch (
    erreurHistorique
  ) {
    console.error(
      "Historique Google Sheets non enregistré : " +
      obtenirMessageErreurOnEdit_(
        erreurHistorique
      )
    );
  }
}


/**
 * Initialise automatiquement une réservation
 * ajoutée manuellement dans la feuille Base.
 *
 * Dès qu’un numéro de réservation est présent :
 *
 * - l’état devient « Active » si la colonne G est vide ;
 * - la date et l’heure sont inscrites en colonne H.
 *
 * Une réservation déjà « Annulée » ou « Archivée »
 * n’est jamais modifiée automatiquement.
 *
 * La fonction fonctionne aussi lors du collage
 * d’une ou plusieurs lignes.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} evenement
 *
 * @return {boolean}
 *         true si la modification concernait la feuille Base.
 */
function initialiserReservationManuelleBase_(
  evenement
) {
  if (
    !evenement ||
    !evenement.range
  ) {
    return false;
  }

  const plage =
    evenement.range;

  const feuille =
    plage.getSheet();

  if (
    feuille.getName() !==
      FEUILLES.BASE
  ) {
    return false;
  }

  const premiereLigne =
    Math.max(
      plage.getRow(),
      LIGNES.DEBUT
    );

  const derniereLigne =
    plage.getLastRow();

  if (
    derniereLigne <
      LIGNES.DEBUT
  ) {
    return true;
  }

  const nombreLignes =
    derniereLigne -
    premiereLigne +
    1;

  const valeurs =
    feuille
      .getRange(
        premiereLigne,
        1,
        nombreLignes,
        COLONNES_BASE.NOMBRE_COLONNES
      )
      .getValues();

  const maintenant =
    new Date();

  let initialisees =
    0;

  valeurs.forEach(
    function(ligne) {
      const nom =
        String(
          ligne[
            COLONNES_BASE.NOM_CLIENT - 1
          ] || ""
        ).trim();

      const arrivee =
        convertirDateSynchronisationESeason_(
          ligne[
            COLONNES_BASE.DATE_ARRIVEE - 1
          ]
        );

      const depart =
        convertirDateSynchronisationESeason_(
          ligne[
            COLONNES_BASE.DATE_DEPART - 1
          ]
        );

      /*
       * Une ligne manuelle devient exploitable dès que
       * nom + arrivée + départ sont renseignés.
       * L'utilisateur n'a plus à inventer de numéro.
       */
      if (
        nom === "" ||
        !arrivee ||
        !depart
      ) {
        return;
      }

      const origine =
        String(
          ligne[
            COLONNES_BASE.ORIGINE - 1
          ] || ""
        ).trim();

      /*
       * Pour une réservation déjà issue d'un import,
       * on ne change pas l'ID : une correction temporaire
       * (logement, catégorie...) sera écrasée au prochain import.
       */
      if (
        origine ===
          ORIGINE_RESERVATION.IMPORT
      ) {
        return;
      }

      ligne[
        COLONNES_BASE.ID_SEJOUR - 1
      ] =
        creerIdUniquePourLigneManuelleBase_(
          feuille,
          premiereLigne +
            valeurs.indexOf(
              ligne
            ),
          nom,
          arrivee,
          depart
        );

      const etatActuel =
        String(
          ligne[
            COLONNES_BASE.ETAT_RESERVATION - 1
          ] || ""
        ).trim();

      if (
        etatActuel === ""
      ) {
        ligne[
          COLONNES_BASE.ETAT_RESERVATION - 1
        ] =
          ETAT_RESERVATION.ACTIVE;
      }

      ligne[
        COLONNES_BASE.DERNIERE_SYNCHRONISATION - 1
      ] =
        maintenant;

      ligne[
        COLONNES_BASE.ORIGINE - 1
      ] =
        ORIGINE_RESERVATION.MANUELLE;

      initialisees++;
    }
  );

  if (
    initialisees >
      0
  ) {
    feuille
      .getRange(
        premiereLigne,
        1,
        nombreLignes,
        COLONNES_BASE.NOMBRE_COLONNES
      )
      .setValues(
        valeurs
      );

    feuille
      .getRange(
        premiereLigne,
        COLONNES_BASE.DATE_ARRIVEE,
        nombreLignes,
        2
      )
      .setNumberFormat(
        "dd/MM/yyyy"
      );

    feuille
      .getRange(
        premiereLigne,
        COLONNES_BASE.DERNIERE_SYNCHRONISATION,
        nombreLignes,
        1
      )
      .setNumberFormat(
        "dd/MM/yyyy HH:mm:ss"
      );

    SpreadsheetApp
      .getActiveSpreadsheet()
      .toast(
        initialisees === 1
          ? "Séjour manuel enregistré. Il sera remplacé automatiquement lorsqu'une réservation correspondante apparaîtra dans un prochain import."
          : initialisees +
            " séjours manuels enregistrés.",
        "✅ Base",
        5
      );
  }

  return true;
}


/**
 * Traite une modification manuelle
 * de l’état Réception.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} evenement
 */
function traiterModificationEtatReception(
  evenement
) {
  try {
    enregistrerDernierControleReception_(
      evenement
    );

    /*
     * Lors d'un passage manuel sur « Parti »,
     * la priorité est calculée immédiatement :
     *
     * - rouge si départ et arrivée suivante
     *   ont lieu le même jour ;
     * - bleu dans les autres cas.
     */
    mettreAJourPrioriteApresEtatReception_(
      evenement
    );

    appliquerCouleurApresModification(
      evenement
    );

    mettreAJourEtatReceptionDansMenage(
      evenement
    );

    SpreadsheetApp.flush();

  } catch (erreur) {
    console.error(
      "Erreur pendant la modification de Réception : " +
      obtenirMessageErreurOnEdit_(
        erreur
      )
    );

    SpreadsheetApp
      .getActiveSpreadsheet()
      .toast(
        "La modification n’a pas pu être entièrement appliquée.",
        "❌ Réception",
        5
      );
  }
}


/**
 * Met à jour immédiatement la priorité
 * après une modification manuelle de l'état Réception.
 *
 * Règles pour l'état « Parti » :
 *
 * - départ et arrivée suivante le même jour : rouge ;
 * - sinon : bleu.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} evenement
 */
function mettreAJourPrioriteApresEtatReception_(
  evenement
) {
  const cellule =
    evenement.range;

  const feuille =
    cellule.getSheet();

  const nouvelEtat =
    String(
      cellule.getValue() || ""
    ).trim();

  if (
    nouvelEtat !==
    ETAT_RECEPTION.PARTI
  ) {
    return;
  }

  const ligne =
    cellule.getRow();

  /*
   * V2.35 — priorité Client en attente protégée.
   *
   * Le 95b possède un déclencheur installable séparé. L'ordre
   * d'exécution entre ce déclencheur et le onEdit simple n'étant
   * pas une base fiable pour la logique métier, le onEdit principal
   * protège lui-même ⚠️ lorsqu'un téléphone est déjà présent.
   */
  const telephoneAttente =
    String(
      feuille
        .getRange(
          ligne,
          COLONNES_RECEPTION.TELEPHONE_ATTENTE
        )
        .getDisplayValue() || ""
    ).trim();

  if (
    telephoneAttente !== ""
  ) {
    const prioriteAttente =
      (
        typeof PRIORITE !==
          "undefined" &&
        PRIORITE.ATTENTE
      )
        ? PRIORITE.ATTENTE
        : "⚠️";

    feuille
      .getRange(
        ligne,
        COLONNES_RECEPTION.PRIORITE
      )
      .setValue(
        prioriteAttente
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

    return;
  }

  const depart =
    feuille
      .getRange(
        ligne,
        COLONNES_RECEPTION.DEPART
      )
      .getValue();

  const arriveeSuivante =
    feuille
      .getRange(
        ligne,
        COLONNES_RECEPTION.ARRIVEE_SUIVANTE
      )
      .getValue();

  const memeJour =
    datesMemeJourOnEdit_(
      depart,
      arriveeSuivante
    );

  feuille
    .getRange(
      ligne,
      COLONNES_RECEPTION.PRIORITE
    )
    .setValue(
      memeJour
        ? PRIORITE.ROUGE
        : PRIORITE.BLEU
    );
}


/**
 * Compare deux dates sans tenir compte de l'heure.
 *
 * @param {*} dateA
 * @param {*} dateB
 *
 * @return {boolean}
 */
function datesMemeJourOnEdit_(
  dateA,
  dateB
) {
  if (
    !dateA ||
    !dateB
  ) {
    return false;
  }

  const premiereDate =
    dateA instanceof Date
      ? dateA
      : new Date(dateA);

  const deuxiemeDate =
    dateB instanceof Date
      ? dateB
      : new Date(dateB);

  if (
    isNaN(
      premiereDate.getTime()
    ) ||
    isNaN(
      deuxiemeDate.getTime()
    )
  ) {
    return false;
  }

  return (
    premiereDate.getFullYear() ===
      deuxiemeDate.getFullYear() &&
    premiereDate.getMonth() ===
      deuxiemeDate.getMonth() &&
    premiereDate.getDate() ===
      deuxiemeDate.getDate()
  );
}


/**
 * Enregistre la date du jour dans
 * la colonne Dernier contrôle lorsque
 * l’état Réception devient Prêt.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} evenement
 */
function enregistrerDernierControleReception_(
  evenement
) {
  const cellule =
    evenement.range;

  const feuilleReception =
    cellule.getSheet();

  const nouvelEtat =
    String(
      cellule.getValue() || ""
    ).trim();

  if (
    nouvelEtat !==
    ETAT_RECEPTION.PRET
  ) {
    return;
  }

  const ligne =
    cellule.getRow();

  const celluleDernierControle =
    feuilleReception.getRange(
      ligne,
      COLONNES_RECEPTION.DERNIER_CONTROLE
    );

  const aujourdHui =
    supprimerHeureOnEdit_(
      new Date()
    );

  celluleDernierControle
    .setValue(
      aujourdHui
    )
    .setNumberFormat(
      "dd/MM/yyyy"
    )
    .setHorizontalAlignment(
      "center"
    );

  const logement =
    String(
      feuilleReception
        .getRange(
          ligne,
          COLONNES_RECEPTION.LOGEMENT
        )
        .getValue() || ""
    ).trim();

  if (
    logement !== ""
  ) {
    SpreadsheetApp
      .getActiveSpreadsheet()
      .toast(
        "Dernier contrôle enregistré pour le logement " +
          logement +
          ".",
        "✅ Contrôle validé",
        3
      );
  }
}


/** * Traite une modification
 * de l’état Ménage.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} evenement
 */
function traiterModificationEtatMenage(
  evenement
) {
  try {
    const modificationBloquee =
      bloquerEtatMenageSiOccupe(
        evenement
      );

    if (
      modificationBloquee
    ) {
      return;
    }

    synchroniserEtatMenageVersReception(
      evenement
    );

    appliquerCouleurApresModification(
      evenement
    );

    SpreadsheetApp.flush();

  } catch (erreur) {
    console.error(
      "Erreur pendant la modification de Ménage : " +
      obtenirMessageErreurOnEdit_(
        erreur
      )
    );

    SpreadsheetApp
      .getActiveSpreadsheet()
      .toast(
        "La modification n’a pas pu être entièrement appliquée.",
        "❌ Ménage",
        5
      );
  }
}


/**
 * Permet de constituer une équipe dans Réception
 * en sélectionnant successivement plusieurs prénoms.
 *
 * Exemple :
 *
 * premier choix : Sam
 * deuxième choix : Aurélie
 *
 * résultat : Aurélie/Sam
 *
 * Pour remplacer complètement l’équipe,
 * il faut d’abord vider la cellule.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} evenement
 *
 * @return {boolean}
 *         true si la modification concernait le personnel.
 */
function gererSelectionPersonnelReception_(
  evenement
) {
  if (
    !evenement ||
    !evenement.range
  ) {
    return false;
  }

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
      COLONNES_RECEPTION.PERSONNEL
  ) {
    return false;
  }

  const nouvelleValeur =
    String(
      typeof evenement.value !==
        "undefined"
        ? evenement.value
        : cellule.getValue()
    ).trim();

  const ancienneValeur =
    String(
      evenement.oldValue || ""
    ).trim();

  /*
   * Effacement direct :
   *
   * - suppression manuelle de la cellule ;
   * - choix « 🗑 Effacer » dans la liste.
   */
  if (
    nouvelleValeur === "" ||
    nouvelleValeur ===
      "🗑 Effacer"
  ) {
    cellule.clearDataValidations();
    cellule.clearContent();

    appliquerValidationPersonnelCellule_(
      cellule,
      ""
    );

    actualiserMenageApresAffectationPersonnel_();

    return true;
  }

  const ancienneEquipe =
    decomposerPersonnelReception_(
      ancienneValeur
    );

  const nouveauxChoix =
    decomposerPersonnelReception_(
      nouvelleValeur
    );

  /*
   * On détermine d'abord si l'action ajoute
   * au moins une personne ou retire uniquement
   * une personne déjà présente.
   *
   * L'alerte « recouche » ne doit apparaître
   * que lors d'une AJOUT, jamais lors d'un retrait.
   */
  const contientNouvelAjout =
    nouveauxChoix.some(
      function(prenom) {
        return (
          trouverIndexPrenomPersonnel_(
            ancienneEquipe,
            prenom
          ) === -1
        );
      }
    );

  if (
    contientNouvelAjout &&
    !confirmerAffectationPersonnelSurRecouche_(
      feuille,
      cellule.getRow()
    )
  ) {
    /*
     * Réponse « Non » :
     * toute l'affectation du logement est supprimée.
     */
    cellule.clearDataValidations();
    cellule.clearContent();

    appliquerValidationPersonnelCellule_(
      cellule,
      ""
    );

    actualiserMenageApresAffectationPersonnel_();

    return true;
  }

  /*
   * Premier choix dans une cellule vide.
   */
  if (
    ancienneEquipe.length === 0
  ) {
    const personnel =
      normaliserPersonnelReception_(
        nouvelleValeur
      );

    cellule.clearDataValidations();
    cellule.setValue(
      personnel
    );

    appliquerValidationPersonnelCellule_(
      cellule,
      personnel
    );

    actualiserMenageApresAffectationPersonnel_();

    return true;
  }

  /*
   * Sélection réversible :
   *
   * - un prénom absent est ajouté ;
   * - un prénom déjà présent est retiré.
   */
  const equipeFinale =
    ancienneEquipe.slice();

  nouveauxChoix.forEach(
    function(prenom) {
      const indexExistant =
        trouverIndexPrenomPersonnel_(
          equipeFinale,
          prenom
        );

      if (
        indexExistant === -1
      ) {
        equipeFinale.push(
          prenom
        );
      } else {
        equipeFinale.splice(
          indexExistant,
          1
        );
      }
    }
  );

  const personnel =
    normaliserPersonnelReception_(
      equipeFinale.join("/")
    );

  cellule.clearDataValidations();

  if (
    personnel === ""
  ) {
    cellule.clearContent();
  } else {
    cellule.setValue(
      personnel
    );
  }

  appliquerValidationPersonnelCellule_(
    cellule,
    personnel
  );

  actualiserMenageApresAffectationPersonnel_();

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      personnel !== ""
        ? "Équipe affectée : " + personnel
        : "Affectation supprimée.",
      "👥 Personnel",
      3
    );

  return true;
}


/**
 * Demande confirmation lorsqu'une équipe est affectée
 * à un logement dont le départ est postérieur à aujourd'hui.
 *
 * Exemple :
 * aujourd'hui 06/08, départ prévu le 07/08.
 *
 * @return {boolean}
 */
function confirmerAffectationPersonnelSurRecouche_(
  feuilleReception,
  ligne
) {
  const dateDepart =
    feuilleReception
      .getRange(
        ligne,
        COLONNES_RECEPTION.DEPART
      )
      .getValue();

  if (
    !dateDepart ||
    !(dateDepart instanceof Date) ||
    isNaN(
      dateDepart.getTime()
    )
  ) {
    return true;
  }

  const maintenant =
    new Date();

  const aujourdHui =
    supprimerHeureOnEdit_(
      maintenant
    );

  const departSansHeure =
    supprimerHeureOnEdit_(
      dateDepart
    );

  const differenceJours =
    Math.round(
      (
        departSansHeure.getTime() -
        aujourdHui.getTime()
      ) /
      86400000
    );

  /*
   * Départ aujourd'hui ou déjà passé :
   * aucune alerte.
   */
  if (
    differenceJours <= 0
  ) {
    return true;
  }

  /*
   * Départ demain :
   *
   * - avant l'heure de préparation : alerte ;
   * - à partir de l'heure de préparation : aucune alerte.
   */
  if (
    differenceJours === 1
  ) {
    const heurePreparation =
      lireHeurePreparationMenage_();

    const heureActuelle =
      maintenant.getHours() +
      maintenant.getMinutes() / 60;

    if (
      heureActuelle >=
      heurePreparation
    ) {
      return true;
    }
  }

  /*
   * Départ à J+2 ou plus :
   * alerte systématique.
   *
   * Départ demain avant l'heure de préparation :
   * alerte également.
   */
  const logement =
    String(
      feuilleReception
        .getRange(
          ligne,
          COLONNES_RECEPTION.LOGEMENT
        )
        .getValue() || ""
    ).trim();

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const dateAffichee =
    Utilities.formatDate(
      departSansHeure,
      classeur.getSpreadsheetTimeZone(),
      "dd/MM/yyyy"
    );

  const ui =
    SpreadsheetApp.getUi();

  const reponse =
    ui.alert(
      "⚠️ Hébergement en recouche",
      "Le logement " +
        logement +
        " est en départ le " +
        dateAffichee +
        ".\n\n" +
        "Êtes-vous sûr de vouloir attribuer du personnel " +
        "pour nettoyer cet hébergement ?",
      ui.ButtonSet.YES_NO
    );

  if (
    reponse ===
    ui.Button.YES
  ) {
    return true;
  }

  /*
   * La fonction ne modifie jamais directement la cellule.
   * Elle indique uniquement au gestionnaire principal
   * que l'utilisateur a refusé l'affectation.
   */
  return false;
}


/**
 * Lit l'heure à partir de laquelle
 * la préparation du ménage du lendemain est autorisée
 * sans message d'alerte.
 *
 * Dans Paramètres, on peut inscrire :
 *
 * K5 : Heure préparation ménage
 * L5 : 17
 *
 * Si la valeur est absente ou incorrecte,
 * 17 h est utilisée par défaut.
 *
 * @return {number}
 */
function lireHeurePreparationMenage_() {
  const heureParDefaut =
    17;

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleParametres =
    classeur.getSheetByName(
      FEUILLES.PARAMETRES
    );

  if (
    !feuilleParametres
  ) {
    return heureParDefaut;
  }

  /*
   * Recherche du paramètre dans les colonnes K et L.
   * Cela évite d'imposer une ligne fixe.
   */
  const derniereLigne =
    Math.max(
      feuilleParametres.getLastRow(),
      LIGNES.DEBUT
    );

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const parametres =
    feuilleParametres
      .getRange(
        LIGNES.DEBUT,
        COLONNES_PARAMETRES.PARAMETRE,
        nombreLignes,
        2
      )
      .getValues();

  for (
    let index = 0;
    index < parametres.length;
    index++
  ) {
    const libelle =
      String(
        parametres[index][0] || ""
      )
        .trim()
        .toLocaleLowerCase("fr")
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        );

    if (
      libelle ===
      "heure preparation menage"
    ) {
      const valeur =
        Number(
          parametres[index][1]
        );

      if (
        isFinite(
          valeur
        ) &&
        valeur >= 0 &&
        valeur < 24
      ) {
        return valeur;
      }
    }
  }

  return heureParDefaut;
}


/**
 * Découpe une équipe en prénoms.
 */
function decomposerPersonnelReception_(
  valeur
) {
  return String(
    valeur || ""
  )
    .split(
      /\s*(?:\/|,|&|\+|\bet\b)\s*/i
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
    );
}


/**
 * Recherche un prénom sans tenir compte
 * des accents ni des majuscules.
 */
function trouverIndexPrenomPersonnel_(
  equipe,
  prenomRecherche
) {
  const cleRecherche =
    creerClePrenomPersonnel_(
      prenomRecherche
    );

  for (
    let index = 0;
    index < equipe.length;
    index++
  ) {
    if (
      creerClePrenomPersonnel_(
        equipe[index]
      ) === cleRecherche
    ) {
      return index;
    }
  }

  return -1;
}


/**
 * Crée une clé de comparaison pour un prénom.
 */
function creerClePrenomPersonnel_(
  prenom
) {
  return String(
    prenom || ""
  )
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}


/**
 * Gère la sélection d'une gouvernante dans Réception.
 *
 * Une seule gouvernante est affectée par logement.
 * « 🗑 Effacer » supprime l'affectation.
 *
 * @return {boolean}
 */
function gererSelectionGouvernanteReception_(
  evenement
) {
  if (
    !evenement ||
    !evenement.range
  ) {
    return false;
  }

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
      COLONNES_RECEPTION.GOUVERNANTE
  ) {
    return false;
  }

  const nouvelleValeur =
    String(
      typeof evenement.value !==
        "undefined"
        ? evenement.value
        : cellule.getValue()
    ).trim();

  if (
    nouvelleValeur === "" ||
    nouvelleValeur ===
      "🗑 Effacer"
  ) {
    cellule.clearDataValidations();
    cellule.clearContent();

    appliquerValidationGouvernanteCellule_(
      cellule,
      ""
    );

    return true;
  }

  cellule.clearDataValidations();
  cellule.setValue(
    nouvelleValeur
  );

  appliquerValidationGouvernanteCellule_(
    cellule,
    nouvelleValeur
  );

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      "Gouvernante affectée : " +
        nouvelleValeur,
      "👑 Gouvernante",
      3
    );

  return true;
}


/**
 * Réapplique la validation Gouvernante
 * après une modification manuelle.
 */
function appliquerValidationGouvernanteCellule_(
  cellule,
  gouvernanteActuelle
) {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleParametres =
    classeur.getSheetByName(
      FEUILLES.PARAMETRES
    );

  if (
    !feuilleParametres
  ) {
    return;
  }

  const derniereLigne =
    feuilleParametres.getLastRow();

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return;
  }

  const gouvernantes =
    feuilleParametres
      .getRange(
        LIGNES.DEBUT,
        COLONNES_PARAMETRES.GOUVERNANTES_DISPONIBLES,
        derniereLigne -
          LIGNES.DEBUT +
          1,
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
          return valeur !== "";
        }
      );

  const choix = [];

  gouvernantes
    .concat([
      "🗑 Effacer",
      String(
        gouvernanteActuelle || ""
      ).trim()
    ])
    .forEach(
      function(valeur) {
        if (
          valeur !== "" &&
          choix.indexOf(
            valeur
          ) === -1
        ) {
          choix.push(
            valeur
          );
        }
      }
    );

  if (
    choix.length === 0
  ) {
    return;
  }

  const validation =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        choix,
        true
      )
      .setAllowInvalid(
        false
      )
      .setHelpText(
        "Sélectionnez la gouvernante chargée du contrôle."
      )
      .build();

  cellule.setDataValidation(
    validation
  );
}


/**
 * Reconstruit immédiatement la feuille Ménage
 * après une modification du personnel dans Réception.
 *
 * Cela permet d'affecter l'équipe avant ou après
 * le passage du logement sur « Parti ».
 */
function actualiserMenageApresAffectationPersonnel_() {
  if (
    typeof mettreAJourMenage !==
    "function"
  ) {
    return;
  }

  mettreAJourMenage(
    false
  );

}


/**
 * Réapplique une validation compatible avec
 * la valeur composée de la cellule.
 *
 * La liste contient :
 * - les prénoms disponibles dans Paramètres ;
 * - l'équipe actuellement affichée, par exemple Aurélie/Sam.
 *
 * Cela supprime l'avertissement « Non valide »
 * tout en conservant la liste déroulante.
 *
 * @param {GoogleAppsScript.Spreadsheet.Range} cellule
 * @param {string} equipeActuelle
 */
function appliquerValidationPersonnelCellule_(
  cellule,
  equipeActuelle
) {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleParametres =
    classeur.getSheetByName(
      FEUILLES.PARAMETRES
    );

  if (!feuilleParametres) {
    return;
  }

  const derniereLigne =
    feuilleParametres.getLastRow();

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return;
  }

  const personnes =
    feuilleParametres
      .getRange(
        LIGNES.DEBUT,
        COLONNES_PARAMETRES.PERSONNEL_DISPONIBLE,
        derniereLigne - LIGNES.DEBUT + 1,
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

  const choixAutorises = [];

  personnes
    .concat([
      "🗑 Effacer",
      String(
        equipeActuelle || ""
      ).trim()
    ])
    .forEach(function(valeur) {
      if (
        valeur !== "" &&
        choixAutorises.indexOf(valeur) === -1
      ) {
        choixAutorises.push(valeur);
      }
    });

  if (
    choixAutorises.length === 0
  ) {
    return;
  }

  const validation =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        choixAutorises,
        true
      )
      .setAllowInvalid(
        false
      )
      .setHelpText(
        "Sélectionnez les prénoms l’un après l’autre."
      )
      .build();

  cellule.setDataValidation(
    validation
  );
}


/**
 * Normalise les prénoms du personnel.
 *
 * La fonction :
 *
 * - accepte « / », « et », virgule, « & » ou « + » ;
 * - supprime les doublons ;
 * - classe les prénoms par ordre alphabétique ;
 * - utilise toujours « / » comme séparateur final.
 *
 * @param {*} valeur
 *
 * @return {string}
 */
function normaliserPersonnelReception_(
  valeur
) {
  const prenoms =
    String(
      valeur || ""
    )
      .split(
        /\s*(?:\/|,|&|\+|\bet\b)\s*/i
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
      );

  const prenomsUniques = [];

  prenoms.forEach(
    function(prenom) {
      const cle =
        prenom
          .toLocaleLowerCase("fr")
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          );

      const existeDeja =
        prenomsUniques.some(
          function(prenomExistant) {
            const cleExistante =
              prenomExistant
                .toLocaleLowerCase("fr")
                .normalize("NFD")
                .replace(
                  /[\u0300-\u036f]/g,
                  ""
                );

            return (
              cleExistante === cle
            );
          }
        );

      if (
        !existeDeja
      ) {
        prenomsUniques.push(
          prenom
        );
      }
    }
  );

  prenomsUniques.sort(
    function(prenomA, prenomB) {
      return prenomA.localeCompare(
        prenomB,
        "fr",
        {
          sensitivity: "base"        }
      );
    }
  );

  return prenomsUniques.join(
    "/"
  );
}


/**
 * Supprime l’heure d’une date.
 *
 * @param {Date} date
 *
 * @return {Date}
 */
function supprimerHeureOnEdit_(
  date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}


/**
 * Retourne un message d’erreur propre.
 *
 * @param {*} erreur
 *
 * @return {string}
 */
function obtenirMessageErreurOnEdit_(
  erreur
) {
  if (
    erreur &&
    erreur.message
  ) {
    return erreur.message;
  }

  return String(
    erreur
  );
}


/**
 * ============================================================
 * DÉPART RÉEL — V2.11A
 * ============================================================
 *
 * Colonne M de Réception :
 * date + heure réelle du passage sur « Parti ».
 *
 * Règles :
 * - passage sur Parti avec cellule vide -> enregistre maintenant ;
 * - nouvel edit sur Parti -> conserve l'heure initiale ;
 * - retour manuel sur Occupé -> efface le départ réel ;
 * - les autres états ne modifient pas cette valeur.
 *
 * @return {boolean} true si l'édition concerne l'état Réception.
 */
function enregistrerDepartReelReception_(
  evenement
) {
  if (
    !evenement ||
    !evenement.range
  ) {
    return false;
  }

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
    return false;
  }

  const nouvelEtat =
    String(
      typeof evenement.value !==
        "undefined"
        ? evenement.value
        : cellule.getValue()
    ).trim();

  const celluleDepartReel =
    feuille.getRange(
      cellule.getRow(),
      COLONNES_RECEPTION.DEPART_REEL
    );

  /*
   * Premier passage sur Parti :
   * on mémorise la date + l'heure exacte.
   */
  if (
    nouvelEtat ===
      ETAT_RECEPTION.PARTI
  ) {
    const valeurExistante =
      celluleDepartReel.getValue();

    if (
      !(
        valeurExistante instanceof Date &&
        !isNaN(
          valeurExistante.getTime()
        )
      )
    ) {
      celluleDepartReel
        .setValue(
          new Date()
        )
        .setNumberFormat(
          "dd/MM/yyyy HH:mm:ss"
        );
    }

    return true;
  }

  /*
   * Si la réception remet volontairement le logement
   * sur Occupé, le départ n'a finalement pas eu lieu :
   * on efface donc le timestamp technique.
   */
  if (
    nouvelEtat ===
      ETAT_RECEPTION.OCCUPE
  ) {
    celluleDepartReel.clearContent();

    return true;
  }

  return true;
}


/**
 * ============================================================
 * V3.2.9 — SÉCURITÉ DRIVE PAR RÔLES
 * ============================================================
 */

function autoriserModificationEtatMenageDriveV329_(
  evenement
) {
  if (
    !evenement ||
    !evenement.range
  ) {
    return false;
  }

  const cellule =
    evenement.range;

  const feuille =
    cellule.getSheet();

  if (
    feuille.getName() !==
      FEUILLES.MENAGE ||
    cellule.getColumn() !==
      COLONNES_MENAGE.ETAT_MENAGE
  ) {
    return true;
  }

  const ligne =
    cellule.getRow();

  const personnel =
    String(
      feuille
        .getRange(
          ligne,
          COLONNES_MENAGE.PERSONNEL
        )
        .getDisplayValue() || ""
    ).trim();

  if (
    personnel === ""
  ) {
    return true;
  }

  if (
    typeof estDoubleRolePersonnelMenageDriveV329_ ===
      "function" &&
    estDoubleRolePersonnelMenageDriveV329_(
      personnel
    )
  ) {
    return true;
  }

  const nouvelleValeur =
    String(
      typeof evenement.value !==
        "undefined"
        ? evenement.value
        : cellule.getDisplayValue()
    ).trim();

  const autorises = [
    ETAT_MENAGE.A_FAIRE,
    ETAT_MENAGE.A_VERIFIER
  ];

  if (
    autorises.indexOf(
      nouvelleValeur
    ) !== -1
  ) {
    return true;
  }

  if (
    typeof evenement.oldValue !==
      "undefined"
  ) {
    cellule.setValue(
      evenement.oldValue
    );
  } else if (
    typeof mettreAJourMenage ===
      "function"
  ) {
    mettreAJourMenage(
      false
    );
  }

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      "Personnel ménage : seuls « À faire » et « À vérifier » sont autorisés. " +
        "Le contrôle se fait dans la colonne Contrôle.",
      "⛔ Action non autorisée",
      7
    );

  return false;
}