/**
 * ============================================================
 * CAPFUN GRAND CERF
 * HISTORIQUE MÉNAGE — VERSION V1.2 DOUBLE RÔLE
 * ============================================================
 *
 * Feuille "Historique Ménage"
 *
 * A Date
 * B Heure
 * C Logement
 * D Catégorie
 * E Action
 * F État avant
 * G État après
 * H Réalisé par
 * I Personnel affecté
 * J Mode
 * K Gouvernante
 * L Source
 * M Durée depuis départ
 * N Commentaire
 * O Temps contrôle
 * P ID Cycle
 *
 * Une seule ligne est créée par cycle de nettoyage :
 *
 * À faire -> À vérifier
 *   = création de la ligne
 *
 * À vérifier / À recontrôler -> Prêt
 *   = mise à jour de la même ligne
 */


/**
 * Nom exact de la feuille d'historique.
 */
const FEUILLE_HISTORIQUE_MENAGE =
  "Historique Ménage";


/**
 * Colonnes de la feuille Historique Ménage.
 */
const COLONNES_HISTORIQUE_MENAGE = {
  DATE: 1,
  HEURE: 2,
  LOGEMENT: 3,
  CATEGORIE: 4,
  ACTION: 5,
  ETAT_AVANT: 6,
  ETAT_APRES: 7,
  REALISE_PAR: 8,
  PERSONNEL_AFFECTE: 9,
  MODE: 10,
  GOUVERNANTE: 11,
  SOURCE: 12,
  DUREE_DEPUIS_DEPART: 13,
  COMMENTAIRE: 14,
  TEMPS_CONTROLE: 15,
  ID_CYCLE: 16,

  NOMBRE_COLONNES: 16
};


/**
 * Point d'entrée utilisé par CampManager V4.
 *
 * @param {Object} donnees
 */
function enregistrerHistoriqueMenageDepuisApplication_(
  donnees
) {
  if (
    !donnees ||
    !donnees.logement ||
    !donnees.etatAvant ||
    !donnees.etatApres
  ) {
    return;
  }

  const etatAvant =
    String(
      donnees.etatAvant || ""
    ).trim();

  const etatApres =
    String(
      donnees.etatApres || ""
    ).trim();

  /*
   * DOUBLE RÔLE
   *
   * Une personne à la fois femme de chambre et gouvernante
   * peut valider directement :
   *
   * À faire -> Prêt
   *
   * Une seule ligne d'historique est alors créée avec l'action
   * « Ménage + Contrôle ».
   */
  if (
    etatAvant ===
      ETAT_MENAGE.A_FAIRE &&
    etatApres ===
      ETAT_MENAGE.PRET
  ) {
    creerCycleDoubleRoleHistoriqueMenage_(
      donnees
    );

    return;
  }

  /*
   * Femme de chambre :
   * À faire -> À vérifier
   */
  if (
    etatAvant ===
      ETAT_MENAGE.A_FAIRE &&
    etatApres ===
      ETAT_MENAGE.A_VERIFIER
  ) {
    creerCycleHistoriqueMenage_(
      donnees
    );

    return;
  }

  /*
   * Gouvernante :
   * À vérifier / À recontrôler -> Prêt
   */
  if (
    (
      etatAvant ===
        ETAT_MENAGE.A_VERIFIER ||
      etatAvant ===
        ETAT_MENAGE.A_RECONTROLER
    ) &&
    etatApres ===
      ETAT_MENAGE.PRET
  ) {
    cloturerCycleHistoriqueMenage_(
      donnees
    );
  }
}


/**
 * Crée directement un cycle terminé lorsqu'une personne
 * double rôle valide le ménage et le contrôle en une seule fois.
 */
function creerCycleDoubleRoleHistoriqueMenage_(
  donnees
) {
  const feuille =
    obtenirFeuilleHistoriqueMenage_();

  const maintenant =
    new Date();

  const logement =
    String(
      donnees.logement || ""
    ).trim();

  const personnel =
    normaliserTexteHistoriqueMenage_(
      donnees.personnel
    );

  const personneDoubleRole =
    normaliserTexteHistoriqueMenage_(
      donnees.prenomCliqueur
    );

  const categorie =
    lireCategorieLogementHistoriqueMenage_(
      logement
    );

  const departReel =
    lireDepartReelLogementHistoriqueMenage_(
      logement
    );

  const dureeDepuisDepart =
    calculerMinutesHistoriqueMenage_(
      departReel,
      maintenant
    );

  const mode =
    personnel.indexOf(
      PERSONNEL.SEPARATEUR
    ) !== -1
      ? "Binôme"
      : "Solo";

  /*
   * Si un binôme est affecté, on conserve le binôme complet
   * comme équipe ayant réalisé le ménage.
   *
   * La personne qui clique est enregistrée comme gouvernante,
   * puisqu'elle assume elle-même le contrôle grâce à son double rôle.
   */
  const realisePar =
    mode === "Binôme"
      ? personnel
      : (
          personnel ||
          personneDoubleRole
        );

  const idCycle =
    creerIdCycleHistoriqueMenage_(
      logement,
      maintenant
    );

  const ligneDestination =
    Math.max(
      feuille.getLastRow() + 1,
      LIGNES.DEBUT
    );

  feuille
    .getRange(
      ligneDestination,
      1,
      1,
      COLONNES_HISTORIQUE_MENAGE.NOMBRE_COLONNES
    )
    .setValues([[
      supprimerHeureHistoriqueMenage_(
        maintenant
      ),
      maintenant,
      logement,
      categorie,
      "Ménage + Contrôle",
      ETAT_MENAGE.A_FAIRE,
      ETAT_MENAGE.PRET,
      realisePar,
      personnel,
      mode,
      personneDoubleRole,
      normaliserTexteHistoriqueMenage_(
        donnees.source
      ) || "Application",
      dureeDepuisDepart,
      "Validation directe par double rôle à " +
        Utilities.formatDate(
          maintenant,
          Session.getScriptTimeZone(),
          "HH:mm"
        ),
      0,
      idCycle
    ]]);

  appliquerFormatsLigneHistoriqueMenage_(
    feuille,
    ligneDestination
  );
}


/**
 * Crée une nouvelle ligne d'historique lors de la validation
 * du ménage par la femme de chambre.
 */
function creerCycleHistoriqueMenage_(
  donnees
) {
  const feuille =
    obtenirFeuilleHistoriqueMenage_();

  const maintenant =
    new Date();

  const logement =
    String(
      donnees.logement || ""
    ).trim();

  const personnel =
    normaliserTexteHistoriqueMenage_(
      donnees.personnel
    );

  const gouvernante =
    normaliserTexteHistoriqueMenage_(
      donnees.gouvernante
    );

  const categorie =
    lireCategorieLogementHistoriqueMenage_(
      logement
    );

  const departReel =
    lireDepartReelLogementHistoriqueMenage_(
      logement
    );

  const dureeDepuisDepart =
    calculerMinutesHistoriqueMenage_(
      departReel,
      maintenant
    );

  const mode =
    personnel.indexOf(
      PERSONNEL.SEPARATEUR
    ) !== -1
      ? "Binôme"
      : "Solo";

  /*
   * Règle métier :
   * si un binôme est affecté, "Réalisé par" doit contenir
   * le binôme complet, même si une seule personne a cliqué.
   */
  const realisePar =
    mode === "Binôme"
      ? personnel
      : (
          personnel ||
          normaliserTexteHistoriqueMenage_(
            donnees.prenomCliqueur
          )
        );

  const idCycle =
    creerIdCycleHistoriqueMenage_(
      logement,
      maintenant
    );

  const ligne = [[
    supprimerHeureHistoriqueMenage_(
      maintenant
    ),
    maintenant,
    logement,
    categorie,
    "Ménage",
    String(
      donnees.etatAvant || ""
    ),
    String(
      donnees.etatApres || ""
    ),
    realisePar,
    personnel,
    mode,
    gouvernante,
    normaliserTexteHistoriqueMenage_(
      donnees.source
    ) || "Application",
    dureeDepuisDepart,
    "",
    "",
    idCycle
  ]];

  const ligneDestination =
    Math.max(
      feuille.getLastRow() + 1,
      LIGNES.DEBUT
    );

  feuille
    .getRange(
      ligneDestination,
      1,
      1,
      COLONNES_HISTORIQUE_MENAGE.NOMBRE_COLONNES
    )
    .setValues(
      ligne
    );

  appliquerFormatsLigneHistoriqueMenage_(
    feuille,
    ligneDestination
  );
}


/**
 * Met à jour la ligne du même cycle lorsque la gouvernante
 * valide le logement sur Prêt.
 */
function cloturerCycleHistoriqueMenage_(
  donnees
) {
  const feuille =
    obtenirFeuilleHistoriqueMenage_();

  const logement =
    String(
      donnees.logement || ""
    ).trim();

  const ligneCycle =
    trouverDernierCycleOuvertHistoriqueMenage_(
      feuille,
      logement
    );

  const maintenant =
    new Date();

  /*
   * Cas particulier : recontrôle sans ménage préalable dans la journée.
   * On crée alors directement une ligne de recontrôle.
   */
  if (
    !ligneCycle
  ) {
    creerCycleRecontroleHistoriqueMenage_(
      donnees,
      maintenant
    );

    return;
  }

  const heureMenage =
    feuille
      .getRange(
        ligneCycle,
        COLONNES_HISTORIQUE_MENAGE.HEURE
      )
      .getValue();

  const tempsControleMinutes =
    calculerMinutesHistoriqueMenage_(
      heureMenage,
      maintenant
    );

  const gouvernante =
    normaliserTexteHistoriqueMenage_(
      donnees.gouvernante
    ) ||
    normaliserTexteHistoriqueMenage_(
      donnees.prenomCliqueur
    );

  feuille
    .getRange(
      ligneCycle,
      COLONNES_HISTORIQUE_MENAGE.ACTION
    )
    .setValue(
      "Ménage + Contrôle"
    );

  feuille
    .getRange(
      ligneCycle,
      COLONNES_HISTORIQUE_MENAGE.ETAT_APRES
    )
    .setValue(
      ETAT_MENAGE.PRET
    );

  feuille
    .getRange(
      ligneCycle,
      COLONNES_HISTORIQUE_MENAGE.GOUVERNANTE
    )
    .setValue(
      gouvernante
    );

  feuille
    .getRange(
      ligneCycle,
      COLONNES_HISTORIQUE_MENAGE.TEMPS_CONTROLE
    )
    .setValue(
      tempsControleMinutes
    );

  feuille
    .getRange(
      ligneCycle,
      COLONNES_HISTORIQUE_MENAGE.COMMENTAIRE
    )
    .setValue(
      "Contrôle validé à " +
      Utilities.formatDate(
        maintenant,
        Session.getScriptTimeZone(),
        "HH:mm"
      )
    );

  appliquerFormatsLigneHistoriqueMenage_(
    feuille,
    ligneCycle
  );
}


/**
 * Crée une ligne lorsqu'un recontrôle est validé sans
 * cycle ménage ouvert préalable.
 */
function creerCycleRecontroleHistoriqueMenage_(
  donnees,
  maintenant
) {
  const feuille =
    obtenirFeuilleHistoriqueMenage_();

  const logement =
    String(
      donnees.logement || ""
    ).trim();

  const categorie =
    lireCategorieLogementHistoriqueMenage_(
      logement
    );

  const gouvernante =
    normaliserTexteHistoriqueMenage_(
      donnees.gouvernante
    ) ||
    normaliserTexteHistoriqueMenage_(
      donnees.prenomCliqueur
    );

  const personnel =
    normaliserTexteHistoriqueMenage_(
      donnees.personnel
    );

  const mode =
    personnel.indexOf(
      PERSONNEL.SEPARATEUR
    ) !== -1
      ? "Binôme"
      : (
          personnel !== ""
            ? "Solo"
            : ""
        );

  const idCycle =
    creerIdCycleHistoriqueMenage_(
      logement,
      maintenant
    );

  const ligneDestination =
    Math.max(
      feuille.getLastRow() + 1,
      LIGNES.DEBUT
    );

  feuille
    .getRange(
      ligneDestination,
      1,
      1,
      COLONNES_HISTORIQUE_MENAGE.NOMBRE_COLONNES
    )
    .setValues([[
      supprimerHeureHistoriqueMenage_(
        maintenant
      ),
      maintenant,
      logement,
      categorie,
      "Recontrôle",
      String(
        donnees.etatAvant || ""
      ),
      ETAT_MENAGE.PRET,
      gouvernante,
      personnel,
      mode,
      gouvernante,
      normaliserTexteHistoriqueMenage_(
        donnees.source
      ) || "Application",
      "",
      "Recontrôle validé à " +
        Utilities.formatDate(
          maintenant,
          Session.getScriptTimeZone(),
          "HH:mm"
        ),
      0,
      idCycle
    ]]);

  appliquerFormatsLigneHistoriqueMenage_(
    feuille,
    ligneDestination
  );
}


/**
 * Recherche la dernière ligne ouverte du logement :
 * une ligne créée par le ménage mais pas encore validée Prêt.
 *
 * @return {number|null}
 */
function trouverDernierCycleOuvertHistoriqueMenage_(
  feuille,
  logement
) {
  const derniereLigne =
    feuille.getLastRow();

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return null;
  }

  const donnees =
    feuille
      .getRange(
        LIGNES.DEBUT,
        1,
        derniereLigne -
          LIGNES.DEBUT +
          1,
        COLONNES_HISTORIQUE_MENAGE.NOMBRE_COLONNES
      )
      .getDisplayValues();

  for (
    let index =
      donnees.length - 1;
    index >= 0;
    index--
  ) {
    const numero =
      String(
        donnees[index][
          COLONNES_HISTORIQUE_MENAGE.LOGEMENT - 1
        ] || ""
      ).trim();

    const etatApres =
      String(
        donnees[index][
          COLONNES_HISTORIQUE_MENAGE.ETAT_APRES - 1
        ] || ""
      ).trim();

    if (
      numero === logement &&
      etatApres ===
        ETAT_MENAGE.A_VERIFIER
    ) {
      return (
        LIGNES.DEBUT +
        index
      );
    }
  }

  return null;
}


/**
 * Retourne la feuille Historique Ménage.
 */
function obtenirFeuilleHistoriqueMenage_() {
  const feuille =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        FEUILLE_HISTORIQUE_MENAGE
      );

  if (
    !feuille
  ) {
    throw new Error(
      'La feuille "' +
      FEUILLE_HISTORIQUE_MENAGE +
      '" est introuvable.'
    );
  }

  return feuille;
}


/**
 * Lit le timestamp technique « Départ réel »
 * dans Réception pour un logement.
 *
 * @return {Date|null}
 */
function lireDepartReelLogementHistoriqueMenage_(
  logement
) {
  const feuilleReception =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        FEUILLES.RECEPTION
      );

  if (
    !feuilleReception ||
    feuilleReception.getLastRow() <
      LIGNES.DEBUT
  ) {
    return null;
  }

  const nombreLignes =
    feuilleReception.getLastRow() -
    LIGNES.DEBUT +
    1;

  const donnees =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.LOGEMENT,
        nombreLignes,
        COLONNES_RECEPTION.DEPART_REEL -
          COLONNES_RECEPTION.LOGEMENT +
          1
      )
      .getValues();

  for (
    let index = 0;
    index < donnees.length;
    index++
  ) {
    const numero =
      String(
        donnees[index][0] || ""
      ).trim();

    if (
      numero !== logement
    ) {
      continue;
    }

    const positionDepartReel =
      COLONNES_RECEPTION.DEPART_REEL -
      COLONNES_RECEPTION.LOGEMENT;

    const valeur =
      donnees[index][
        positionDepartReel
      ];

    if (
      valeur instanceof Date &&
      !isNaN(
        valeur.getTime()
      )
    ) {
      return valeur;
    }

    return null;
  }

  return null;
}


/**
 * Lit la catégorie depuis Réception.
 */
function lireCategorieLogementHistoriqueMenage_(
  logement
) {
  const feuilleReception =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        FEUILLES.RECEPTION
      );

  if (
    !feuilleReception ||
    feuilleReception.getLastRow() <
      LIGNES.DEBUT
  ) {
    return "";
  }

  const nombreLignes =
    feuilleReception.getLastRow() -
    LIGNES.DEBUT +
    1;

  const donnees =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.LOGEMENT,
        nombreLignes,
        COLONNES_RECEPTION.CATEGORIE -
          COLONNES_RECEPTION.LOGEMENT +
          1
      )
      .getDisplayValues();

  for (
    let index = 0;
    index < donnees.length;
    index++
  ) {
    if (
      String(
        donnees[index][0] || ""
      ).trim() === logement
    ) {
      return String(
        donnees[index][
          COLONNES_RECEPTION.CATEGORIE -
          COLONNES_RECEPTION.LOGEMENT
        ] || ""
      ).trim();
    }
  }

  return "";
}


/**
 * Crée l'identifiant technique unique du cycle.
 *
 * Exemple :
 * 20260809-105-231422-483
 */
function creerIdCycleHistoriqueMenage_(
  logement,
  date
) {
  const fuseau =
    Session.getScriptTimeZone();

  return (
    Utilities.formatDate(
      date,
      fuseau,
      "yyyyMMdd"
    ) +
    "-" +
    logement +
    "-" +
    Utilities.formatDate(
      date,
      fuseau,
      "HHmmss"
    ) +
    "-" +
    String(
      date.getMilliseconds()
    ).padStart(
      3,
      "0"
    )
  );
}


/**
 * Calcule le nombre de minutes entre deux dates.
 */
function calculerMinutesHistoriqueMenage_(
  debut,
  fin
) {
  if (
    !(debut instanceof Date) ||
    isNaN(
      debut.getTime()
    ) ||
    !(fin instanceof Date) ||
    isNaN(
      fin.getTime()
    )
  ) {
    return "";
  }

  return Math.max(
    0,
    Math.round(
      (
        fin.getTime() -
        debut.getTime()
      ) /
      60000
    )
  );
}


/**
 * Applique les formats d'une ligne.
 */
function appliquerFormatsLigneHistoriqueMenage_(
  feuille,
  ligne
) {
  feuille
    .getRange(
      ligne,
      COLONNES_HISTORIQUE_MENAGE.DATE
    )
    .setNumberFormat(
      "dd/MM/yyyy"
    );

  feuille
    .getRange(
      ligne,
      COLONNES_HISTORIQUE_MENAGE.HEURE
    )
    .setNumberFormat(
      "HH:mm:ss"
    );

  feuille
    .getRange(
      ligne,
      COLONNES_HISTORIQUE_MENAGE.DUREE_DEPUIS_DEPART
    )
    .setNumberFormat(
      '0 "min"'
    );

  feuille
    .getRange(
      ligne,
      COLONNES_HISTORIQUE_MENAGE.TEMPS_CONTROLE
    )
    .setNumberFormat(
      '0 "min"'
    );
}


/**
 * Normalise un texte.
 */
function normaliserTexteHistoriqueMenage_(
  valeur
) {
  return String(
    valeur === null ||
    typeof valeur ===
      "undefined"
      ? ""
      : valeur
  ).trim();
}


/**
 * Retourne une date à minuit.
 */
function supprimerHeureHistoriqueMenage_(
  date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}