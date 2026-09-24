function creerTableauDeBord() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const feuille =
    ss.getSheetByName(FEUILLES.TABLEAU_BORD);

  feuille.clear();

  feuille.getRange("A1:J30").breakApart();

  feuille.setHiddenGridlines(true);

  feuille.getRange("A1:J30")
    .setFontFamily("Arial")
    .setVerticalAlignment("middle");

  feuille.getRange("A1:J1")
    .merge()
    .setValue("🏕️ CAPFUN GRAND CERF")
    .setBackground("#17365d")
    .setFontColor("white")
    .setFontSize(18)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  feuille.getRange("A2:J2")
    .merge()
    .setValue("CENTRE OPÉRATIONNEL")
    .setBackground("#17365d")
    .setFontColor("white")
    .setFontSize(16)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  feuille.getRange("A3:E3")
    .merge()
    .setValue("🕒 Dernière actualisation")
    .setBackground("#d9eaf7")
    .setFontWeight("bold");

  feuille.getRange("F3:J3")
    .merge()
    .setValue("Données en attente")
    .setBackground("#d9eaf7")
    .setFontWeight("bold")
    .setHorizontalAlignment("right");

creerBlocParc(feuille);

creerBlocJour(feuille);

creerBlocMenage(feuille);

creerBlocEquipes(feuille);

creerBlocCharge(feuille);

}


function creerBlocParc(feuille) {

  // Titre
  feuille.getRange("A5:E5")
    .merge()
    .setValue("🏡 PARC")
    .setBackground("#17365d")
    .setFontColor("white")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  // Cadre
  dessinerBloc(feuille, "A5:E11");

  const libelles = [
    "Total logements",
    "🟢 Occupés",
    "⚪ Libres",
    "🔴 Indisponibles",
    "Taux d'occupation"
  ];

  for (let i = 0; i < libelles.length; i++) {
    feuille.getRange(6 + i, 2).setValue(libelles[i]);
    feuille.getRange(6 + i, 4)
      .setValue("—")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
  }

  feuille.getRange("B11:D11")
    .merge()
    .setValue("░░░░░░░░░░░░░░░░░░░░")
    .setHorizontalAlignment("center")
    .setBackground("#eeeeee");
}

function creerBlocJour(feuille) {

  // Titre
  feuille.getRange("F5:J5")
    .merge()
    .setValue("📅 AUJOURD'HUI")
    .setBackground("#17365d")
    .setFontColor("white")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  // Cadre aligné sur le bloc PARC.
  dessinerBloc(feuille, "F5:J11");

  const libelles = [
    "🚪 Départs",
    "🎉 Arrivées",
    "🔴 Départs + arrivées",
    "🔵 Départs seuls",
    "🟣 Recontrôle"
  ];

  for (let i = 0; i < libelles.length; i++) {
    feuille.getRange(6 + i, 7)
      .setValue(libelles[i]);

    feuille.getRange(6 + i, 9)
      .setValue("—")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
  }

  /*
   * Bandeau inférieur aligné avec la jauge
   * du bloc PARC, tous deux en ligne 11.
   */
  feuille.getRange("G11:I11")
    .merge()
    .setValue("Priorités du jour")
    .setBackground("#d9eaf7")
    .setFontWeight("normal")
    .setHorizontalAlignment("center");
}

function creerBlocMenage(feuille) {

  feuille.getRange("A14:E14")
    .merge()
    .setValue("🧹 MÉNAGE")
    .setBackground("#17365d")
    .setFontColor("white")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  dessinerBloc(feuille, "A14:E21");

  const libelles = [
    "À faire",
    "À vérifier",
    "Prêts"
  ];

  for (let i = 0; i < libelles.length; i++) {
    feuille.getRange(15 + i, 2).setValue(libelles[i]);

    feuille.getRange(15 + i, 4)
      .setValue("—")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
  }

  feuille.getRange("B20:D20")
    .merge()
    .setValue("En attente des statistiques")
    .setBackground("#d9eaf7")
    .setHorizontalAlignment("center");
}

function dessinerBloc(feuille, plage) {
  feuille.getRange(plage).setBorder(
    true, true, true, true,
    false, false,
    "#17365d",
    SpreadsheetApp.BorderStyle.SOLID_MEDIUM
  );
}

function creerBlocEquipes(feuille) {

  feuille.getRange("F14:J14")
    .merge()
    .setValue("👥 ÉQUIPES")
    .setBackground("#17365d")
    .setFontColor("white")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  dessinerBloc(feuille, "F14:J21");

  for (let i = 0; i < 6; i++) {

    feuille.getRange(15 + i, 7)
      .setValue("Équipe " + (i + 1));

    feuille.getRange(15 + i, 9)
      .setValue("—")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
  }
}

function creerBlocCharge(feuille) {

  feuille.getRange("A23:J23")
    .merge()
    .setValue("🚦 CHARGE DE LA JOURNÉE")
    .setBackground("#17365d")
    .setFontColor("white")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  feuille.getRange("A24:J25")
    .merge()
    .setValue("🟢 JOURNÉE CALME\n0 intervention")
    .setBackground("#d9ead3")
    .setFontWeight("bold")
    .setFontSize(16)
    .setWrap(true)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  dessinerBloc(feuille, "A23:J25");
}

/**
 * =========================================================
 * MISE À JOUR DU CENTRE OPÉRATIONNEL
 * Version 1.16
 * =========================================================
 */
function mettreAJourTableauDeBord() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const statistiques =
    ss.getSheetByName("Statistiques");

  const tableau =
    ss.getSheetByName("Tableau de bord");

  const menage =
    ss.getSheetByName(FEUILLES.MENAGE);

  if (!statistiques) {
    throw new Error(
      'La feuille "Statistiques" est introuvable.'
    );
  }

  if (!tableau) {
    throw new Error(
      'La feuille "Tableau de bord" est introuvable.'
    );
  }

  if (!menage) {
    throw new Error(
      'La feuille "Ménage" est introuvable.'
    );
  }

  /*
   * Lecture des indicateurs dans Statistiques.
   */
  const derniereMiseAJour =
    statistiques.getRange("B3").getValue();

  const totalLogements =
    nombreOuZero(
      statistiques.getRange("B5").getValue()
    );

  const occupes =
    nombreOuZero(
      statistiques.getRange("B6").getValue()
    );

  const libres =
    nombreOuZero(
      statistiques.getRange("B7").getValue()
    );

  const indisponibles =
    nombreOuZero(
      statistiques.getRange("B8").getValue()
    );

  const prets =
  nombreOuZero(
    statistiques.getRange("B18").getValue()
  );

  const departsJour =
    nombreOuZero(
      statistiques.getRange("B11").getValue()
    );

  const arriveesJour =
    nombreOuZero(
      statistiques.getRange("B12").getValue()
    );

  const menageAFaire =
    nombreOuZero(
      statistiques.getRange("B13").getValue()
    );

  const menageAVerifier =
    nombreOuZero(
      statistiques.getRange("B14").getValue()
    );

  const departsArrivees =
    nombreOuZero(
      statistiques.getRange("B15").getValue()
    );

  const departsSeuls =
    nombreOuZero(
      statistiques.getRange("B16").getValue()
    );

  const recontroles =
  nombreOuZero(
    statistiques.getRange("B17").getValue()
  );

  /*
   * Calcul du taux d'occupation.
   */
  const tauxOccupation =
    totalLogements > 0
      ? occupes / totalLogements
      : 0;

  /*
   * Alimentation du bloc PARC.
   */
  tableau.getRange("D6")
    .setValue(totalLogements);

  tableau.getRange("D7")
    .setValue(occupes);

  tableau.getRange("D8")
    .setValue(libres);

  tableau.getRange("D9")
    .setValue(indisponibles);

  tableau.getRange("D10")
    .setValue(tauxOccupation)
    .setNumberFormat("0%");

  tableau.getRange("B11")
    .setValue(
      creerJaugeOccupation(tauxOccupation)
    );

  /*
   * Alimentation du bloc AUJOURD'HUI.
   */
  tableau.getRange("I6")
    .setValue(departsJour);

  tableau.getRange("I7")
    .setValue(arriveesJour);

  tableau.getRange("I8")
    .setValue(departsArrivees);

  tableau.getRange("I9")
    .setValue(departsSeuls);

  tableau.getRange("I10")
    .setValue(recontroles);

  /*
   * Alimentation du bloc MÉNAGE.
   */
  tableau.getRange("D15")
  .setValue(menageAFaire);

tableau.getRange("D16")
  .setValue(menageAVerifier);

tableau.getRange("D17")
  .setValue(prets);

  const travailRestant =
    menageAFaire + menageAVerifier;

  tableau.getRange("B20")
    .setValue(
      travailRestant === 0
        ? "Tous les ménages sont terminés"
        : travailRestant +
          " logement" +
          (travailRestant > 1 ? "s" : "") +
          " restant" +
          (travailRestant > 1 ? "s" : "")
    );

  /*
   * Alimentation du bloc ÉQUIPES.
   */
  mettreAJourEquipesTableauDeBord(
    statistiques,
    tableau
  );

  /*
   * Calcul et affichage de la charge.
   */
  const totalInterventions =
    departsJour +
    arriveesJour +
    menageAFaire +
    menageAVerifier +
    recontroles;

  mettreAJourChargeTableauDeBord(
    tableau,
    totalInterventions
  );

  /*
   * Date et heure de dernière actualisation.
   */
  const dateAffichee =
    derniereMiseAJour instanceof Date
      ? Utilities.formatDate(
          derniereMiseAJour,
          ss.getSpreadsheetTimeZone(),
          "dd/MM/yyyy à HH:mm:ss"
        )
      : derniereMiseAJour;

  tableau.getRange("F3")
    .setValue(dateAffichee || "Non renseignée")
    .setHorizontalAlignment("right");

  SpreadsheetApp.flush();

  ss.toast(
    "Centre opérationnel actualisé.",
    "Tableau de bord",
    3
  );
}


/**
 * Compte exactement les logements à recontrôler
 * dans la feuille Ménage.
 */
function compterRecontrolesTableauDeBord_(
  feuilleMenage
) {
  const derniereLigne =
    feuilleMenage.getLastRow();

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return 0;
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const etats =
    feuilleMenage
      .getRange(
        LIGNES.DEBUT,
        COLONNES_MENAGE.ETAT_MENAGE,
        nombreLignes,
        1
      )
      .getValues();

  const etatRecherche =
    normaliserTexteTableauDeBord_(
      ETAT_MENAGE.A_RECONTROLER
    );

  return etats.reduce(
    function(total, ligne) {
      const etat =
        normaliserTexteTableauDeBord_(
          ligne[0]
        );

      return total + (
        etat === etatRecherche
          ? 1
          : 0
      );
    },
    0
  );
}


function normaliserTexteTableauDeBord_(
  valeur
) {
  return String(
    valeur || ""
  )
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


/**
 * Transforme une valeur vide ou incorrecte en zéro.
 */
function nombreOuZero(valeur) {

  const nombre = Number(valeur);

  return isNaN(nombre)
    ? 0
    : nombre;
}


/**
 * Crée une jauge textuelle sur 20 caractères.
 */
function creerJaugeOccupation(tauxOccupation) {

  const tauxLimite =
    Math.max(
      0,
      Math.min(1, tauxOccupation)
    );

  const nombreCases = 20;

  const casesPleines =
    Math.round(
      tauxLimite * nombreCases
    );

  const casesVides =
    nombreCases - casesPleines;

  return (
    "█".repeat(casesPleines) +
    "░".repeat(casesVides)
  );
}


/**
 * Recopie les équipes de Statistiques
 * dans le Centre opérationnel.
 *
 * Les équipes se trouvent dans les colonnes D et E,
 * à partir de la ligne 5.
 */
function mettreAJourEquipesTableauDeBord(
  statistiques,
  tableau
) {

  /*
   * Nettoyage des six emplacements disponibles.
   */
  tableau.getRange("G15:G20")
    .clearContent();

  tableau.getRange("I15:I20")
    .clearContent();

  const derniereLigne =
    Math.max(
      statistiques.getLastRow(),
      5
    );

  const equipes =
    statistiques
      .getRange(
        5,
        4,
        derniereLigne - 4,
        2
      )
      .getValues()
      .filter(function(ligne) {
        return ligne[0] !== "";
      })
      .slice(0, 6);

  if (equipes.length === 0) {

    tableau.getRange("G15")
      .setValue("Aucune équipe");

    tableau.getRange("I15")
      .setValue(0);

    return;
  }

  equipes.forEach(function(equipe, index) {

    const ligneTableau =
      15 + index;

    tableau
      .getRange(ligneTableau, 7)
      .setValue(equipe[0]);

    tableau
      .getRange(ligneTableau, 9)
      .setValue(
        nombreOuZero(equipe[1])
      );
  });
}


/**
 * Affiche le niveau de charge de la journée.
 *
 * Moins de 40 : journée calme
 * De 40 à 50 : journée chargée
 * Plus de 50 : journée très chargée
 */
function mettreAJourChargeTableauDeBord(
  tableau,
  totalInterventions
) {

  let titre;
  let couleur;

  if (totalInterventions < 40) {

    titre = "🟢 JOURNÉE CALME";
    couleur = "#d9ead3";

  } else if (totalInterventions <= 50) {

    titre = "🟡 JOURNÉE CHARGÉE";
    couleur = "#fff2cc";

  } else {

    titre = "🔴 JOURNÉE TRÈS CHARGÉE";
    couleur = "#f4cccc";
  }

  const texteInterventions =
    totalInterventions +
    " intervention" +
    (totalInterventions > 1 ? "s" : "");

  tableau.getRange("A24")
    .setValue(
      titre +
      "\n" +
      texteInterventions
    )
    .setBackground(couleur);
}

function ouvrirTableauDeBord() {

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuille =
    classeur.getSheetByName(
      "Tableau de bord"
    );

  if (!feuille) {
    classeur.toast(
      "La feuille Tableau de bord est introuvable.",
      "❌ Erreur",
      5
    );

    return;
  }

  classeur.setActiveSheet(feuille);
}
