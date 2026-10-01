/**
 * =========================================================
 * CAMPMANAGER
 * MISE À JOUR DE LA FEUILLE RÉCEPTION
 * VERSION 2.21 OPEN SOURCE — DATES CALENDAIRES SÉCURISÉES
 * =========================================================
 *
 * Reconstruction sécurisée par numéro de logement :
 * les colonnes manuelles restent attachées à leur logement
 * même si Réception a été triée auparavant.
 */

/**
 * Fonction principale de reconstruction de la feuille Réception.
 */
function mettreAJourReception(
  afficherMessage = true
) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleLogements =
    ss.getSheetByName(FEUILLES.LOGEMENTS);

  const feuilleBase =
    ss.getSheetByName(FEUILLES.BASE);

  const feuilleReception =
    ss.getSheetByName(FEUILLES.RECEPTION);

  const feuilleParametres =
    ss.getSheetByName(FEUILLES.PARAMETRES);


  /*
   * V3.2.4 — La colonne Téléphone attente doit toujours être du texte.
   * Cela préserve le 0 initial des numéros français et le + des
   * numéros internationaux.
   */
  if (
    feuilleReception
  ) {
    const nombreLignesTelephone =
      Math.max(
        feuilleReception.getMaxRows() -
          LIGNES.DEBUT +
          1,
        1
      );

    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.TELEPHONE_ATTENTE,
        nombreLignesTelephone,
        1
      )
      .setNumberFormat(
        "@"
      );
  }

  /*
   * Vérification des feuilles nécessaires.
   */
  if (
    !feuilleLogements ||
    !feuilleBase ||
    !feuilleReception ||
    !feuilleParametres
  ) {
    const message =
      "Une feuille est introuvable : " +
      "Logements, Base, Réception ou Paramètres.";

    if (afficherMessage) {
      SpreadsheetApp.getUi().alert(
        message
      );
    }

    throw new Error(
      message
    );
  }

  /*
   * Lecture de la liste des logements.
   */
  const logements =
    lireLogementsReception(
      feuilleLogements
    );

  if (logements.length === 0) {
    const message =
      "Aucun logement n'est renseigné " +
      "dans la feuille Logements.";

    if (afficherMessage) {
      SpreadsheetApp.getUi().alert(
        message
      );
    }

    throw new Error(
      message
    );
  }

  /*
   * Conservation des états déjà sélectionnés
   * dans la feuille Réception.
   */
  const etatsReception =
    lireEtatsReception(
      feuilleReception
    );

  /*
   * VERSION 2.20 :
   * conservation de la ligne existante par numéro de logement.
   *
   * C'est indispensable si Réception a été triée auparavant :
   * Personnel, Gouvernante, Téléphone attente, Dernier contrôle,
   * Départ réel et état doivent rester attachés au bon logement.
   */
  const lignesExistantesReception =
    lireLignesReceptionParLogement_(
      feuilleReception
    );

  /*
   * Lecture et classement
   * des réservations actives.
   */
  const reservationsParLogement =
    lireReservationsPourReception(
      feuilleBase
    );

  /*
   * Construction des colonnes B à G.
   */
  const lignesReception =
    construireLignesReception(
      logements,
      etatsReception,
      reservationsParLogement
    );

  /*
   * Écriture des données dans Réception.
   */
  ecrireLignesReception(
    feuilleReception,
    lignesReception,
    lignesExistantesReception
  );

  /*
   * Recalcul des transitions quotidiennes :
   * - nouveau client devenu présent ;
   * - arrivée du jour après passage sur Prêt ;
   * - logement sans réservation future devenu Libre ;
   * - recontrôle le jour de l’arrivée selon Base et le dernier contrôle ;
   * - maintien de Prêt/Libre après validation du ménage ;
   * - conservation du personnel affecté jusqu’à modification manuelle.
   */
  recalculerSituationReception_(
    feuilleReception,
    feuilleParametres,
    reservationsParLogement,
    lignesReception.length
  );

  /*
   * V3.2.3 — CLIENT DÉJÀ ARRIVÉ
   *
   * Un numéro présent en colonne Téléphone attente signifie que
   * le client est déjà sur place et attend son hébergement.
   *
   * Cette priorité est supérieure à toutes les autres.
   */
  appliquerPrioriteClientAttenteReceptionV323_(
    feuilleReception,
    lignesReception.length
  );

  /*
   * Liste déroulante de la colonne État.
   */
  appliquerListeEtatsReception(
    feuilleReception,
    feuilleParametres,
    lignesReception.length
  );

  /*
   * Liste déroulante de la colonne Personnel.
   */
  appliquerListePersonnelReception(
    feuilleReception,
    feuilleParametres,
    lignesReception.length
  );

  /*
   * Initialisation des états encore vides.
   */
  initialiserEtatsReception(
    feuilleReception,
    lignesReception.length
  );

  /*
   * Application des couleurs.
   */
  appliquerCouleursReception(
    feuilleReception
  );

  /*
   * Mise en évidence finale du client en attente.
   * Appelée après les couleurs normales pour ne pas être écrasée.
   */
  appliquerCouleurClientAttenteReceptionV323_(
    feuilleReception,
    lignesReception.length
  );

  if (afficherMessage) {
    SpreadsheetApp.getUi().alert(
      "La feuille Réception a été mise à jour."
    );
  }
}

/**
 * Lit la liste permanente des logements.
 *
 * Feuille Logements :
 * A N° logement
 * B Catégorie
 */
function lireLogementsReception(feuilleLogements) {
  const derniereLigne =
    feuilleLogements.getLastRow();

  if (derniereLigne < LIGNES.DEBUT) {
    return [];
  }

  return feuilleLogements
    .getRange(
      LIGNES.DEBUT,
      COLONNES_LOGEMENTS.LOGEMENT,
      derniereLigne - LIGNES.DEBUT + 1,
      COLONNES_LOGEMENTS.NOMBRE_COLONNES
    )
    .getValues()
    .filter(ligne => ligne[0] !== "");
}


/**
 * Lit les états déjà présents dans Réception.
 *
 * Cela permet de conserver notamment :
 * Occupé
 * Parti
 * Libre
 * Indisponible
 */
function lireEtatsReception(feuilleReception) {
  const etatsParLogement = {};

  const derniereLigne =
    feuilleReception.getLastRow();

  if (derniereLigne < LIGNES.DEBUT) {
    return etatsParLogement;
  }

  const nombreLignes =
    derniereLigne - LIGNES.DEBUT + 1;

  const nombreColonnes =
    COLONNES_RECEPTION.ETAT -
    COLONNES_RECEPTION.LOGEMENT +
    1;

  const donnees = feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.LOGEMENT,
      nombreLignes,
      nombreColonnes
    )
    .getValues();

  donnees.forEach(ligne => {
    const numeroLogement =
      normaliserNumeroLogementReception(ligne[0]);

    const indexEtat =
      COLONNES_RECEPTION.ETAT -
      COLONNES_RECEPTION.LOGEMENT;

    const etat = ligne[indexEtat];

    if (numeroLogement !== "") {
      etatsParLogement[numeroLogement] =
        String(etat || "").trim();
    }
  });

  return etatsParLogement;
}


/**
 * Sauvegarde la ligne Réception existante par numéro de logement.
 *
 * Cette lecture permet de reconstruire les colonnes automatiques B:G
 * sans désolidariser les colonnes manuelles / techniques :
 * A Priorité, H État, I Personnel, J Gouvernante,
 * K Téléphone attente, L Dernier contrôle et M Départ réel.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} feuilleReception
 * @return {Object<string, Array<*>>}
 */
function lireLignesReceptionParLogement_(
  feuilleReception
) {
  const resultat = {};

  const derniereLigne =
    feuilleReception.getLastRow();

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

  const nombreColonnes =
    COLONNES_RECEPTION.NOMBRE_COLONNES;

  const plage =
    feuilleReception.getRange(
      LIGNES.DEBUT,
      1,
      nombreLignes,
      nombreColonnes
    );

  const valeurs =
    plage.getValues();

  const affichage =
    plage.getDisplayValues();

  valeurs.forEach(
    function(ligne, index) {
      const logement =
        normaliserNumeroLogementReception(
          ligne[
            COLONNES_RECEPTION.LOGEMENT - 1
          ]
        );

      if (!logement) {
        return;
      }

      const copie =
        ligne.slice(
          0,
          nombreColonnes
        );

      /*
       * Le téléphone doit rester une chaîne afin de conserver
       * le zéro initial et les préfixes internationaux.
       */
      copie[
        COLONNES_RECEPTION.TELEPHONE_ATTENTE - 1
      ] =
        affichage[index][
          COLONNES_RECEPTION.TELEPHONE_ATTENTE - 1
        ] || "";

      resultat[
        logement
      ] =
        copie;
    }
  );

  return resultat;
}


/**
 * Lit les réservations actives présentes dans Base
 * et les classe par logement.
 */
function lireReservationsPourReception(feuilleBase) {
  const reservationsParLogement = {};

  const derniereLigne =
    feuilleBase.getLastRow();

  if (derniereLigne < LIGNES.DEBUT) {
    return reservationsParLogement;
  }

  const nombreLignes =
    derniereLigne - LIGNES.DEBUT + 1;

  const donnees = feuilleBase
    .getRange(
      LIGNES.DEBUT,
      1,
      nombreLignes,
      COLONNES_BASE.NOMBRE_COLONNES
    )
    .getValues();

  donnees.forEach(ligne => {
    const numeroReservation =
      ligne[COLONNES_BASE.NUMERO_RESERVATION - 1];

    const nomClient =
      ligne[COLONNES_BASE.NOM_CLIENT - 1];

    const dateArrivee =
      convertirEnDateReception(
        ligne[COLONNES_BASE.DATE_ARRIVEE - 1]
      );

    const dateDepart =
      convertirEnDateReception(
        ligne[COLONNES_BASE.DATE_DEPART - 1]
      );

    const numeroLogement =
      normaliserNumeroLogementReception(
        ligne[COLONNES_BASE.LOGEMENT - 1]
      );

    const etatReservation =
      String(
        ligne[
          COLONNES_BASE.ETAT_RESERVATION - 1
        ] || ""
      ).trim();

    /*
     * Toutes les réservations datées sont conservées
     * dans la structure afin de retrouver le séjour précédent.
     *
     * Seules les réservations Active seront ensuite utilisées
     * pour afficher le client actuel et les arrivées futures.
     */
    if (
      numeroLogement === "" ||
      !dateArrivee ||
      !dateDepart
    ) {
      return;
    }

    if (!reservationsParLogement[numeroLogement]) {
      reservationsParLogement[numeroLogement] = [];
    }

    reservationsParLogement[numeroLogement].push({
      numeroReservation: numeroReservation,
      nomClient: nomClient,
      dateArrivee:
        supprimerHeureReception(dateArrivee),
      dateDepart:
        supprimerHeureReception(dateDepart),
      etatReservation: etatReservation
    });
  });

  /*
   * Classement chronologique par date d'arrivée.
   */
  Object.keys(
    reservationsParLogement
  ).forEach(numeroLogement => {
    reservationsParLogement[numeroLogement].sort(
      function(reservationA, reservationB) {

        const comparaisonArrivee =
          reservationA.dateArrivee.getTime() -
          reservationB.dateArrivee.getTime();

        if (comparaisonArrivee !== 0) {
          return comparaisonArrivee;
        }

        const comparaisonDepart =
          reservationA.dateDepart.getTime() -
          reservationB.dateDepart.getTime();

        if (comparaisonDepart !== 0) {
          return comparaisonDepart;
        }

        return String(
          reservationA.numeroReservation || ""
        ).localeCompare(
          String(
            reservationB.numeroReservation || ""
          ),
          "fr",
          {
            numeric: true,
            sensitivity: "base"
          }
        );
      }
    );
  });

  return reservationsParLogement;
}


/**
 * Construit les colonnes B à G de la feuille Réception.
 *
 * B Logement
 * C Catégorie
 * D Client actuel
 * E Départ
 * F Client suivant
 * G Arrivée suivante
 */
function construireLignesReception(
  logements,
  etatsReception,
  reservationsParLogement
) {
  const aujourdHui =
    supprimerHeureReception(new Date());

  return logements.map(logement => {
    const numeroAffiche = logement[0];

    const numeroLogement =
      normaliserNumeroLogementReception(
        numeroAffiche
      );

    const categorie = logement[1];

    const etatReception =
      etatsReception[numeroLogement] || "";

    const reservations =
      reservationsParLogement[numeroLogement] || [];

    const occupation =
      determinerOccupationReception(
        reservations,
        etatReception,
        aujourdHui
      );

    return [
      numeroAffiche,
      categorie,
      occupation.clientActuel,
      occupation.dateDepart,
      occupation.clientSuivant,
      occupation.dateArriveeSuivante
    ];
  });
}


/**
 * Détermine le client actuel et le client suivant.
 *
 * Règle principale :
 * le client qui part aujourd'hui reste affiché
 * tant que la réception ne choisit pas "Parti".
 */
function determinerOccupationReception(
  reservations,
  etatReception,
  aujourdHui
) {
  const resultat = {
    clientActuel: "",
    dateDepart: "",
    clientSuivant: "",
    dateArriveeSuivante: ""
  };

  if (
    etatReception ===
    ETAT_RECEPTION.INDISPONIBLE
  ) {
    return resultat;
  }

  const dateDuJour =
    cleJourReception_(
      aujourdHui
    );

  const reservationsUtiles =
    reservations.filter(
      function(reservation) {
        return (
          reservation.etatReservation ===
            ETAT_RESERVATION.ACTIVE &&
          cleJourReception_(
            reservation.dateDepart
          ) >=
            dateDuJour
        );
      }
    );

  const reservationPresente =
    reservationsUtiles.find(
      function(reservation) {
        return (
          cleJourReception_(
            reservation.dateArrivee
          ) <
            dateDuJour &&
          cleJourReception_(
            reservation.dateDepart
          ) >=
            dateDuJour
        );
      }
    ) || null;

  const reservationSuivante =
    reservationsUtiles.find(
      function(reservation) {
        const arriveeAujourdHuiOuApres =
          cleJourReception_(
          reservation.dateArrivee
        ) >=
          dateDuJour;

        const numeroDifferent =
          !reservationPresente ||
          String(
            reservation.numeroReservation || ""
          ) !==
          String(
            reservationPresente.numeroReservation || ""
          );

        return (
          arriveeAujourdHuiOuApres &&
          numeroDifferent
        );
      }
    ) || null;

  const masquerClientSortant =
    etatReception ===
      ETAT_RECEPTION.PRET ||
    etatReception ===
      ETAT_RECEPTION.A_RECONTROLER;

  if (
    reservationPresente &&
    !masquerClientSortant
  ) {
    resultat.clientActuel =
      reservationPresente.nomClient;

    resultat.dateDepart =
      reservationPresente.dateDepart;
  }

  if (reservationSuivante) {
    resultat.clientSuivant =
      reservationSuivante.nomClient;

    resultat.dateArriveeSuivante =
      reservationSuivante.dateArrivee;
  }

  return resultat;
}


/**
 * Écrit les colonnes automatiques B à G.
 *
 * Les colonnes manuelles sont conservées :
 * A Priorité
 * H État
 * I Personnel
 */
function ecrireLignesReception(
  feuilleReception,
  lignesReception,
  lignesExistantesParLogement
) {
  const nombreColonnes =
    COLONNES_RECEPTION.NOMBRE_COLONNES;

  const anciennesLignes =
    lignesExistantesParLogement ||
    {};

  /*
   * VERSION 2.20 — RECONSTRUCTION SÉCURISÉE
   *
   * On repart de la ligne historique correspondant au numéro
   * de logement, puis on remplace uniquement les données
   * automatiques B:G.
   *
   * Ainsi un tri préalable de Réception ne peut plus décaler :
   * - l'état ;
   * - le personnel ;
   * - la gouvernante ;
   * - le téléphone d'attente ;
   * - le dernier contrôle ;
   * - le départ réel.
   */
  const lignesCompletes =
    lignesReception.map(
      function(ligneAutomatique) {
        const logement =
          normaliserNumeroLogementReception(
            ligneAutomatique[0]
          );

        const ligneExistante =
          anciennesLignes[
            logement
          ]
            ? anciennesLignes[
                logement
              ].slice(
                0,
                nombreColonnes
              )
            : Array(
                nombreColonnes
              ).fill("");

        while (
          ligneExistante.length <
            nombreColonnes
        ) {
          ligneExistante.push("");
        }

        /*
         * B:G = données calculées depuis Logements / Base.
         */
        for (
          let index = 0;
          index < 6;
          index++
        ) {
          ligneExistante[
            COLONNES_RECEPTION.LOGEMENT -
              1 +
              index
          ] =
            ligneAutomatique[
              index
            ];
        }

        return ligneExistante;
      }
    );

  const nombreLignesDisponibles =
    feuilleReception.getMaxRows() -
    LIGNES.DEBUT +
    1;

  if (
    lignesCompletes.length > 0
  ) {
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        1,
        lignesCompletes.length,
        nombreColonnes
      )
      .setValues(
        lignesCompletes
      );
  }

  /*
   * Nettoie les anciennes lignes devenues inutiles sans toucher
   * aux validations ni à la mise en forme de la feuille.
   */
  const premiereLigneAVider =
    LIGNES.DEBUT +
    lignesCompletes.length;

  const nombreLignesAVider =
    feuilleReception.getMaxRows() -
    premiereLigneAVider +
    1;

  if (
    nombreLignesAVider > 0
  ) {
    feuilleReception
      .getRange(
        premiereLigneAVider,
        1,
        nombreLignesAVider,
        nombreColonnes
      )
      .clearContent();
  }

  if (
    lignesReception.length > 0
  ) {
    appliquerMiseEnFormeReception(
      feuilleReception,
      lignesReception.length
    );
  }
}


/**
 * Initialise l'état uniquement lorsqu'il est vide.
 *
 * Le script ne remplace jamais un état
 * déjà sélectionné manuellement.
 */
function initialiserEtatsReception(
  feuilleReception,
  nombreLignes
) {
  if (
    nombreLignes === 0
  ) {
    return;
  }

  const plageEtats =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.ETAT,
        nombreLignes,
        1
      );

  const etats =
    plageEtats.getValues();

  const clientsActuels =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.CLIENT_ACTUEL,
        nombreLignes,
        1
      )
      .getValues();

  etats.forEach(
    function(ligne, index) {
      const etatActuel =
        String(
          ligne[0] || ""
        ).trim();

      if (
        etatActuel !== ""
      ) {
        return;
      }

      const clientActuel =
        String(
          clientsActuels[index][0] || ""
        ).trim();

      ligne[0] =
        clientActuel !== ""
          ? ETAT_RECEPTION.OCCUPE
          : ETAT_RECEPTION.LIBRE;
    }
  );

  plageEtats.setValues(
    etats
  );
}


/**
 * Recalcule les transitions quotidiennes de Réception.
 */
function recalculerSituationReception_(
  feuilleReception,
  feuilleParametres,
  reservationsParLogement,
  nombreLignes
) {
  if (
    nombreLignes <= 0
  ) {
    return;
  }

  const aujourdHui =
    supprimerHeureReception(
      new Date()
    );

  const delaiRecontrole =
    lireDelaiRecontroleReception_(
      feuilleParametres
    );

  const donnees =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        1,
        nombreLignes,
        COLONNES_RECEPTION.NOMBRE_COLONNES
      )
      .getValues();

  donnees.forEach(
    function(ligne) {
      const logement =
        normaliserNumeroLogementReception(
          ligne[
            COLONNES_RECEPTION.LOGEMENT - 1
          ]
        );

      if (
        logement === ""
      ) {
        return;
      }

      const reservations =
        reservationsParLogement[logement] ||
        [];

      const ancienEtat =
        String(
          ligne[
            COLONNES_RECEPTION.ETAT - 1
          ] || ""
        ).trim();

      if (
        ancienEtat ===
        ETAT_RECEPTION.INDISPONIBLE
      ) {
        ligne[
          COLONNES_RECEPTION.PRIORITE - 1
        ] = PRIORITE.NOIR;

        return;
      }

      const dernierControle =
        convertirEnDateReception(
          ligne[
            COLONNES_RECEPTION.DERNIER_CONTROLE - 1
          ]
        );

      const situation =
        determinerSituationReservationsReception_(
          reservations,
          aujourdHui
        );

      /*
       * Ménage validé Prêt pendant la journée du départ.
       *
       * La réservation sortante reste encore Active dans Base
       * jusqu'à la fin de la journée. Elle ne doit pourtant plus       * faire repasser le logement sur Occupé après actualisation.
       *
       * Règles :
       * - ancien client et date de départ restent vides ;
       * - le client suivant reste affiché ;
       * - avec une réservation future : état Prêt, priorité blanche ;
       * - sans réservation future : l'état Libre est traité
       *   par le bloc suivant.
       */
      const departSortantAujourdhui =
        situation.clientPresent &&
        sontMemeJourReception_(
          situation.clientPresent.dateDepart,
          aujourdHui
        );

      if (
        ancienEtat ===
          ETAT_RECEPTION.PRET &&
        departSortantAujourdhui
      ) {
        ligne[
          COLONNES_RECEPTION.CLIENT_ACTUEL - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.DEPART - 1
        ] = "";

        const prochaineApresMenage =
          situation.arriveeDuJour ||
          situation.prochaineReservation;

        if (
          prochaineApresMenage
        ) {
          ligne[
            COLONNES_RECEPTION.CLIENT_SUIVANT - 1
          ] =
            prochaineApresMenage.nomClient;

          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ] =
            prochaineApresMenage.dateArrivee;

          ligne[
            COLONNES_RECEPTION.ETAT - 1
          ] =
            ETAT_RECEPTION.PRET;

          ligne[
            COLONNES_RECEPTION.PRIORITE - 1
          ] =
            PRIORITE.BLANC;

        } else {
          ligne[
            COLONNES_RECEPTION.CLIENT_SUIVANT - 1
          ] = "";

          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ] = "";

          ligne[
            COLONNES_RECEPTION.ETAT - 1
          ] =
            ETAT_RECEPTION.LIBRE;

          ligne[
            COLONNES_RECEPTION.PRIORITE - 1
          ] = "";
        }

        return;
      }

      /*
       * Travail non terminé d'un jour précédent.
       *
       * Si le logement était encore « Parti » lors de la
       * dernière actualisation, il doit rester :
       *
       * - en état Parti ;
       * - en priorité bleue ;
       * - avec le personnel déjà attribué.
       *
       * Il ne redeviendra Libre qu'après validation Prêt
       * par le ménage lorsqu'aucune arrivée n'est prévue.
       */
      if (
        ancienEtat ===
          ETAT_RECEPTION.PARTI &&
        !situation.clientPresent &&
        !situation.arriveeDuJour
      ) {
        ligne[
          COLONNES_RECEPTION.ETAT - 1
        ] =
          ETAT_RECEPTION.PARTI;

        ligne[
          COLONNES_RECEPTION.PRIORITE - 1
        ] =
          PRIORITE.BLEU;

        return;
      }

      /*
       * Cas particulier :
       *
       * le client est réellement parti AUJOURD'HUI,
       * le ménage a terminé,
       * aucune arrivée actuelle ou future n'existe,
       * et Réception a été passée sur Libre.
       *
       * V3.2.8 :
       * on exige désormais que la colonne technique « Départ réel »
       * soit datée d'aujourd'hui.
       *
       * Sans ce contrôle, un ancien départ (ex. Louis le 12/08)
       * pouvait maintenir le logement sur Libre le lendemain et
       * masquer le nouveau client présent (ex. Georges du 12 au 13/08).
       */
      const departClientPresentAujourdhui =
        situation.clientPresent &&
        sontMemeJourReception_(
          situation.clientPresent.dateDepart,
          aujourdHui
        );

      const departReel =
        convertirEnDateReception(
          ligne[
            COLONNES_RECEPTION.DEPART_REEL - 1
          ]
        );

      const departReelAujourdhui =
        departReel &&
        sontMemeJourReception_(
          departReel,
          aujourdHui
        );

      const aucuneReservationFuture =
        !situation.arriveeDuJour &&
        !situation.prochaineReservation;

      if (
        ancienEtat ===
          ETAT_RECEPTION.LIBRE &&
        departClientPresentAujourdhui &&
        departReelAujourdhui &&
        aucuneReservationFuture
      ) {
        ligne[
          COLONNES_RECEPTION.CLIENT_ACTUEL - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.DEPART - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.CLIENT_SUIVANT - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.ETAT - 1
        ] =
          ETAT_RECEPTION.LIBRE;

        ligne[
          COLONNES_RECEPTION.PRIORITE - 1
        ] = "";

        return;
      }

      /*
       * 1. Un client est actuellement présent.
       */
      if (
        situation.clientPresent
      ) {
        const departClientPresent =
          situation.clientPresent.dateDepart;

        const departAujourdhui =
          sontMemeJourReception_(
            departClientPresent,
            aujourdHui
          );

        ligne[
          COLONNES_RECEPTION.CLIENT_ACTUEL - 1
        ] =
          situation.clientPresent.nomClient;

        ligne[
          COLONNES_RECEPTION.DEPART - 1
        ] =
          departClientPresent;

        if (
          situation.arriveeDuJour
        ) {
          ligne[
            COLONNES_RECEPTION.CLIENT_SUIVANT - 1
          ] =
            situation.arriveeDuJour.nomClient;

          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ] =
            situation.arriveeDuJour.dateArrivee;

        } else if (
          situation.prochaineReservation
        ) {
          ligne[
            COLONNES_RECEPTION.CLIENT_SUIVANT - 1
          ] =
            situation.prochaineReservation.nomClient;

          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ] =
            situation.prochaineReservation.dateArrivee;

        } else {
          ligne[
            COLONNES_RECEPTION.CLIENT_SUIVANT - 1
          ] = "";

          ligne[
            COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
          ] = "";
        }

        const departDejaValide =
          ancienEtat ===
            ETAT_RECEPTION.PARTI &&
          departAujourdhui;

        ligne[
          COLONNES_RECEPTION.ETAT - 1
        ] =
          departDejaValide
            ? ETAT_RECEPTION.PARTI
            : ETAT_RECEPTION.OCCUPE;

        /*
         * V3.2.8 :
         * lorsqu'une nouvelle réservation devient le client actuel,
         * un ancien timestamp « Départ réel » ne doit pas rester lié
         * au logement. Sinon le prochain passage sur Parti conserverait
         * l'heure de départ de l'ancien client.
         *
         * On le vide uniquement lorsque le client est considéré Occupé.
         */
        if (
          !departDejaValide
        ) {
          ligne[
            COLONNES_RECEPTION.DEPART_REEL - 1
          ] = "";
        }

        if (
          departAujourdhui
        ) {
          ligne[
            COLONNES_RECEPTION.PRIORITE - 1
          ] =
            situation.arriveeDuJour
              ? PRIORITE.ROUGE
              : PRIORITE.BLEU;

        } else {
          ligne[
            COLONNES_RECEPTION.PRIORITE - 1
          ] = "";
        }

        return;
      }

      /*
       * 2. Recontrôle le jour de l'arrivée selon les séjours de Base.
       *
       * La décision repose sur la date du dernier contrôle :
       *
       * - dernier contrôle antérieur à aujourd'hui :
       *   le recontrôle peut être demandé ;
       * - dernier contrôle effectué aujourd'hui :
       *   le logement reste Prêt après validation.
       *
       * Cela permet à un logement marqué Prêt la veille
       * de passer automatiquement À recontrôler le jour
       * de l'arrivée lorsque l'écart entre deux séjours
       * atteint le délai configuré.
       */
      const controleDejaEffectueAujourdhui =
        dernierControle &&
        sontMemeJourReception_(
          dernierControle,
          aujourdHui
        );

      const doitRecontroler =
        !controleDejaEffectueAujourdhui &&
        situation.arriveeDuJour &&
        situation.reservationPrecedenteArriveeDuJour &&
        differenceJoursReception_(
          situation
            .reservationPrecedenteArriveeDuJour
            .dateDepart,
          situation.arriveeDuJour.dateArrivee
        ) >= delaiRecontrole;

      if (
        doitRecontroler
      ) {
        ligne[
          COLONNES_RECEPTION.CLIENT_ACTUEL - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.DEPART - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.CLIENT_SUIVANT - 1
        ] =
          situation.arriveeDuJour.nomClient;

        ligne[
          COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
        ] =
          situation.arriveeDuJour.dateArrivee;

        ligne[
          COLONNES_RECEPTION.ETAT - 1
        ] =
          ETAT_RECEPTION.A_RECONTROLER;

        ligne[
          COLONNES_RECEPTION.PRIORITE - 1
        ] =
          PRIORITE.VIOLET;

        return;
      }

      /*
       * 3. Un logement Prêt conserve l'arrivée du jour
       * dans Client suivant jusqu'au changement de journée.
       */
      if (
        ancienEtat ===
          ETAT_RECEPTION.PRET &&
        situation.arriveeDuJour
      ) {
        ligne[
          COLONNES_RECEPTION.CLIENT_ACTUEL - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.DEPART - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.CLIENT_SUIVANT - 1
        ] =
          situation.arriveeDuJour.nomClient;

        ligne[
          COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
        ] =
          situation.arriveeDuJour.dateArrivee;

        ligne[
          COLONNES_RECEPTION.ETAT - 1
        ] =
          ETAT_RECEPTION.PRET;

        ligne[
          COLONNES_RECEPTION.PRIORITE - 1
        ] =
          PRIORITE.BLANC;

        return;
      }

      /*
       * 4. Aucun client actuellement présent.
       */
      const prochaine =
        situation.arriveeDuJour ||
        situation.prochaineReservation;

      ligne[
        COLONNES_RECEPTION.CLIENT_ACTUEL - 1
      ] = "";

      ligne[
        COLONNES_RECEPTION.DEPART - 1
      ] = "";

      if (
        prochaine
      ) {
        ligne[
          COLONNES_RECEPTION.CLIENT_SUIVANT - 1
        ] =
          prochaine.nomClient;

        ligne[
          COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
        ] =
          prochaine.dateArrivee;

        if (
          ancienEtat ===
            ETAT_RECEPTION.PRET
        ) {
          ligne[
            COLONNES_RECEPTION.ETAT - 1
          ] =
            ETAT_RECEPTION.PRET;

          ligne[
            COLONNES_RECEPTION.PRIORITE - 1
          ] =
            PRIORITE.BLANC;

        } else if (
          ancienEtat ===
            ETAT_RECEPTION.PARTI
        ) {
          ligne[
            COLONNES_RECEPTION.ETAT - 1
          ] =
            ETAT_RECEPTION.PARTI;

          ligne[
            COLONNES_RECEPTION.PRIORITE - 1
          ] =
            PRIORITE.BLEU;

        } else {
          ligne[
            COLONNES_RECEPTION.ETAT - 1
          ] =
            ETAT_RECEPTION.LIBRE;

          ligne[
            COLONNES_RECEPTION.PRIORITE - 1
          ] = "";
        }

      } else {
        ligne[
          COLONNES_RECEPTION.CLIENT_SUIVANT - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
        ] = "";

        ligne[
          COLONNES_RECEPTION.ETAT - 1
        ] =
          ETAT_RECEPTION.LIBRE;

        ligne[
          COLONNES_RECEPTION.PRIORITE - 1
        ] = "";
      }
    }
  );

  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      1,
      nombreLignes,
      COLONNES_RECEPTION.NOMBRE_COLONNES
    )
    .setValues(
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

  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.DERNIER_CONTROLE,
      nombreLignes,
      1
    )
    .setNumberFormat(
      "dd/MM/yyyy"
    );
}


/**
 * Analyse les réservations utiles d’un logement.
 */
function determinerSituationReservationsReception_(
  reservations,
  aujourdHui
) {
  const dateDuJour =
    cleJourReception_(
      aujourdHui
    );

  /*
   * Réservations actives utilisées pour l'affichage courant.
   */
  const actives =
    reservations.filter(
      function(reservation) {
        return (
          reservation.etatReservation ===
          ETAT_RESERVATION.ACTIVE
        );
      }
    );

  const utiles =
    actives.filter(
      function(reservation) {
        return (
          reservation.dateDepart.getTime() >=
          dateDuJour
        );
      }
    );

  const clientPresent =
    utiles.find(
      function(reservation) {
        return (
          cleJourReception_(
            reservation.dateArrivee
          ) <
            dateDuJour &&
          cleJourReception_(
            reservation.dateDepart
          ) >=
            dateDuJour
        );
      }
    ) || null;

  const arriveeDuJour =
    utiles.find(
      function(reservation) {
        return (
          cleJourReception_(
          reservation.dateArrivee
        ) ===
          dateDuJour &&
          (
            !clientPresent ||
            String(
              reservation.numeroReservation || ""
            ) !==
            String(
              clientPresent.numeroReservation || ""
            )
          )
        );
      }
    ) || null;

  const prochaineReservation =
    utiles.find(
      function(reservation) {
        return (
          cleJourReception_(
          reservation.dateArrivee
        ) >
          dateDuJour
        );
      }
    ) || null;

  let apresArriveeDuJour =
    null;

  if (
    arriveeDuJour
  ) {
    const indexArrivee =
      utiles.findIndex(
        function(reservation) {
          return (
            String(
              reservation.numeroReservation || ""
            ) ===
            String(
              arriveeDuJour.numeroReservation || ""
            )
          );
        }
      );

    if (
      indexArrivee !== -1
    ) {
      apresArriveeDuJour =
        utiles[
          indexArrivee + 1
        ] || null;
    }
  }

  /*
   * Recherche du dernier séjour terminé avant
   * l'arrivée du jour, directement dans Base.
   *
   * Il peut être encore Active ou déjà Annulée
   * après sa disparition d'Import : ses dates restent
   * néanmoins utiles pour mesurer la période sans location.
   */
  let reservationPrecedenteArriveeDuJour =
    null;

  if (
    arriveeDuJour
  ) {
    const arrivee =
      arriveeDuJour.dateArrivee.getTime();

    reservations.forEach(
      function(reservation) {
        const numeroDifferent =
          String(
            reservation.numeroReservation || ""
          ) !==
          String(
            arriveeDuJour.numeroReservation || ""
          );

        const termineeAvantArrivee =
          reservation.dateDepart.getTime() <
          arrivee;

        if (
          !numeroDifferent ||
          !termineeAvantArrivee
        ) {
          return;
        }

        if (
          !reservationPrecedenteArriveeDuJour ||
          reservation.dateDepart.getTime() >
            reservationPrecedenteArriveeDuJour
              .dateDepart
              .getTime()
        ) {
          reservationPrecedenteArriveeDuJour =
            reservation;
        }
      }
    );
  }

  return {
    clientPresent: clientPresent,
    arriveeDuJour: arriveeDuJour,
    prochaineReservation:
      prochaineReservation,
    apresArriveeDuJour:
      apresArriveeDuJour,
    reservationPrecedenteArriveeDuJour:
      reservationPrecedenteArriveeDuJour
  };
}


/**
 * Lit le délai de recontrôle configuré.
 */
function lireDelaiRecontroleReception_(
  feuilleParametres
) {
  let valeur =
    CONFIGURATION.DELAI_RECONTROLE_JOURS;

  if (
    feuilleParametres
  ) {
    const valeurParametre =
      Number(
        feuilleParametres
          .getRange(
            CELLULES_PARAMETRES.DELAI_RECONTROLE
          )
          .getValue()
      );

    if (
      isFinite(
        valeurParametre
      ) &&
      valeurParametre >= 0
    ) {
      valeur =
        valeurParametre;
    }
  }

  return valeur;
}


/**
 * Calcule un écart en jours calendaires.
 */
function differenceJoursReception_(
  dateDebut,
  dateFin
) {
  const debut =
    supprimerHeureReception(
      convertirEnDateReception(
        dateDebut
      )
    );

  const fin =
    supprimerHeureReception(
      convertirEnDateReception(
        dateFin
      )
    );

  return Math.floor(
    (
      fin.getTime() -
      debut.getTime()
    ) /
    86400000
  );
}


/**
 * Compatibilité avec les anciens modules.
 *
 * Depuis la version 2.20, une validation Ménage met déjà à jour
 * uniquement le logement concerné. Il ne faut plus reconstruire
 * toute la feuille Réception à cet endroit.
 */
function actualiserReceptionApresValidationMenage() {
  SpreadsheetApp.flush();
}


/**
 * Efface une seule fois par jour toutes les affectations
 * de personnel présentes dans Réception.
 */
function reinitialiserPersonnelReceptionNouveauJour_(
  feuilleReception
) {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const dateDuJour =
    Utilities.formatDate(
      new Date(),
      classeur.getSpreadsheetTimeZone(),
      "yyyy-MM-dd"
    );

  const cle =
    "CAMPMANAGER_DERNIER_NETTOYAGE_PERSONNEL_RECEPTION";

  const proprietes =
    PropertiesService.getDocumentProperties();

  if (
    proprietes.getProperty(
      cle
    ) === dateDuJour
  ) {
    return;
  }

  const nombreLignes =
    feuilleReception.getMaxRows() -
    LIGNES.DEBUT +
    1;

  if (
    nombreLignes > 0
  ) {
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.PERSONNEL,
        nombreLignes,
        1
      )
      .clearContent();
  }

  proprietes.setProperty(
    cle,
    dateDuJour
  );
}


/**
 * Ajoute la liste déroulante de la colonne État.
 *
 * Les états sont lus dans la colonne A
 * de la feuille Paramètres, à partir de la ligne 5.
 */
function appliquerListeEtatsReception(
  feuilleReception,
  feuilleParametres,
  nombreLignes
) {
  if (
    !feuilleParametres ||
    nombreLignes === 0
  ) {
    return;
  }

  const derniereLigne =
    feuilleParametres.getLastRow();

  if (derniereLigne < LIGNES.DEBUT) {
    return;
  }

  const plageEtats = feuilleParametres
    .getRange(
      LIGNES.DEBUT,
      COLONNES_PARAMETRES.ETATS_RECEPTION,
      derniereLigne - LIGNES.DEBUT + 1,
      1
    );

  const validation = SpreadsheetApp
    .newDataValidation()
    .requireValueInRange(plageEtats, true)
    .setAllowInvalid(false)
    .build();

  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.ETAT,
      nombreLignes,
      1
    )
    .setDataValidation(validation);
}


/**
 * Mise en forme des colonnes automatiques.
 */
function appliquerMiseEnFormeReception(
  feuilleReception,
  nombreLignes
) {
  /*
   * N° logement et catégorie à gauche.
   */
  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.LOGEMENT,
      nombreLignes,
      2
    )
    .setHorizontalAlignment("left");

  /*
   * Noms des clients à gauche.
   */
  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.CLIENT_ACTUEL,
      nombreLignes,
      1
    )
    .setHorizontalAlignment("left");

  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.CLIENT_SUIVANT,
      nombreLignes,
      1
    )
    .setHorizontalAlignment("left");

  /*
   * Dates centrées.
   */
  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.DEPART,
      nombreLignes,
      1
    )
    .setHorizontalAlignment("center")
    .setNumberFormat("dd/MM/yyyy");

  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.ARRIVEE_SUIVANTE,
      nombreLignes,
      1
    )
    .setHorizontalAlignment("center")
    .setNumberFormat("dd/MM/yyyy");
}


/**
 * Compare deux dates sans tenir compte de l'heure.
 */
function cleJourReception_(
  valeur
) {
  const date =
    convertirEnDateReception(
      valeur
    );

  if (!date) {
    return null;
  }

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const fuseau =
    classeur
      ? classeur.getSpreadsheetTimeZone()
      : Session.getScriptTimeZone();

  return Number(
    Utilities.formatDate(
      date,
      fuseau,
      "yyyyMMdd"
    )
  );
}


function sontMemeJourReception_(
  dateA,
  dateB
) {
  const premiereDate =
    convertirEnDateReception(
      dateA
    );

  const deuxiemeDate =
    convertirEnDateReception(
      dateB
    );

  if (
    !premiereDate ||
    !deuxiemeDate
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
 * Supprime les heures, minutes et secondes
 * d'une date.
 */
function supprimerHeureReception(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );}


/**
 * Convertit une valeur Google Sheets
 * en date JavaScript.
 */
function convertirEnDateReception(valeur) {
  if (
    valeur instanceof Date &&
    !isNaN(valeur.getTime())
  ) {
    return valeur;
  }

  if (!valeur) {
    return null;
  }

  const date = new Date(valeur);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}


/**
 * Uniformise les numéros de logement.
 *
 * Exemple :
 * 601 et "601" sont considérés
 * comme le même logement.
 */
function normaliserNumeroLogementReception(
  numero
) {
  if (
    numero === null ||
    numero === undefined ||
    numero === ""
  ) {
    return "";
  }

  return String(numero).trim();
}

/**
 * Applique la liste déroulante du personnel
 * dans la colonne I de la feuille Réception.
 *
 * La liste contient uniquement les employés
 * actifs et les extras présents dans la colonne I
 * de la feuille Paramètres.
 */
function appliquerListePersonnelReception(
  feuilleReception,
  feuilleParametres,
  nombreLignes
) {
  if (
    nombreLignes <= 0
  ) {
    return;
  }

  if (!feuilleParametres) {
    throw new Error(
      "La feuille Paramètres est introuvable."
    );
  }

  const derniereLigneParametres =
    feuilleParametres.getLastRow();

  if (
    derniereLigneParametres <
    LIGNES.DEBUT
  ) {
    return;
  }

  const nombreValeurs =
    derniereLigneParametres -
    LIGNES.DEBUT +
    1;

  /*
   * Lecture des prénoms disponibles.
   */
  const personnes =
    feuilleParametres
      .getRange(
        LIGNES.DEBUT,
        COLONNES_PARAMETRES.PERSONNEL_DISPONIBLE,
        nombreValeurs,
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

  /*
   * Lecture des équipes déjà constituées,
   * par exemple Personne A/Personne B.
   *
   * Elles sont ajoutées aux valeurs autorisées
   * afin d'éviter l'avertissement « Non valide ».
   */
  const equipesExistantes =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.PERSONNEL,
        nombreLignes,
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
      "🗑 Effacer"
    ])
    .concat(equipesExistantes)
    .forEach(function(valeur) {
      if (
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
        "Sélectionnez les prénoms l’un après l’autre. " +
        "Le binôme sera classé automatiquement, par exemple Personne A/Personne B."
      )
      .build();

  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.PERSONNEL,
      nombreLignes,
      1
    )
    .setDataValidation(
      validation
    );
}

/**
 * ============================================================
 * V3.2.3 — PRIORITÉ ⚠️ CLIENT EN ATTENTE
 * ============================================================
 */


/**
 * Force ⚠️ lorsque Téléphone attente est renseigné.
 *
 * Si le logement est déjà Prêt ou Libre, la priorité ⚠️ n'est
 * plus appliquée. Le téléphone reste visible afin que la Réception
 * puisse rappeler le client puis le supprimer manuellement.
 */
function appliquerPrioriteClientAttenteReceptionV323_(
  feuilleReception,
  nombreLignes
) {
  if (
    !feuilleReception ||
    nombreLignes <= 0
  ) {
    return;
  }

  /*
   * Toujours conserver les téléphones comme texte.
   */
  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      COLONNES_RECEPTION.TELEPHONE_ATTENTE,
      nombreLignes,
      1
    )
    .setNumberFormat(
      "@"
    );

  const nombreColonnes =
    COLONNES_RECEPTION.NOMBRE_COLONNES;

  const donnees =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        1,
        nombreLignes,
        nombreColonnes
      )
      .getValues();

  let modification = false;

  donnees.forEach(
    function(ligne) {
      const telephone =
        String(
          ligne[
            COLONNES_RECEPTION.TELEPHONE_ATTENTE - 1
          ] || ""
        ).trim();

      const etat =
        String(
          ligne[
            COLONNES_RECEPTION.ETAT - 1
          ] || ""
        ).trim();

      /*
       * Le téléphone reste présent lorsque le logement devient Prêt :
       * la Réception doit pouvoir appeler le client puis supprimer
       * elle-même le numéro après l'appel.
       */
      if (
        telephone !== "" &&
        etat !== ETAT_RECEPTION.PRET &&
        etat !== ETAT_RECEPTION.LIBRE
      ) {
        ligne[
          COLONNES_RECEPTION.PRIORITE - 1
        ] = "⚠️";

        modification = true;
      }
    }
  );

  if (
    modification
  ) {
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        1,
        nombreLignes,
        nombreColonnes
      )
      .setValues(
        donnees
      );
  }
}


/**
 * Jaune vif sur la priorité et le téléphone afin que le cas
 * soit immédiatement visible depuis la Réception.
 */
function appliquerCouleurClientAttenteReceptionV323_(
  feuilleReception,
  nombreLignes
) {
  if (
    !feuilleReception ||
    nombreLignes <= 0
  ) {
    return;
  }

  const debut =
    LIGNES.DEBUT;

  const telephones =
    feuilleReception
      .getRange(
        debut,
        COLONNES_RECEPTION.TELEPHONE_ATTENTE,
        nombreLignes,
        1
      )
      .getDisplayValues();

  const etats =
    feuilleReception
      .getRange(
        debut,
        COLONNES_RECEPTION.ETAT,
        nombreLignes,
        1
      )
      .getDisplayValues();

  telephones.forEach(
    function(ligne, index) {
      const telephone =
        String(
          ligne[0] || ""
        ).trim();

      const etat =
        String(
          etats[index][0] || ""
        ).trim();

      const ligneFeuille =
        debut +
        index;

      const attenteActive =
        telephone !== "" &&
        etat !== ETAT_RECEPTION.PRET &&
        etat !== ETAT_RECEPTION.LIBRE;

      if (
        attenteActive
      ) {
        /*
         * La couleur et le symbole sont réappliqués ensemble.
         * Ainsi une priorité rouge recalculée lors du passage sur
         * « Parti » ne peut pas rester affichée sur fond jaune.
         */
        feuilleReception
          .getRange(
            ligneFeuille,
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

        feuilleReception
          .getRange(
            ligneFeuille,
            COLONNES_RECEPTION.TELEPHONE_ATTENTE
          )
          .setBackground(
            "#FFF3BF"
          )
          .setFontColor(
            "#000000"
          )
          .setFontWeight(
            "bold"
          );
      } else if (
        telephone !== ""
      ) {
        /*
         * Logement prêt : la ligne jaune disparaît,
         * mais le numéro reste visible jusqu'à suppression manuelle.
         */
        feuilleReception
          .getRange(
            ligneFeuille,
            COLONNES_RECEPTION.TELEPHONE_ATTENTE
          )
          .setBackground(
            null
          )
          .setFontWeight(
            "normal"
          );
      }
    }
  );
}


/**
 * ============================================================
 * V3.2.8 — DIAGNOSTIC CLIENT PRÉSENT
 * ============================================================
 *
 * Ne modifie aucune donnée.
 * Permet de vérifier un logement précis depuis Apps Script.
 *
 * Exemple :
 * diagnosticClientPresentV328("201")
 */
function diagnosticClientPresentV328(
  logementRecherche
) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleBase =
    ss.getSheetByName(
      FEUILLES.BASE
    );

  const feuilleReception =
    ss.getSheetByName(
      FEUILLES.RECEPTION
    );

  if (
    !feuilleBase ||
    !feuilleReception
  ) {
    throw new Error(
      "Base ou Réception introuvable."
    );
  }

  const logement =
    normaliserNumeroLogementReception(
      logementRecherche
    );

  const reservationsParLogement =
    lireReservationsPourReception(
      feuilleBase
    );

  const reservations =
    reservationsParLogement[
      logement
    ] || [];

  const aujourdHui =
    supprimerHeureReception(
      new Date()
    );

  const situation =
    determinerSituationReservationsReception_(
      reservations,
      aujourdHui
    );

  const ligneReception =
    trouverLigneReceptionV328_(
      feuilleReception,
      logement
    );

  let etatReception = "";
  let departReel = "";

  if (
    ligneReception
  ) {
    etatReception =
      feuilleReception
        .getRange(
          ligneReception,
          COLONNES_RECEPTION.ETAT
        )
        .getDisplayValue();

    departReel =
      feuilleReception
        .getRange(
          ligneReception,
          COLONNES_RECEPTION.DEPART_REEL
        )
        .getDisplayValue();
  }

  const message =
    "Logement : " +
    logement +
    "\n\nClient présent détecté : " +
    (
      situation.clientPresent
        ? situation.clientPresent.nomClient
        : "aucun"
    ) +
    "\nDépart du client présent : " +
    (
      situation.clientPresent
        ? Utilities.formatDate(
            situation.clientPresent.dateDepart,
            Session.getScriptTimeZone(),
            "dd/MM/yyyy"
          )
        : "-"
    ) +
    "\nÉtat Réception actuel : " +
    etatReception +
    "\nDépart réel mémorisé : " +
    (
      departReel || "-"
    );

  SpreadsheetApp
    .getUi()
    .alert(
      "Diagnostic CampManager",
      message,
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return message;
}


function trouverLigneReceptionV328_(
  feuilleReception,
  logementRecherche
) {
  const derniereLigne =
    feuilleReception.getLastRow();

  if (
    derniereLigne <
      LIGNES.DEBUT
  ) {
    return 0;
  }

  const valeurs =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.LOGEMENT,
        derniereLigne -
          LIGNES.DEBUT +
          1,
        1
      )
      .getDisplayValues();

  for (
    let index = 0;
    index < valeurs.length;
    index++
  ) {
    if (
      normaliserNumeroLogementReception(
        valeurs[index][0]
      ) ===
        logementRecherche
    ) {
      return (
        LIGNES.DEBUT +
        index
      );
    }
  }

  return 0;
}