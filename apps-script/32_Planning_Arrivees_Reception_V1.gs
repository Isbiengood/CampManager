/**
 * ============================================================
 * CAMPMANAGER
 * PRÉPARATION RÉCEPTION — VERSION V1.7 OPEN SOURCE
 * RECHERCHE DES ARRIVÉES / DÉPARTS À PARTIR DE BASE
 * ============================================================
 *
 * LOGIQUE :
 *
 * eSeason -> Import -> Base
 *                    ^
 *                    |
 *          réservations manuelles
 *
 * Les recherches de dates lisent BASE,
 * puis réordonnent la feuille Réception.
 *
 * Réception reste une vue d'exploitation :
 * aucune réservation n'est créée ou modifiée ici.
 *
 * V1.3 : les recherches et le retour au tri normal
 * n'appellent plus mettreAJourReception(), afin de ne jamais
 * transformer un état manuel « Parti » en « Occupé ».
 *
 * V1.6 : ajout de trois tris sûrs permettant de placer en premier :
 * - les logements Libres ;
 * - les logements Prêts ;
 * - les logements Occupés.
 *
 * Le tri ne modifie AUCUNE valeur : il déplace seulement les lignes
 * complètes de Réception, donc état, personnel, gouvernante, téléphone,
 * dernier contrôle, départ réel, etc. restent attachés au logement.
 *
 * V1.7 : la priorité spéciale « ⚠️ Client en attente » est conservée
 * comme priorité la plus haute à l'intérieur d'un tri par date.
 */


/* ============================================================
 * ARRIVÉES
 * ============================================================ */


/**
 * Met en premier les logements dont la date d'arrivée
 * dans Base correspond à demain.
 */
function receptionArriveesDemainEnPremier() {
  const demain =
    dateDuJourPlanningReception_();

  demain.setDate(
    demain.getDate() +
    1
  );

  trierReceptionSelonBase_(
    demain,
    "arrivee"
  );
}


/**
 * Demande une date d'arrivée.
 */
function receptionChoisirDateArriveesEnPremier() {
  const demain =
    dateDuJourPlanningReception_();

  demain.setDate(
    demain.getDate() +
    1
  );

  const date =
    demanderDatePlanningReception_(
      "📅 Préparer les arrivées",
      "Saisissez la date d'arrivée à placer en premier.",
      demain
    );

  if (
    !date
  ) {
    return;
  }

  trierReceptionSelonBase_(
    date,
    "arrivee"
  );
}


/* ============================================================
 * DÉPARTS
 * ============================================================ */


/**
 * Met en premier les logements dont la date de départ
 * dans Base correspond à aujourd'hui.
 */
function receptionDepartsAujourdhuiEnPremier() {
  trierReceptionSelonBase_(
    dateDuJourPlanningReception_(),
    "depart"
  );
}


/**
 * Demande une date de départ.
 */
function receptionChoisirDateDepartsEnPremier() {
  const aujourdHui =
    dateDuJourPlanningReception_();

  const date =
    demanderDatePlanningReception_(
      "📤 Préparer les départs",
      "Saisissez la date de départ à placer en premier.",
      aujourdHui
    );

  if (
    !date
  ) {
    return;
  }

  trierReceptionSelonBase_(
    date,
    "depart"
  );
}


/* ============================================================
 * TRI NORMAL
 * ============================================================ */


/**
 * Rétablit la vue normale de Réception.
 */
function receptionRetablirTriNormal() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  const feuilleLogements =
    classeur.getSheetByName(
      FEUILLES.LOGEMENTS
    );

  if (
    !feuilleReception ||
    !feuilleLogements
  ) {
    throw new Error(
      "La feuille Réception ou Logements est introuvable."
    );
  }

  /*
   * IMPORTANT :
   * on NE relance PAS mettreAJourReception().
   *
   * Une recherche Arrivée/Départ change temporairement
   * l'ordre physique des lignes. Le moteur Réception historique
   * reconstruit certaines colonnes selon l'ordre de Logements,
   * ce qui pourrait décaler un état manuel comme « Parti ».
   *
   * Ici on remet uniquement les lignes dans l'ordre permanent
   * de la feuille Logements, sans recalculer aucun état.
   */
  retablirOrdreLogementsReceptionSansRecalcul_(
    feuilleReception,
    feuilleLogements
  );

  /*
   * On enlève uniquement la mise en évidence ajoutée
   * par le moteur de recherche.
   */
  reinitialiserMiseEnEvidencePlanningReception_(
    feuilleReception
  );

  /*
   * On réapplique les couleurs normales du logiciel
   * si la fonction existe, sans modifier les valeurs.
   */
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
    "Tri normal de Réception rétabli sans modifier les états.",
    "↩️ Réception",
    5
  );
}


/**
 * Replace l'intégralité des lignes de Réception dans
 * l'ordre permanent de la feuille Logements.
 *
 * Toutes les colonnes restent attachées à leur logement :
 * priorité, état, personnel, gouvernante, téléphone,
 * dernier contrôle, départ réel, etc.
 */
function retablirOrdreLogementsReceptionSansRecalcul_(
  feuilleReception,
  feuilleLogements
) {
  const derniereLigneReception =
    feuilleReception.getLastRow();

  if (
    derniereLigneReception <
      LIGNES.DEBUT
  ) {
    return;
  }

  const nombreLignesReception =
    derniereLigneReception -
    LIGNES.DEBUT +
    1;

  const nombreColonnes =
    COLONNES_RECEPTION.NOMBRE_COLONNES;

  const donneesReception =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        1,
        nombreLignesReception,
        nombreColonnes
      )
      .getValues();

  const lignesParLogement = {};

  donneesReception.forEach(
    function(ligne) {
      const logement =
        normaliserLogementPlanningReception_(
          ligne[
            COLONNES_RECEPTION.LOGEMENT - 1
          ]
        );

      if (
        logement !== ""
      ) {
        lignesParLogement[
          logement
        ] =
          ligne;
      }
    }
  );

  const derniereLigneLogements =
    feuilleLogements.getLastRow();

  const ordreLogements =
    derniereLigneLogements >=
      LIGNES.DEBUT
      ? feuilleLogements
          .getRange(
            LIGNES.DEBUT,
            COLONNES_LOGEMENTS.LOGEMENT,
            derniereLigneLogements -
              LIGNES.DEBUT +
              1,
            1
          )
          .getDisplayValues()
          .map(
            function(ligne) {
              return normaliserLogementPlanningReception_(
                ligne[0]
              );
            }
          )
          .filter(
            function(logement) {
              return logement !== "";
            }
          )
      : [];

  const resultat = [];
  const dejaAjoutes = {};

  /*
   * 1. Ordre officiel de la feuille Logements.
   */
  ordreLogements.forEach(
    function(logement) {
      if (
        lignesParLogement[
          logement
        ]
      ) {
        resultat.push(
          lignesParLogement[
            logement
          ]
        );

        dejaAjoutes[
          logement
        ] =
          true;
      }
    }
  );

  /*
   * 2. Sécurité :
   * une ligne éventuellement absente de Logements
   * n'est jamais supprimée.
   */
  donneesReception.forEach(
    function(ligne) {
      const logement =
        normaliserLogementPlanningReception_(
          ligne[
            COLONNES_RECEPTION.LOGEMENT - 1
          ]
        );

      if (
        logement !== "" &&
        !dejaAjoutes[
          logement
        ]
      ) {
        resultat.push(
          ligne
        );
      }
    }
  );

  feuilleReception
    .getRange(
      LIGNES.DEBUT,
      1,
      resultat.length,
      nombreColonnes
    )
    .setValues(
      resultat
    );
}


/**
 * Enlève le rouge/gras temporaire des colonnes
 * Départ et Arrivée suivante.
 */
function reinitialiserMiseEnEvidencePlanningReception_(
  feuilleReception
) {
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

  [
    COLONNES_RECEPTION.DEPART,
    COLONNES_RECEPTION.ARRIVEE_SUIVANTE
  ].forEach(
    function(colonne) {
      feuilleReception
        .getRange(
          LIGNES.DEBUT,
          colonne,
          nombreLignes,
          1
        )
        .setFontColor(
          COULEURS_TEXTE.NOIR
        )
        .setFontWeight(
          "normal"
        );
    }
  );
}


/* ============================================================
 * MOTEUR DE RECHERCHE BASE -> RÉCEPTION
 * ============================================================ */


/**
 * Recherche les logements correspondant à une date dans Base,
 * puis les place en premier dans Réception.
 *
 * V1.6 :
 * - Base est la source de vérité pour le nombre de départs/arrivées ;
 * - la colonne Départ visible dans Réception n'est PAS utilisée
 *   pour déterminer le nombre de départs ;
 * - seules les réservations actives sont retenues ;
 * - un logement n'est compté qu'une seule fois ;
 * - aucun recalcul de Réception n'est lancé.
 *
 * typeDate :
 * - "arrivee"
 * - "depart"
 */
function trierReceptionSelonBase_(
  dateChoisie,
  typeDate
) {
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

  /*
   * IMPORTANT :
   * on ne reconstruit pas Réception ici.
   *
   * La date recherchée vient directement de Base.
   * Réception est seulement réordonnée, ce qui préserve
   * les états manuels comme « Parti ».
   */

  const logementsCibles =
    rechercherLogementsDansBaseParDate_(
      feuilleBase,
      dateChoisie,
      typeDate
    );

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

  const donnees =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        1,
        nombreLignes,
        COLONNES_RECEPTION.NOMBRE_COLONNES
      )
      .getValues();

  /*
   * V1.6 — SÉCURITÉ :
   * Base reste la source de vérité pour les arrivées / départs.
   * On conserve uniquement les logements qui existent réellement
   * dans la feuille Réception.
   *
   * Aucun état n'est recalculé ici :
   * - pas de mettreAJourReception()
   * - pas de modification Occupé / Parti / Prêt / Libre
   * - pas de modification Personnel / Gouvernante
   */
  const logementsPresentsReception = {};

  donnees.forEach(
    function(ligne) {
      const logement =
        normaliserLogementPlanningReception_(
          ligne[
            COLONNES_RECEPTION.LOGEMENT - 1
          ]
        );

      if (logement !== "") {
        logementsPresentsReception[
          logement
        ] = true;
      }
    }
  );

  Object.keys(
    logementsCibles
  ).forEach(
    function(logement) {
      if (
        !logementsPresentsReception[
          logement
        ]
      ) {
        delete logementsCibles[
          logement
        ];
      }
    }
  );

  const ordrePriorites = {};

  /*
   * Client déjà arrivé et en attente :
   * priorité supérieure aux priorités ménage classiques.
   * Elle reste dans le groupe de date choisi lorsque l'utilisateur
   * prépare une arrivée ou un départ.
   */
  ordrePriorites[
    "⚠️"
  ] = 0;

  ordrePriorites[
    PRIORITE.ROUGE
  ] = 1;

  ordrePriorites[
    PRIORITE.VIOLET
  ] = 2;

  ordrePriorites[
    PRIORITE.BLEU
  ] = 3;

  ordrePriorites[
    PRIORITE.BLANC
  ] = 4;

  ordrePriorites[
    PRIORITE.NOIR
  ] = 5;

  donnees.sort(
    function(a, b) {
      const logementA =
        normaliserLogementPlanningReception_(
          a[
            COLONNES_RECEPTION.LOGEMENT - 1
          ]
        );

      const logementB =
        normaliserLogementPlanningReception_(
          b[
            COLONNES_RECEPTION.LOGEMENT - 1
          ]
        );

      const cibleA =
        logementsCibles[
          logementA
        ]
          ? 0
          : 1;

      const cibleB =
        logementsCibles[
          logementB
        ]
          ? 0
          : 1;

      if (
        cibleA !==
          cibleB
      ) {
        return cibleA -
          cibleB;
      }

      const pA =
        ordrePriorites[
          String(
            a[
              COLONNES_RECEPTION.PRIORITE - 1
            ] || ""
          ).trim()
        ] || 9;

      const pB =
        ordrePriorites[
          String(
            b[
              COLONNES_RECEPTION.PRIORITE - 1
            ] || ""
          ).trim()
        ] || 9;

      if (
        pA !==
          pB
      ) {
        return pA -
          pB;
      }

      return logementA.localeCompare(
        logementB,
        "fr",
        {
          numeric: true,
          sensitivity: "base"
        }
      );
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

  /*
   * Mise en évidence :
   * - arrivée recherchée -> colonne Arrivée suivante ;
   * - départ recherché -> colonne Départ.
   *
   * On se base toujours sur la sélection venant de Base.
   */
  const colonneAffichage =
    typeDate ===
      "depart"
      ? COLONNES_RECEPTION.DEPART
      : COLONNES_RECEPTION.ARRIVEE_SUIVANTE;

  const plage =
    feuilleReception.getRange(
      LIGNES.DEBUT,
      colonneAffichage,
      nombreLignes,
      1
    );

  const couleurs = [];
  const graisses = [];

  donnees.forEach(
    function(ligne) {
      const logement =
        normaliserLogementPlanningReception_(
          ligne[
            COLONNES_RECEPTION.LOGEMENT - 1
          ]
        );

      const estCible =
        !!logementsCibles[
          logement
        ];

      couleurs.push([
        estCible
          ? COULEURS.ROUGE
          : COULEURS_TEXTE.NOIR
      ]);

      graisses.push([
        estCible
          ? "bold"
          : "normal"
      ]);
    }
  );

  plage.setFontColors(
    couleurs
  );

  plage.setFontWeights(
    graisses
  );

  SpreadsheetApp.flush();

  const dateTexte =
    Utilities.formatDate(
      dateChoisie,
      Session.getScriptTimeZone(),
      "dd/MM/yyyy"
    );

  const nombreCibles =
    Object.keys(
      logementsCibles
    ).length;

  classeur.toast(
    nombreCibles +
      " logement(s) trouvé(s) pour " +
      (
        typeDate ===
          "depart"
          ? "un départ"
          : "une arrivée"
      ) +
      " le " +
      dateTexte +
      ".",
    typeDate ===
        "depart"
      ? "📤 Départs"
      : "📅 Arrivées",
    6
  );
}


/**
 * Recherche dans BASE les logements correspondant à la date choisie.
 *
 * Seules les réservations actives sont prises en compte.
 *
 * Retour :
 * {
 *   "101": true,
 *   "205": true
 * }
 */
function rechercherLogementsDansBaseParDate_(
  feuilleBase,
  dateChoisie,
  typeDate
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

  const cleRecherche =
    cleJourPlanningReception_(
      dateChoisie
    );

  const colonneDate =
    typeDate ===
      "depart"
      ? COLONNES_BASE.DATE_DEPART
      : COLONNES_BASE.DATE_ARRIVEE;

  donnees.forEach(
    function(ligne) {
      const etat =
        String(
          ligne[
            COLONNES_BASE.ETAT_RESERVATION - 1
          ] || ""
        ).trim();

      if (
        etat !==
          ETAT_RESERVATION.ACTIVE
      ) {
        return;
      }

      const date =
        convertirDatePlanningBase_(
          ligne[
            colonneDate - 1
          ]
        );

      if (
        !date ||
        cleJourPlanningReception_(
          date
        ) !==
          cleRecherche
      ) {
        return;
      }

      const logement =
        normaliserLogementPlanningReception_(
          ligne[
            COLONNES_BASE.LOGEMENT - 1
          ]
        );

      if (
        logement !== ""
      ) {
        resultat[
          logement
        ] =
          true;
      }
    }
  );

  return resultat;
}


/**
 * Convertit une date provenant de Base.
 */
function convertirDatePlanningBase_(
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

  return convertirDatePlanningReception_(
    valeur
  );
}


/**
 * Normalise le numéro de logement pour comparer Base et Réception.
 */
function normaliserLogementPlanningReception_(
  valeur
) {
  return String(
    valeur || ""
  )
    .trim()
    .toUpperCase();
}


/* ============================================================
 * OUTILS
 * ============================================================ */


/**
 * Fenêtre commune de saisie d'une date.
 */
function demanderDatePlanningReception_(
  titre,
  texte,
  proposition
) {
  const ui =
    SpreadsheetApp.getUi();

  const exemple =
    Utilities.formatDate(
      proposition,
      Session.getScriptTimeZone(),
      "dd/MM/yyyy"
    );

  const reponse =
    ui.prompt(
      titre,
      texte +
        "\n\nFormat : JJ/MM/AAAA" +
        "\nExemple : " +
        exemple,
      ui.ButtonSet.OK_CANCEL
    );

  if (
    reponse.getSelectedButton() !==
      ui.Button.OK
  ) {
    return null;
  }

  const date =
    convertirDatePlanningReception_(
      reponse.getResponseText()
    );

  if (
    !date
  ) {
    ui.alert(
      "Date invalide. Utilisez le format JJ/MM/AAAA."
    );

    return null;
  }

  return date;
}


/**
 * Aujourd'hui à minuit.
 */
function dateDuJourPlanningReception_() {
  const maintenant =
    new Date();

  return new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    maintenant.getDate()
  );
}


/**
 * Convertit JJ/MM/AAAA ou JJ-MM-AAAA.
 */
function convertirDatePlanningReception_(
  valeur
) {
  if (
    valeur instanceof Date &&
    !isNaN(      valeur.getTime()
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

  const jour =
    Number(
      match[1]
    );

  const mois =
    Number(
      match[2]
    );

  const annee =
    Number(
      match[3]
    );

  const date =
    new Date(
      annee,
      mois - 1,
      jour
    );

  if (
    isNaN(
      date.getTime()
    ) ||
    date.getDate() !==
      jour ||
    date.getMonth() !==
      mois - 1 ||
    date.getFullYear() !==
      annee
  ) {
    return null;
  }

  return date;
}


/**
 * Clé YYYY-MM-DD.
 */
function cleJourPlanningReception_(
  valeur
) {
  if (
    !(valeur instanceof Date) ||
    isNaN(
      valeur.getTime()
    )
  ) {
    return "";
  }

  return (
    valeur.getFullYear() +
    "-" +
    String(
      valeur.getMonth() +
      1
    ).padStart(
      2,
      "0"
    ) +
    "-" +
    String(
      valeur.getDate()
    ).padStart(
      2,
      "0"
    )
  );
}

/* ============================================================
 * TRI PAR ÉTAT — V1.6
 * ============================================================
 *
 * Fonctions destinées au menu :
 * - receptionLibresEnPremier()
 * - receptionPretsEnPremier()
 * - receptionOccupesEnPremier()
 *
 * IMPORTANT :
 * - aucune reconstruction de Réception ;
 * - aucun appel à mettreAJourReception() ;
 * - aucune modification d'état ;
 * - aucune perte d'affectation ;
 * - ordre relatif conservé à l'intérieur de chaque groupe.
 */

function receptionLibresEnPremier() {
  trierReceptionEtatEnPremier_(
    ETAT_RECEPTION.LIBRE,
    "Libres"
  );
}

function receptionPretsEnPremier() {
  trierReceptionEtatEnPremier_(
    ETAT_RECEPTION.PRET,
    "Prêts"
  );
}

function receptionOccupesEnPremier() {
  trierReceptionEtatEnPremier_(
    ETAT_RECEPTION.OCCUPE,
    "Occupés"
  );
}

/**
 * Place l'état choisi en premier sans modifier aucune donnée.
 * Le tri est stable : l'ordre actuel des lignes est conservé
 * à l'intérieur du groupe choisi et du reste de la feuille.
 */
function trierReceptionEtatEnPremier_(
  etatCible,
  libelle
) {
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
    classeur.toast(
      "Aucun logement à trier.",
      "Réception",
      4
    );
    return;
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

  const donnees =
    plage.getValues();

  const cibles = [];
  const autres = [];

  const cibleNormalisee =
    normaliserEtatTriReceptionV14_(
      etatCible
    );

  donnees.forEach(
    function(ligne) {
      const etat =
        ligne[
          COLONNES_RECEPTION.ETAT - 1
        ];

      if (
        normaliserEtatTriReceptionV14_(
          etat
        ) ===
        cibleNormalisee
      ) {
        cibles.push(
          ligne
        );
      } else {
        autres.push(
          ligne
        );
      }
    }
  );

  plage.setValues(
    cibles.concat(
      autres
    )
  );

  if (
    typeof reinitialiserMiseEnEvidencePlanningReception_ ===
      "function"
  ) {
    reinitialiserMiseEnEvidencePlanningReception_(
      feuilleReception
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
      " logement(s) " +
      libelle +
      " placé(s) en premier.",
    "Tri Réception",
    5
  );

  return {
    etat: etatCible,
    nombre: cibles.length
  };
}

function normaliserEtatTriReceptionV14_(
  valeur
) {
  return String(
    valeur || ""
  )
    .trim()
    .toLocaleLowerCase(
      "fr"
    )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}
