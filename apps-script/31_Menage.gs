/**
 * ============================================================
 * CAMPMANAGER
 * FEUILLE MÉNAGE — VERSION V3.3.1 OPEN SOURCE — SECOURS DRIVE + RÔLES
 * ============================================================
 *
 * Colonnes visibles :
 *
 * A N°
 * B Personnel
 * C Priorité
 * D Accès
 * E État ménage
 * G Check
 * H État
 *
 * Colonne technique :
 *
 * F État réception — cachée
 *
 * V3.2.10 : G/H servent de secours en cas d'impossibilité
 * d'accès à CampManager V4. La colonne A est figée.
 *
 * Les anciennes colonnes de dates sont supprimées physiquement.
 * Lorsqu'elles sont nécessaires, elles sont lues
 * directement dans la feuille Réception.
 */


/* ============================================================
 * PARTIE 1 — FONCTION PRINCIPALE
 * ============================================================
 */

/**
 * Met à jour la feuille Ménage.
 *
 * @param {boolean} afficherMessage
 *
 * @return {Array<Object>}
 */
function mettreAJourMenage(
  afficherMessage = true
) {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  try {
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

    if (!feuilleMenage) {
      throw new Error(
        "La feuille Ménage est introuvable."
      );
    }

    /*
     * V3.2.5 — Avant de construire Ménage, on remet systématiquement
     * ⚠️ sur tout logement qui possède un téléphone d'attente et
     * qui n'est pas encore Prêt/Libre.
     *
     * Cela évite qu'un passage manuel Occupé -> Parti remette
     * temporairement la priorité rouge.
     */
    if (
      typeof appliquerPrioriteClientAttenteReceptionV323_ ===
        "function"
    ) {
      appliquerPrioriteClientAttenteReceptionV323_(
        feuilleReception,
        Math.max(
          feuilleReception.getLastRow() -
            LIGNES.DEBUT +
            1,
          0
        )
      );
    }

    const donneesExistantes =
      lireDonneesMenageExistantes(
        feuilleMenage
      );

    const lignesMenage =
      construireLignesMenage(
        feuilleReception,
        donneesExistantes
      );

    trierLignesMenage_(
      lignesMenage
    );

    /*
     * Migration physique de l'ancienne feuille :
     * suppression des anciennes colonnes Départ,
     * Arrivée et ancien État réception.
     */
    preparerStructureMenageV3_(
      feuilleMenage
    );

    ecrireEntetesMenage(
      feuilleMenage
    );

    appliquerPresentationMobileMenage_(
      feuilleMenage
    );

    nettoyerDonneesMenage(
      feuilleMenage
    );

    ecrireDonneesMenage_(
      feuilleMenage,
      lignesMenage
    );

    appliquerListeEtatsMenage(
      feuilleMenage,
      lignesMenage.length
    );

    appliquerFormatsMenage(
      feuilleMenage,
      lignesMenage.length
    );

    masquerColonneEtatReceptionMenage(
      feuilleMenage
    );

    appliquerCouleursMenage(
      feuilleMenage
    );

    appliquerCouleurClientAttenteMenageV323_(
      feuilleMenage
    );

     if (
      typeof appliquerSecoursDriveMenageV3210_ ===
        "function"
    ) {
      appliquerSecoursDriveMenageV3210_(
        feuilleMenage
      );
    }

    SpreadsheetApp.flush();

    if (afficherMessage) {
      classeur.toast(
        "La feuille Ménage a été mise à jour.",
        "🧹 Ménage",
        4
      );
    }

    return lignesMenage;

  } catch (erreur) {
    console.error(
      "Erreur de mise à jour Ménage :",
      erreur
    );

    if (afficherMessage) {
      classeur.toast(
        "La mise à jour a échoué : " +
          obtenirMessageErreurMenage_(
            erreur
          ),
        "❌ Ménage",
        8
      );
    }

    throw erreur;
  }
}


/* ============================================================
 * PARTIE 2 — CONSTRUCTION
 * ============================================================
 */

/**
 * Prépare la feuille Ménage en conservant huit colonnes.
 *
 * Structure V3.2.10 :
 * A N°
 * B Personnel
 * C Priorité
 * D Accès
 * E État ménage
 * F État réception — cachée
 * G Check
 * H État
 *
 * Les colonnes G/H sont reconstruites ensuite par
 * appliquerSecoursDriveMenageV3210_().
 */
function preparerStructureMenageV3_(
  feuilleMenage
) {
  try {
    feuilleMenage.showColumns(
      1,
      feuilleMenage.getMaxColumns()
    );
  } catch (erreur) {
    console.log(
      "Affichage préalable des colonnes impossible : " +
        erreur.message
    );
  }

  /*
   * V3.2.10 :
   * on conserve désormais 8 colonnes.
   *
   * A à F = structure stable
   * G Check
   * H État secours
   */
  const nombreColonnes =
    feuilleMenage.getMaxColumns();

  if (
    nombreColonnes < 8
  ) {
    feuilleMenage.insertColumnsAfter(
      nombreColonnes,
      8 - nombreColonnes
    );
  }

  /*
   * Nettoyage avant reconstruction.
   * Les deux colonnes de secours seront recréées
   * par appliquerSecoursDriveMenageV3210_().
   */
  feuilleMenage
    .getRange(
      1,
      1,
      feuilleMenage.getMaxRows(),
      8
    )
    .clearContent()
    .clearDataValidations();

  feuilleMenage
    .getRange("A1:H4")
    .breakApart();
}


/**
 * Écrit les en-têtes.
 */
function ecrireEntetesMenage(
  feuilleMenage
) {
  /*
   * Nettoyage de l'ancienne présentation à 8 colonnes.
   */
  feuilleMenage
    .getRange("A1:H4")
    .breakApart();

  feuilleMenage
    .getRange("A1:H3")
    .clearContent()
    .setBackground("#ffffff")
    .setFontColor("#000000")
    .setFontWeight("normal");

  feuilleMenage.setRowHeight(
    3,
    12
  );

  const entetes = [[
    "N°",
    "Personnel",
    "●",
    "■",
    "État ménage",
    "État réception"
  ]];

  feuilleMenage
    .getRange(
      LIGNES.ENTETES,
      COLONNES_MENAGE.LOGEMENT,
      1,
      COLONNES_MENAGE.NOMBRE_COLONNES
    )
    .setValues(
      entetes
    )
    .setBackground("#17365d")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(12)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  feuilleMenage
    .getRange(
      LIGNES.ENTETES,
      COLONNES_MENAGE.PRIORITE,
      1,
      2
    )
    .setFontSize(20);
}


/**
 * Nettoie les anciennes données,
 * y compris les anciennes colonnes F à H.
 */
function nettoyerDonneesMenage(
  feuilleMenage
) {
  const nombreLignes =
    feuilleMenage.getMaxRows() -
    LIGNES.DEBUT +
    1;

  if (
    nombreLignes <= 0
  ) {
    return;
  }

  const zone =
    feuilleMenage.getRange(
      LIGNES.DEBUT,
      1,
      nombreLignes,
      6
    );

  zone.clearContent();
  zone.clearDataValidations();

  zone
    .setBackground(
      COULEURS.BLANC
    )
    .setFontColor(
      COULEURS_TEXTE.NOIR
    );
}


/**
 * Construit les lignes Ménage à partir de Réception.
 *
 * Les anciennes lignes non terminées sont conservées.
 * Les anciennes lignes Prêt ou Libre disparaissent
 * dès qu'aucun nouveau travail n'est demandé.
 *
 * @return {Array<Object>}
 */
function construireLignesMenage(
  feuilleReception,
  donneesExistantes
) {
  const lignesMenage = [];

  const derniereLigne =
    feuilleReception.getLastRow();

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return lignesMenage;
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const donneesReception =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        1,
        nombreLignes,
        COLONNES_RECEPTION.NOMBRE_COLONNES
      )
      .getValues();

  donneesReception.forEach(
    function(ligneReception) {
      const logement =
        normaliserValeurMenage(
          ligneReception[
            COLONNES_RECEPTION.LOGEMENT - 1
          ]
        );

      if (!logement) {
        return;
      }

      const ancienneLigne =
        donneesExistantes[logement] ||
        null;

      const etatReception =
        normaliserEtatReceptionMenage_(
          ligneReception[
            COLONNES_RECEPTION.ETAT - 1
          ]
        );

      /*
       * V3.2.6 STABLE — règle métier définitive :
       *
       * Prêt / Libre / Indisponible = aucun travail Ménage.
       *
       * On sort AVANT toute conservation d'une ancienne ligne.
       * Ainsi un ancien « À faire » ne peut plus survivre si
       * Réception est déjà passée sur « Prêt ».
       */
      if (
        etatReception === ETAT_RECEPTION.PRET ||
        etatReception === ETAT_RECEPTION.LIBRE ||
        etatReception === ETAT_RECEPTION.INDISPONIBLE
      ) {
        return;
      }

      const departReception =
        ligneReception[
          COLONNES_RECEPTION.DEPART - 1
        ];

      const arriveeReception =
        ligneReception[
          COLONNES_RECEPTION.ARRIVEE_SUIVANTE - 1
        ];

      const personnelReception =
        normaliserPersonnelMenage_(
          ligneReception[
            COLONNES_RECEPTION.PERSONNEL - 1
          ]
        );

      const nouveauTravailReception =
        doitApparaitreDansMenage(
          departReception,
          etatReception
        );

      /*
       * Un ancien recontrôle supprimé dans Réception
       * ne doit pas rester dans Ménage.
       */
      if (
        ancienneLigne &&
        ancienneLigne.etatMenage ===
          ETAT_MENAGE.A_RECONTROLER &&
        etatReception !==
          ETAT_RECEPTION.A_RECONTROLER
      ) {
        if (
          !nouveauTravailReception
        ) {
          return;
        }
      }

      /*
       * Une ancienne ligne terminée disparaît
       * si aucun nouveau travail n'est demandé.
       */
      const ancienneLigneTerminee =
        ancienneLigne &&
        (
          ancienneLigne.etatMenage ===
            ETAT_MENAGE.PRET ||
          etatReception ===
            ETAT_RECEPTION.LIBRE
        );

      if (
        ancienneLigneTerminee &&
        !nouveauTravailReception
      ) {
        return;
      }

      if (
        !ancienneLigne &&
        !nouveauTravailReception
      ) {
        return;
      }

      let etatMenage =
        ancienneLigne
          ? ancienneLigne.etatMenage
          : determinerEtatMenageInitial(
              logement,
              etatReception,
              donneesExistantes
            );

      /*
       * Nouveau travail après une ancienne ligne terminée :
       * reprise en À faire.
       */
      if (
        ancienneLigneTerminee &&
        nouveauTravailReception
      ) {
        etatMenage =
          ETAT_MENAGE.A_FAIRE;
      }

      if (
        etatReception ===
        ETAT_RECEPTION.A_RECONTROLER
      ) {
        etatMenage =
          ETAT_MENAGE.A_RECONTROLER;
      }

      let acces =
        determinerAccesMenage(
          etatReception
        );

      let priorite =
        determinerPrioriteMenageDepuisReception_(
          ligneReception,
          etatReception
        );

      if (
        etatMenage ===
        ETAT_MENAGE.PRET
      ) {
        acces =
          ACCES_MENAGE.PRET;

        priorite =
          PRIORITE.BLANC;
      }

      const personnel =
        personnelReception ||
        (
          ancienneLigne
            ? ancienneLigne.personnel
            : ""
        );

      const etatReceptionMenage =
        etatMenage ===
          ETAT_MENAGE.PRET
          ? (
              etatReception ===
                ETAT_RECEPTION.LIBRE
                ? ETAT_RECEPTION.LIBRE
                : ETAT_RECEPTION.PRET
            )
          : (
              etatReception ||
              (
                ancienneLigne
                  ? ancienneLigne.etatReception
                  : ""
              )
            );

      lignesMenage.push(
        creerLigneMenage_(
          logement,
          acces ||
            (
              ancienneLigne
                ? ancienneLigne.acces
                : ""
            ),
          priorite,
          personnel,
          etatMenage,
          etatReceptionMenage
        )
      );
    }
  );

  return lignesMenage;
}


/**
 * Détermine si un logement doit apparaître dans Ménage.
 */
function doitApparaitreDansMenage(
  depart,
  etatReception
) {
  if (
    etatReception ===
    ETAT_RECEPTION.INDISPONIBLE
  ) {
    return false;
  }

  if (
    etatReception ===
    ETAT_RECEPTION.A_RECONTROLER
  ) {
    return true;
  }

  if (
    etatReception ===
    ETAT_RECEPTION.OCCUPE
  ) {
    return (
      depart &&
      sontMemeJourMenage(
        depart,
        new Date()
      )
    );
  }

  if (
    etatReception ===
    ETAT_RECEPTION.PARTI
  ) {
    return true;
  }

  /*
   * Un logement Prêt n'est plus un travail Ménage :
   * il doit disparaître immédiatement de la feuille.
   */
  if (
    etatReception ===
    ETAT_RECEPTION.PRET
  ) {
    return false;
  }

  return false;
}


/**
 * Traduit l'état Réception en couleur d'accès.
 */
function determinerAccesMenage(
  etatReception
) {
  if (
    etatReception ===
    ETAT_RECEPTION.OCCUPE
  ) {
    return ACCES_MENAGE.PRESENT;
  }

  if (
    etatReception ===
    ETAT_RECEPTION.PARTI
  ) {
    return ACCES_MENAGE.PARTI;
  }

  if (
    etatReception ===
      ETAT_RECEPTION.A_RECONTROLER ||
    etatReception ===
      ETAT_RECEPTION.PRET
  ) {
    return ACCES_MENAGE.PRET;
  }

  return "";
}


/**
 * Reprend directement la priorité calculée dans Réception.
 *
 * Cela évite de stocker les dates dans Ménage.
 */
function determinerPrioriteMenageDepuisReception_(
  ligneReception,
  etatReception
) {
  const prioriteReception =
    normaliserValeurMenage(
      ligneReception[
        COLONNES_RECEPTION.PRIORITE - 1
      ]
    );

  /*
   * ⚠️ Client déjà arrivé : priorité absolue,
   * même si le logement était normalement à recontrôler.
   */
  if (
    prioriteReception === "⚠️"
  ) {
    return "⚠️";
  }

  if (
    etatReception ===
    ETAT_RECEPTION.A_RECONTROLER
  ) {
    return PRIORITE.VIOLET;
  }

  if (
    etatReception ===
    ETAT_RECEPTION.PRET
  ) {
    return PRIORITE.BLANC;
  }

  if (
    prioriteReception !== ""
  ) {
    return prioriteReception;
  }

  return PRIORITE.BLEU;
}


/**
 * Compatibilité avec les anciennes fonctions.
 */
function determinerPrioriteMenage(
  depart,
  arriveeSuivante,
  etatReception
) {
  if (
    etatReception ===
    ETAT_RECEPTION.A_RECONTROLER
  ) {
    return PRIORITE.VIOLET;
  }

  if (
    etatReception ===
    ETAT_RECEPTION.PRET
  ) {
    return PRIORITE.BLANC;
  }

  if (
    depart &&
    arriveeSuivante &&
    sontMemeJourMenage(
      depart,
      arriveeSuivante
    )
  ) {
    return PRIORITE.ROUGE;
  }

  return PRIORITE.BLEU;
}


/**
 * Détermine l'état initial.
 */
function determinerEtatMenageInitial(
  logement,
  etatReception,
  donneesExistantes
) {
  const ancienneLigne =
    donneesExistantes[logement] ||
    null;

  if (ancienneLigne) {
    return ancienneLigne.etatMenage;
  }

  if (
    etatReception ===
    ETAT_RECEPTION.PRET
  ) {
    return ETAT_MENAGE.PRET;
  }

  if (
    etatReception ===
    ETAT_RECEPTION.A_RECONTROLER
  ) {
    return ETAT_MENAGE.A_RECONTROLER;
  }

  return ETAT_MENAGE.A_FAIRE;
}


/**
 * Crée un objet ligne.
 */
function creerLigneMenage_(
  logement,
  acces,
  priorite,
  personnel,
  etatMenage,
  etatReception
) {
  const personnelNormalise =
    normaliserPersonnelMenage_(
      personnel
    );

  const prioriteFinale =
    priorite || PRIORITE.BLEU;

  return {
    logement: logement,
    personnel: personnelNormalise,
    priorite: prioriteFinale,
    acces: acces || "",
    etatMenage:
      etatMenage ||
      ETAT_MENAGE.A_FAIRE,
    etatReception:
      etatReception || "",
    clePersonnel:
      creerClePersonnelMenage_(
        personnelNormalise
      ),
    rangPriorite:
      obtenirRangPrioriteMenage_(
        prioriteFinale
      )
  };
}


/**
 * Trie les lignes.
 */
function trierLignesMenage_(
  lignesMenage
) {
  lignesMenage.sort(
    function(ligneA, ligneB) {
      /*
       * ⚠️ Client en attente :
       * toujours avant toutes les autres lignes,
       * indépendamment du personnel affecté.
       */
      const attenteA =
        ligneA.priorite === "⚠️";

      const attenteB =
        ligneB.priorite === "⚠️";

      if (
        attenteA &&
        !attenteB
      ) {
        return -1;
      }

      if (
        !attenteA &&
        attenteB
      ) {
        return 1;
      }

      const personnelAVide =
        ligneA.clePersonnel === "";

      const personnelBVide =
        ligneB.clePersonnel === "";

      if (
        personnelAVide &&
        !personnelBVide
      ) {
        return 1;
      }

      if (
        !personnelAVide &&
        personnelBVide
      ) {
        return -1;
      }

      const comparaisonPersonnel =
        ligneA.clePersonnel.localeCompare(
          ligneB.clePersonnel,
          "fr",
          {
            numeric: true,
            sensitivity: "base"
          }
        );

      if (
        comparaisonPersonnel !== 0
      ) {
        return comparaisonPersonnel;
      }

      const comparaisonPriorite =
        ligneA.rangPriorite -
        ligneB.rangPriorite;

      if (
        comparaisonPriorite !== 0
      ) {
        return comparaisonPriorite;
      }

      return comparerLogementsMenage_(
        ligneA.logement,
        ligneB.logement
      );
    }
  );
}


/**
 * Retourne le rang d'une priorité.
 */
function obtenirRangPrioriteMenage_(
  priorite
) {
  if (
    priorite === "⚠️"
  ) {
    return 0;
  }

  if (
    priorite === PRIORITE.ROUGE
  ) {
    return 1;
  }

  if (
    priorite === PRIORITE.VIOLET
  ) {
    return 2;
  }

  if (
    priorite === PRIORITE.BLEU
  ) {
    return 3;
  }

  if (
    priorite === PRIORITE.BLANC
  ) {
    return 4;
  }
  if (
    priorite === PRIORITE.NOIR
  ) {
    return 5;
  }

  return 6;
}


/**
 * Écrit les données sur 6 colonnes.
 */
function ecrireDonneesMenage_(
  feuilleMenage,
  lignesMenage
) {
  if (
    lignesMenage.length === 0
  ) {
    return;
  }

  const valeurs =
    lignesMenage.map(
      function(ligne) {
        return [
          ligne.logement,
          ligne.personnel,
          ligne.priorite,
          ligne.acces,
          ligne.etatMenage,
          ligne.etatReception
        ];
      }
    );

  feuilleMenage
    .getRange(
      LIGNES.DEBUT,
      COLONNES_MENAGE.LOGEMENT,
      valeurs.length,
      COLONNES_MENAGE.NOMBRE_COLONNES
    )
    .setValues(
      valeurs
    );
}


/* ============================================================
 * PARTIE 3 — SYNCHRONISATION MÉNAGE → RÉCEPTION
 * ============================================================
 */

/**
 * Compatibilité.
 */
function determinerEtatReceptionApresMenage() {
  return ETAT_RECEPTION.PRET;
}


/**
 * Synchronise l'état Ménage vers Réception.
 */
function synchroniserEtatMenageVersReception(
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

  const feuilleMenage =
    cellule.getSheet();

  if (
    feuilleMenage.getName() !==
      FEUILLES.MENAGE ||
    cellule.getRow() <
      LIGNES.DEBUT ||
    cellule.getColumn() !==
      COLONNES_MENAGE.ETAT_MENAGE
  ) {
    return;
  }

  const nouvelEtatMenage =
    normaliserValeurMenage(
      cellule.getValue()
    );

  const etatsAutorises = [
    ETAT_MENAGE.A_FAIRE,
    ETAT_MENAGE.A_VERIFIER,
    ETAT_MENAGE.PRET,
    ETAT_MENAGE.A_RECONTROLER
  ];

  if (
    etatsAutorises.indexOf(
      nouvelEtatMenage
    ) === -1
  ) {
    return;
  }

  const ligneMenage =
    cellule.getRow();

  const logement =
    normaliserValeurMenage(
      feuilleMenage
        .getRange(
          ligneMenage,
          COLONNES_MENAGE.LOGEMENT
        )
        .getValue()
    );

  if (!logement) {
    return;
  }

  const ancienEtatReception =
    normaliserValeurMenage(
      feuilleMenage
        .getRange(
          ligneMenage,
          COLONNES_MENAGE.ETAT_RECEPTION
        )
        .getValue()
    );

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  if (!feuilleReception) {
    classeur.toast(
      "La feuille Réception est introuvable.",
      "❌ Synchronisation",
      6
    );

    return;
  }

  const ligneReception =
    trouverLigneReceptionParLogement(
      feuilleReception,
      logement
    );

  if (!ligneReception) {
    classeur.toast(
      "Le logement " +
        logement +
        " est introuvable dans Réception.",
      "❌ Synchronisation",
      6
    );

    return;
  }

  const depart =
    feuilleReception
      .getRange(
        ligneReception,
        COLONNES_RECEPTION.DEPART
      )
      .getValue();

  const arriveeSuivante =
    feuilleReception
      .getRange(
        ligneReception,
        COLONNES_RECEPTION.ARRIVEE_SUIVANTE
      )
      .getValue();

  const telephoneAttente =
    String(
      feuilleReception
        .getRange(
          ligneReception,
          COLONNES_RECEPTION.TELEPHONE_ATTENTE
        )
        .getDisplayValue() || ""
    ).trim();

  let nouvelEtatReception;
  let nouvellePriorite;
  let nouvelAcces;

  if (
    nouvelEtatMenage ===
    ETAT_MENAGE.PRET
  ) {
    const clientSuivant =
      normaliserValeurMenage(
        feuilleReception
          .getRange(
            ligneReception,
            COLONNES_RECEPTION.CLIENT_SUIVANT
          )
          .getValue()
      );

    const reservationFutureExiste =
      clientSuivant !== "" ||
      estDateValideMenage(
        arriveeSuivante
      );

    nouvelEtatReception =
      reservationFutureExiste
        ? ETAT_RECEPTION.PRET
        : ETAT_RECEPTION.LIBRE;

    nouvellePriorite =
      reservationFutureExiste
        ? PRIORITE.BLANC
        : "";

    nouvelAcces =
      ACCES_MENAGE.PRET;

    feuilleReception
      .getRange(
        ligneReception,
        COLONNES_RECEPTION.DERNIER_CONTROLE
      )
      .setValue(
        supprimerHeureMenage_(
          new Date()
        )
      )
      .setNumberFormat(
        "dd/MM/yyyy"
      );

  } else if (
    nouvelEtatMenage ===
    ETAT_MENAGE.A_RECONTROLER
  ) {
    nouvelEtatReception =
      ETAT_RECEPTION.A_RECONTROLER;

    nouvellePriorite =
      PRIORITE.VIOLET;

    nouvelAcces =
      ACCES_MENAGE.PRET;

  } else if (
    ancienEtatReception ===
    ETAT_RECEPTION.A_RECONTROLER
  ) {
    nouvelEtatReception =
      ETAT_RECEPTION.A_RECONTROLER;

    nouvellePriorite =
      PRIORITE.VIOLET;

    nouvelAcces =
      ACCES_MENAGE.PRET;

  } else {
    nouvelEtatReception =
      ETAT_RECEPTION.PARTI;

    nouvellePriorite =
      determinerPrioriteMenage(
        depart,
        arriveeSuivante,
        ETAT_RECEPTION.PARTI
      );

    nouvelAcces =
      ACCES_MENAGE.PARTI;
  }

  /*
   * V3.2.4 :
   * la femme de chambre qui valide le ménage passe de
   * « À faire » à « À vérifier ». Le client attend toujours :
   * ⚠️ doit donc rester visible jusqu'au contrôle gouvernante.
   */
  if (
    telephoneAttente !== "" &&
    nouvelEtatMenage !== ETAT_MENAGE.PRET &&
    nouvelEtatReception !== ETAT_RECEPTION.PRET &&
    nouvelEtatReception !== ETAT_RECEPTION.LIBRE
  ) {
    nouvellePriorite =
      "⚠️";
  }

  feuilleReception
    .getRange(
      ligneReception,
      COLONNES_RECEPTION.ETAT
    )
    .setValue(
      nouvelEtatReception
    );

  feuilleReception
    .getRange(
      ligneReception,
      COLONNES_RECEPTION.PRIORITE
    )
    .setValue(
      nouvellePriorite
    );

  feuilleMenage
    .getRange(
      ligneMenage,
      COLONNES_MENAGE.ACCES
    )
    .setValue(
      nouvelAcces
    );

  feuilleMenage
    .getRange(
      ligneMenage,
      COLONNES_MENAGE.PRIORITE
    )
    .setValue(
      nouvellePriorite
    );

  feuilleMenage
    .getRange(
      ligneMenage,
      COLONNES_MENAGE.ETAT_RECEPTION
    )
    .setValue(
      nouvelEtatReception
    );

  appliquerCouleursMenage(
    feuilleMenage
  );

  if (
    typeof appliquerCouleursReception ===
    "function"
  ) {
    appliquerCouleursReception(
      feuilleReception
    );
  }


  if (
    typeof appliquerCouleurClientAttenteReceptionV323_ ===
      "function"
  ) {
    appliquerCouleurClientAttenteReceptionV323_(
      feuilleReception,
      Math.max(
        feuilleReception.getLastRow() -
          LIGNES.DEBUT +
          1,
        0
      )
    );
  }

  appliquerCouleurClientAttenteMenageV323_(
    feuilleMenage
  );

  /*
   * VERSION 3.3.0 — VALIDATION CIBLÉE SANS RECONSTRUCTION
   *
   * L'ancienne fonction actualiserReceptionApresValidationMenage()
   * relançait mettreAJourReception(false) et pouvait reconstruire
   * toute la feuille Réception.
   *
   * Or le logement courant vient déjà d'être mis à jour directement
   * ci-dessus. On nettoie donc uniquement les informations du client
   * sortant sur CETTE ligne lorsqu'elle devient Prêt ou Libre.
   *
   * Client suivant, Arrivée suivante, affectations, téléphone
   * d'attente, dernier contrôle et départ réel restent intacts.
   */
  if (
    nouvelEtatMenage ===
      ETAT_MENAGE.PRET &&
    (
      nouvelEtatReception ===
        ETAT_RECEPTION.PRET ||
      nouvelEtatReception ===
        ETAT_RECEPTION.LIBRE
    )
  ) {
    feuilleReception
      .getRange(
        ligneReception,
        COLONNES_RECEPTION.CLIENT_ACTUEL,
        1,
        2
      )
      .clearContent();
  }

  SpreadsheetApp.flush();

  if (
    nouvelEtatMenage ===
    ETAT_MENAGE.PRET
  ) {
    const messagePret =
      nouvelEtatReception ===
        ETAT_RECEPTION.LIBRE
        ? logement +
          " est prêt et repasse sur Libre."
        : logement +
          " est prêt. Le dernier contrôle a été enregistré.";

    classeur.toast(
      messagePret,
      "✅ Contrôle validé",
      5
    );

  } else if (
    nouvelEtatReception ===
    ETAT_RECEPTION.A_RECONTROLER
  ) {
    classeur.toast(
      logement +
        " reste à recontrôler.",
      "🟣 Recontrôle",
      4
    );

  } else {
    classeur.toast(
      logement +
        " repasse sur « " +
        nouvelEtatMenage +
        " ».",
      "↩️ Correction enregistrée",
      4
    );
  }
}


/**
 * Empêche une modification tant que le client est présent.
 */
function bloquerEtatMenageSiOccupe(
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
    cellule.getRow() <
      LIGNES.DEBUT ||
    cellule.getColumn() !==
      COLONNES_MENAGE.ETAT_MENAGE
  ) {
    return false;
  }

  const ligne =
    cellule.getRow();

  const etatReception =
    normaliserValeurMenage(
      feuille
        .getRange(
          ligne,
          COLONNES_MENAGE.ETAT_RECEPTION
        )
        .getValue()
    );

  if (
    etatReception !==
    ETAT_RECEPTION.OCCUPE
  ) {
    return false;
  }

  if (
    typeof evenement.oldValue !==
    "undefined"
  ) {
    cellule.setValue(
      evenement.oldValue
    );

  } else {
    cellule.setValue(
      ETAT_MENAGE.A_FAIRE
    );
  }

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      "Le client est encore présent. " +
        "La réception doit d’abord passer " +
        "le logement sur « Parti ».",
      "🟨 Ménage interdit",
      6
    );

  appliquerCouleursMenage(
    feuille
  );

  return true;
}


/**
 * Répercute un changement Réception dans Ménage.
 */
function mettreAJourEtatReceptionDansMenage(
  evenement
) {
  if (
    !evenement ||
    !evenement.range
  ) {
    return;
  }

  const feuilleReception =
    evenement.range.getSheet();

  if (
    feuilleReception.getName() !==
      FEUILLES.RECEPTION ||
    evenement.range.getRow() <
      LIGNES.DEBUT ||
    evenement.range.getColumn() !==
      COLONNES_RECEPTION.ETAT
  ) {
    return;
  }

  /*
   * Le changement d'état (notamment Occupé -> Parti) peut recalculer
   * la priorité standard en rouge/bleu. Si un téléphone d'attente
   * existe, ⚠️ doit gagner immédiatement.
   */
  if (
    typeof appliquerPrioriteClientAttenteReceptionV323_ ===
      "function"
  ) {
    appliquerPrioriteClientAttenteReceptionV323_(
      feuilleReception,
      Math.max(
        feuilleReception.getLastRow() -
          LIGNES.DEBUT +
          1,
        0
      )
    );
  }

  mettreAJourMenage(
    false
  );

  if (
    typeof appliquerPrioriteClientAttenteReceptionV323_ ===
      "function"
  ) {
    appliquerPrioriteClientAttenteReceptionV323_(
      feuilleReception,
      Math.max(
        feuilleReception.getLastRow() -
          LIGNES.DEBUT +
          1,
        0
      )
    );
  }

  if (
    typeof appliquerCouleurClientAttenteReceptionV323_ ===
      "function"
  ) {
    appliquerCouleurClientAttenteReceptionV323_(
      feuilleReception,
      Math.max(
        feuilleReception.getLastRow() -
          LIGNES.DEBUT +
          1,
        0
      )
    );
  }
}


/* ============================================================
 * PARTIE 4 — LISTES ET FORMATS
 * ============================================================
 */

function appliquerListeEtatsMenage(
  feuilleMenage,
  nombreLignes
) {
  if (
    nombreLignes <= 0
  ) {
    return;
  }

  /*
   * V3.2.10 — Listes de la colonne E selon le rôle.
   *
   * Femme de chambre seule :
   *   À faire / À vérifier
   *
   * Toute l'équipe affectée est double rôle
   * Femme de chambre + Gouvernante :
   *   À faire / Prêt
   *
   * Recontrôle déclenché automatiquement par Réception
   * (notamment règle de l'écart de jours) :
   *   E reste sur À recontrôler.
   *   La gouvernante valide ensuite Prêt dans la colonne H.
   *
   * Ainsi, À recontrôler n'est jamais proposé comme un choix
   * manuel pour déclencher un recontrôle.
   */

  const personnels =
    feuilleMenage
      .getRange(
        LIGNES.DEBUT,
        COLONNES_MENAGE.PERSONNEL,
        nombreLignes,
        1
      )
      .getDisplayValues();

  const etats =
    feuilleMenage
      .getRange(
        LIGNES.DEBUT,
        COLONNES_MENAGE.ETAT_MENAGE,
        nombreLignes,
        1
      )
      .getDisplayValues();

  const carteRoles =
    creerCarteRolesMenageDriveV3210_();

  const validationFemmeDeChambre =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          ETAT_MENAGE.A_FAIRE,
          ETAT_MENAGE.A_VERIFIER
        ],
        true
      )
      .setAllowInvalid(false)
      .setHelpText(
        "Ménage : À faire ou À vérifier."
      )
      .build();

  const validationDoubleRole =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          ETAT_MENAGE.A_FAIRE,
          ETAT_MENAGE.PRET
        ],
        true
      )
      .setAllowInvalid(false)
      .setHelpText(
        "Double rôle : À faire ou Prêt."
      )
      .build();

  const validationRecontrole =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          ETAT_MENAGE.A_RECONTROLER
        ],
        true
      )
      .setAllowInvalid(false)
      .setHelpText(
        "Recontrôle gouvernante : validez Prêt dans la colonne État à droite."
      )
      .build();

  const validations = [];

  for (
    let index = 0;
    index < nombreLignes;
    index++
  ) {
    const personnel =
      String(
        personnels[index][0] || ""
      ).trim();

    const etat =
      String(
        etats[index][0] || ""
      ).trim();

    /*
     * Le recontrôle est imposé automatiquement par le programme.
     * La colonne E le conserve, la gouvernante agit dans H.
     */
    if (
      etat ===
        ETAT_MENAGE.A_RECONTROLER
    ) {
      validations.push([
        validationRecontrole
      ]);

      continue;
    }

    /*
     * Une ligne déjà À vérifier reste dans le circuit normal
     * de contrôle gouvernante, même si la personne affectée
     * possède aujourd'hui le double rôle.
     */
    if (
      etat ===
        ETAT_MENAGE.A_VERIFIER
    ) {
      validations.push([
        validationFemmeDeChambre
      ]);

      continue;
    }

    const doubleRole =
      equipeEntierementDoubleRoleMenageDriveV3210_(
        personnel,
        carteRoles
      );

    validations.push([
      doubleRole
        ? validationDoubleRole
        : validationFemmeDeChambre
    ]);
  }

  feuilleMenage
    .getRange(
      LIGNES.DEBUT,
      COLONNES_MENAGE.ETAT_MENAGE,
      nombreLignes,
      1
    )
    .setDataValidations(
      validations
    );
}


/**
 * Construit une carte des rôles disponibles directement
 * depuis Paramètres, sans dépendre de CampManager V4.
 *
 * Une personne présente à la fois dans Personnel disponible
 * et Gouvernantes disponibles possède le double rôle.
 */
function creerCarteRolesMenageDriveV3210_() {
  const carte = {};

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleParametres =
    classeur.getSheetByName(
      FEUILLES.PARAMETRES
    );

  if (
    !feuilleParametres ||
    feuilleParametres.getLastRow() <
      LIGNES.DEBUT
  ) {
    return carte;
  }

  const nombreLignes =
    feuilleParametres.getLastRow() -
    LIGNES.DEBUT +
    1;

  function ajouterRole_(
    prenom,
    role
  ) {
    const nom =
      String(
        prenom || ""
      ).trim();

    if (
      nom === "" ||
      nom === "🗑 Effacer"
    ) {
      return;
    }

    const cle =
      normaliserCleRoleMenageDriveV3210_(
        nom
      );

    if (
      cle === ""
    ) {
      return;
    }

    if (
      !carte[cle]
    ) {
      carte[cle] = {
        femmeDeChambre: false,
        gouvernante: false
      };
    }

    carte[cle][role] = true;
  }

  /*
   * Personnel disponible = femmes de chambre actives/extras.
   */
  if (
    COLONNES_PARAMETRES.PERSONNEL_DISPONIBLE
  ) {
    const personnel =
      feuilleParametres
        .getRange(
          LIGNES.DEBUT,
          COLONNES_PARAMETRES.PERSONNEL_DISPONIBLE,
          nombreLignes,
          1
        )
        .getDisplayValues();

    personnel.forEach(
      function(ligne) {
        ajouterRole_(
          ligne[0],
          "femmeDeChambre"
        );
      }
    );
  }

  /*
   * Gouvernantes disponibles = gouvernantes actives/extras.
   */
  if (
    COLONNES_PARAMETRES.GOUVERNANTES_DISPONIBLES
  ) {
    const gouvernantes =
      feuilleParametres
        .getRange(
          LIGNES.DEBUT,
          COLONNES_PARAMETRES.GOUVERNANTES_DISPONIBLES,
          nombreLignes,
          1
        )
        .getDisplayValues();

    gouvernantes.forEach(
      function(ligne) {
        ajouterRole_(
          ligne[0],
          "gouvernante"
        );
      }
    );
  }

  return carte;
}


/**
 * Retourne true uniquement si toutes les personnes affectées
 * au logement possèdent les deux rôles.
 *
 * Un binôme mixte reste donc À faire / À vérifier.
 */
function equipeEntierementDoubleRoleMenageDriveV3210_(
  personnel,
  carteRoles
) {
  const noms =
    decomposerPersonnelMenageDriveV3210_(
      personnel
    );

  if (
    noms.length === 0
  ) {
    return false;
  }

  return noms.every(
    function(nom) {
      const role =
        carteRoles[
          normaliserCleRoleMenageDriveV3210_(
            nom
          )
        ];

      return !!(
        role &&
        role.femmeDeChambre &&
        role.gouvernante
      );
    }
  );
}


/**
 * Compatibilité avec 90_OnEdit V2.33.
 *
 * Le 90 conserve encore l'ancien nom V3.2.9 pour vérifier
 * qu'une personne (ou tout un binôme) possède le double rôle.
 *
 * La source de vérité reste la logique V3.2.10 ci-dessus.
 */
function estDoubleRolePersonnelMenageDriveV329_(
  personnel
) {
  const carteRoles =
    creerCarteRolesMenageDriveV3210_();

  return equipeEntierementDoubleRoleMenageDriveV3210_(
    personnel,
    carteRoles
  );
}


/**
 * Décompose une affectation :
 * Personne A/Personne B
 * Personne A + Personne B * Personne A et Personne B
 * etc.
 */
function decomposerPersonnelMenageDriveV3210_(
  personnel
) {
  return String(
    personnel || ""
  )
    .split(
      /\s*(?:\/|,|&|\+|\bet\b)\s*/i
    )
    .map(
      function(nom) {
        return String(
          nom || ""
        ).trim();
      }
    )
    .filter(
      function(nom) {
        return nom !== "";
      }
    );
}


function normaliserCleRoleMenageDriveV3210_(
  valeur
) {
  return String(
    valeur || ""
  )
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}


function appliquerFormatsMenage(
  feuilleMenage,
  nombreLignes
) {
  if (
    nombreLignes <= 0
  ) {
    return;
  }

  feuilleMenage
    .getRange(
      LIGNES.DEBUT,
      COLONNES_MENAGE.LOGEMENT,
      nombreLignes,
      1
    )
    .setHorizontalAlignment("center")
    .setFontWeight("bold")
    .setFontSize(17);

  feuilleMenage
    .getRange(
      LIGNES.DEBUT,
      COLONNES_MENAGE.PERSONNEL,
      nombreLignes,
      1
    )
    .setHorizontalAlignment("left")
    .setFontSize(12)
    .setWrap(true);

  feuilleMenage
    .getRange(
      LIGNES.DEBUT,
      COLONNES_MENAGE.PRIORITE,
      nombreLignes,
      2
    )
    .setHorizontalAlignment("center")
    .setFontSize(16);

  feuilleMenage
    .getRange(
      LIGNES.DEBUT,
      COLONNES_MENAGE.ETAT_MENAGE,
      nombreLignes,
      1
    )
    .setHorizontalAlignment("center")
    .setFontWeight("bold")
    .setFontSize(13)
    .setWrap(true);

  feuilleMenage.setRowHeights(
    LIGNES.DEBUT,
    nombreLignes,
    50
  );
}


function appliquerPresentationMobileMenage_(
  feuilleMenage
) {
  feuilleMenage.setColumnWidth(
    COLONNES_MENAGE.LOGEMENT,
    55
  );

  feuilleMenage.autoResizeColumn(
    COLONNES_MENAGE.PERSONNEL
  );

  const largeurPersonnel =
    feuilleMenage.getColumnWidth(
      COLONNES_MENAGE.PERSONNEL
    );

  feuilleMenage.setColumnWidth(
    COLONNES_MENAGE.PERSONNEL,
    Math.max(
      110,
      Math.min(
        largeurPersonnel,
        180
      )
    )
  );

  feuilleMenage.setColumnWidth(
    COLONNES_MENAGE.PRIORITE,
    42
  );

  feuilleMenage.setColumnWidth(
    COLONNES_MENAGE.ACCES,
    42
  );

  feuilleMenage.setColumnWidth(
    COLONNES_MENAGE.ETAT_MENAGE,
    135
  );

  feuilleMenage.setRowHeight(
    1,
    8
  );

  feuilleMenage.setRowHeight(
    2,
    8
  );

  feuilleMenage.setRowHeight(
    3,
    12
  );

  feuilleMenage.setRowHeight(
    LIGNES.ENTETES,
    36
  );

  feuilleMenage.setFrozenRows(
    LIGNES.ENTETES
  );

  /*
   * V3.2.10 :
   * la première colonne N° reste visible lors du défilement.
   */
  feuilleMenage.setFrozenColumns(
    1
  );
}


function trierFeuilleMenage(
  feuilleMenage,
  nombreLignes
) {
  return;
}


function masquerColonneEtatReceptionMenage(
  feuilleMenage
) {
  try {
    /*
     * La colonne technique est toujours F
     * dans la version V3.
     */
    feuilleMenage.hideColumns(
      6
    );

  } catch (erreur) {
    console.log(
      "Impossible de masquer la colonne technique F : " +
        erreur.message
    );
  }
}


/* ============================================================
 * PARTIE 5 — COULEURS
 * ============================================================
 */

function appliquerCouleursLignesMenage(
  feuilleMenage
) {
  const derniereLigne =
    feuilleMenage.getLastRow();

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

  const etatsReception =
    feuilleMenage
      .getRange(
        LIGNES.DEBUT,
        COLONNES_MENAGE.ETAT_RECEPTION,
        nombreLignes,
        1
      )
      .getValues();

  const nombreColonnesVisibles =
    COLONNES_MENAGE.ETAT_MENAGE;

  const couleurs =
    etatsReception.map(
      function(ligne) {
        const etat =
          normaliserValeurMenage(
            ligne[0]
          );

        let couleur =
          COULEURS.BLANC;

        if (
          etat ===
          ETAT_RECEPTION.OCCUPE
        ) {
          couleur =
            "#f4cccc";
        }

        if (
          etat ===
          ETAT_RECEPTION.PARTI
        ) {
          couleur =
            "#d9ead3";
        }

        if (
          etat ===
          ETAT_RECEPTION.A_RECONTROLER
        ) {
          couleur =
            "#eadcf8";
        }

        return Array(
          nombreColonnesVisibles
        ).fill(
          couleur
        );
      }
    );

  feuilleMenage
    .getRange(
      LIGNES.DEBUT,
      COLONNES_MENAGE.LOGEMENT,
      nombreLignes,
      nombreColonnesVisibles
    )
    .setBackgrounds(
      couleurs
    )
    .setFontColor(
      COULEURS_TEXTE.NOIR
    );
}


function appliquerCouleursMenage(
  feuilleMenage
) {
  if (!feuilleMenage) {
    feuilleMenage =
      SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName(
          FEUILLES.MENAGE
        );
  }

  if (!feuilleMenage) {
    return;
  }

  const derniereLigne =
    feuilleMenage.getLastRow();

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

  appliquerCouleursLignesMenage(
    feuilleMenage
  );

  if (
    typeof appliquerCouleursPrioritesMenage ===
    "function"
  ) {
    appliquerCouleursPrioritesMenage(
      feuilleMenage,
      nombreLignes
    );
  }

  if (
    typeof appliquerCouleursEtatsMenage ===
    "function"
  ) {
    appliquerCouleursEtatsMenage(
      feuilleMenage,
      nombreLignes
    );
  }
}


function appliquerCouleursMenageV110(
  feuilleMenage
) {
  appliquerCouleursMenage(
    feuilleMenage
  );
}


function appliquerCouleursLignesMenageV110(
  feuilleMenage
) {
  appliquerCouleursLignesMenage(
    feuilleMenage
  );
}


/* ============================================================
 * PARTIE 6 — CONSERVATION ET RECHERCHES
 * ============================================================
 */

/**
 * Lit les anciennes données Ménage.
 *
 * Compatible avec :
 * - l'ancienne version à 8 colonnes ;
 * - la nouvelle version à 6 colonnes.
 */
function lireDonneesMenageExistantes(
  feuilleMenage
) {
  const donnees = {};

  const derniereLigne =
    feuilleMenage.getLastRow();

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return donnees;
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const nombreColonnesLecture =
    Math.max(
      COLONNES_MENAGE.NOMBRE_COLONNES,
      Math.min(
        feuilleMenage.getLastColumn(),
        8
      )
    );

  const entetes =
    feuilleMenage
      .getRange(
        LIGNES.ENTETES,
        1,
        1,
        nombreColonnesLecture
      )
      .getValues()[0]
      .map(
        function(valeur) {
          return normaliserNomEnteteMenage_(
            valeur
          );
        }
      );

  const indexParNom = {};

  entetes.forEach(
    function(entete, index) {
      if (entete) {
        indexParNom[entete] = index;
      }
    }
  );

  const indexColonnes = {
    logement:
      obtenirIndexEnteteMenage_(
        indexParNom,
        ["n", "logement", "n logement", "numero logement"],
        0
      ),

    personnel:
      obtenirIndexEnteteMenage_(
        indexParNom,
        ["personnel"],
        1
      ),

    priorite:
      obtenirIndexEnteteMenage_(
        indexParNom,
        ["priorite", ""],
        2
      ),

    acces:
      obtenirIndexEnteteMenage_(
        indexParNom,
        ["acces", ""],
        3
      ),

    etatMenage:
      obtenirIndexEnteteMenage_(
        indexParNom,
        ["etat menage"],
        4
      ),

    etatReception:
      obtenirIndexEnteteMenage_(
        indexParNom,
        ["etat reception"],
        nombreColonnesLecture >= 8
          ? 7
          : 5
      )
  };

  const valeurs =
    feuilleMenage
      .getRange(
        LIGNES.DEBUT,
        1,
        nombreLignes,
        nombreColonnesLecture
      )
      .getValues();

  valeurs.forEach(
    function(ligne) {
      const logement =
        normaliserValeurMenage(
          ligne[
            indexColonnes.logement
          ]
        );

      if (!logement) {
        return;
      }

      donnees[logement] = {
        logement: logement,

        personnel:
          normaliserPersonnelMenage_(
            ligne[
              indexColonnes.personnel
            ]
          ),

        priorite:
          ligne[
            indexColonnes.priorite
          ],

        acces:
          convertirAncienAccesMenage_(
            ligne[
              indexColonnes.acces
            ]
          ),

        etatMenage:
          normaliserValeurMenage(
            ligne[
              indexColonnes.etatMenage
            ]
          ),

        etatReception:
          normaliserValeurMenage(
            ligne[
              indexColonnes.etatReception
            ]
          )
      };
    }
  );

  return donnees;
}


function normaliserNomEnteteMenage_(
  valeur
) {
  return String(
    valeur || ""
  )
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[°º]/g, "")
    .replace(/[●■]/g, "")
    .replace(/\s+/g, " ");
}


function obtenirIndexEnteteMenage_(
  indexParNom,
  nomsPossibles,
  indexParDefaut
) {
  for (
    let index = 0;
    index < nomsPossibles.length;
    index++
  ) {
    const nom =
      normaliserNomEnteteMenage_(
        nomsPossibles[index]
      );

    if (
      Object.prototype.hasOwnProperty.call(
        indexParNom,
        nom
      )
    ) {
      return indexParNom[nom];
    }
  }

  return indexParDefaut;
}


function convertirAncienAccesMenage_(
  valeur
) {
  const texte =
    String(
      valeur || ""
    ).trim();

  if (
    texte.indexOf("🟨") !== -1
  ) {
    return ACCES_MENAGE.PRESENT;
  }

  if (
    texte.indexOf("🟩") !== -1
  ) {
    return ACCES_MENAGE.PARTI;
  }

  if (
    texte.indexOf("⬜") !== -1
  ) {
    return ACCES_MENAGE.PRET;
  }

  return texte;
}


function trouverLigneReceptionParLogement(
  feuilleReception,
  logementRecherche
) {
  const derniereLigne =
    feuilleReception.getLastRow();

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return null;
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const logements =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.LOGEMENT,
        nombreLignes,
        1
      )
      .getValues();

  const logementNormalise =
    normaliserValeurMenage(
      logementRecherche
    );

  for (
    let index = 0;
    index < logements.length;
    index++
  ) {
    if (
      normaliserValeurMenage(
        logements[index][0]
      ) === logementNormalise
    ) {
      return (
        LIGNES.DEBUT +
        index
      );
    }
  }

  return null;
}


function trouverLigneMenageParLogement(
  feuilleMenage,
  logementRecherche
) {
  const derniereLigne =
    feuilleMenage.getLastRow();

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return null;
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const logements =
    feuilleMenage
      .getRange(
        LIGNES.DEBUT,
        COLONNES_MENAGE.LOGEMENT,
        nombreLignes,
        1
      )
      .getValues();

  const logementNormalise =
    normaliserValeurMenage(
      logementRecherche
    );

  for (
    let index = 0;
    index < logements.length;
    index++
  ) {
    if (
      normaliserValeurMenage(
        logements[index][0]
      ) === logementNormalise
    ) {
      return (
        LIGNES.DEBUT +
        index
      );
    }
  }

  return null;
}


/* ============================================================
 * PARTIE 7 — UTILITAIRES
 * ============================================================
 */

function normaliserPersonnelMenage_(
  valeur
) {
  if (
    typeof normaliserPersonnel ===
    "function"
  ) {
    return normaliserPersonnel(
      valeur
    );
  }

  if (
    typeof normaliserPersonnelReception_ ===
    "function"
  ) {
    return normaliserPersonnelReception_(
      valeur
    );
  }

  return normaliserValeurMenage(
    valeur
  );
}


function creerClePersonnelMenage_(
  personnel
) {
  return normaliserPersonnelMenage_(
    personnel
  ).toLocaleLowerCase(
    "fr"
  );
}


function comparerLogementsMenage_(
  logementA,
  logementB
) {
  return String(
    logementA || ""
  ).localeCompare(
    String(
      logementB || ""
    ),
    "fr",
    {
      numeric: true,
      sensitivity: "base"
    }
  );
}


function sontMemeJourMenage(
  date1,
  date2
) {
  if (
    !date1 ||
    !date2
  ) {
    return false;
  }

  const premiereDate =
    date1 instanceof Date
      ? date1
      : new Date(date1);

  const deuxiemeDate =
    date2 instanceof Date
      ? date2
      : new Date(date2);

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


function estDateValideMenage(
  valeur
) {
  if (
    valeur === "" ||
    valeur === null ||
    typeof valeur === "undefined"
  ) {
    return false;
  }

  const date =
    valeur instanceof Date
      ? valeur
      : new Date(valeur);

  return !isNaN(
    date.getTime()
  );
}


function supprimerHeureMenage_(
  valeur
) {
  if (
    !estDateValideMenage(
      valeur
    )
  ) {
    return null;
  }

  const date =
    valeur instanceof Date
      ? valeur
      : new Date(valeur);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}


function estDateAnterieureMenage_(
  valeur,
  dateReference
) {
  const date =
    supprimerHeureMenage_(
      valeur
    );

  const reference =
    supprimerHeureMenage_(
      dateReference
    );

  if (
    !date ||
    !reference
  ) {
    return false;
  }

  return (
    date.getTime() <
    reference.getTime()
  );
}


function normaliserEtatReceptionMenage_(
  valeur
) {
  const texteOriginal =
    normaliserValeurMenage(
      valeur
    );

  if (!texteOriginal) {
    return "";
  }

  const cle =
    texteOriginal
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr");

  const cleRecontroler =
    String(
      ETAT_RECEPTION.A_RECONTROLER ||
      "À recontrôler"
    )
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr");

  if (
    cle === cleRecontroler ||
    cle === "a recontroler"
  ) {
    return ETAT_RECEPTION.A_RECONTROLER;
  }

  return texteOriginal;
}


function normaliserValeurMenage(
  valeur
) {
  return String(
    valeur || ""
  ).trim();
}


function obtenirMessageErreurMenage_(
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
 * V3.2.3 — Mise en évidence de la priorité Client en attente.
 */
function appliquerCouleurClientAttenteMenageV323_(
  feuilleMenage
) {
  if (
    !feuilleMenage
  ) {
    return;
  }
  const derniereLigne =
    feuilleMenage.getLastRow();

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

  const priorites =
    feuilleMenage
      .getRange(
        LIGNES.DEBUT,
        COLONNES_MENAGE.PRIORITE,
        nombreLignes,
        1
      )
      .getDisplayValues();

  priorites.forEach(
    function(ligne, index) {
      if (
        String(
          ligne[0] || ""
        ).trim() !== "⚠️"
      ) {
        return;
      }

      feuilleMenage
        .getRange(
          LIGNES.DEBUT + index,
          1,
          1,
          COLONNES_MENAGE.NOMBRE_COLONNES
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

      feuilleMenage
        .getRange(
          LIGNES.DEBUT + index,
          COLONNES_MENAGE.PRIORITE
        )
        .setBackground(
          "#FFD54F"
        )
        .setFontSize(
          18
        );
    }
  );
}