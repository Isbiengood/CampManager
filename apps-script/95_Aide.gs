/**
 * ============================================================
 * CAMPMANAGER V4 — PAGE AIDE PAR RÔLE
 * VERSION 2.5 OPEN SOURCE — 25/09/2026 — NAVIGATION SIMPLE PAR LIENS
 * ============================================================
 *
 * Crée / reconstruit une feuille "Aide" dans le Google Sheet.
 *
 * Sections :
 * - Direction
 * - Réceptionniste
 * - Femme de chambre
 * - Gouvernante
 *
 * Installation :
 * 1. Créer / remplacer le fichier Apps Script : 95_Aide.gs
 * 2. Coller ce code.
 * 3. Enregistrer.
 * 4. Exécuter une fois : creerPageAideCampManager
 *
 * Pour reconstruire l'aide après une modification :
 * exécuter à nouveau creerPageAideCampManager().
 *
 * Pour ouvrir l'aide depuis un menu :
 * ouvrirAideCampManager()
 *
 * Les 4 rôles utilisent les liens internes standards de Google Sheets.
 * ============================================================
 */

function creerPageAideCampManager() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nomFeuille = "Aide";

  let feuille = ss.getSheetByName(nomFeuille);

  if (!feuille) {
    feuille = ss.insertSheet(nomFeuille);
  }

  // Réaffiche toutes les lignes au cas où une vue par rôle
  // avait masqué les lignes lors d'une utilisation précédente.
  try {
    feuille.showRows(1, feuille.getMaxRows());
  } catch (erreur) {
    console.log("Réaffichage des lignes Aide : " + erreur.message);
  }

  // Supprime les anciens boutons invisibles de navigation
  // avant de reconstruire la page.
  supprimerBoutonsImagesAide_(feuille);

  // Nettoyage complet.
  feuille.clear();
  feuille.clearFormats();

  // 6 colonnes pour une mise en page confortable.
  if (feuille.getMaxColumns() < 6) {
    feuille.insertColumnsAfter(
      feuille.getMaxColumns(),
      6 - feuille.getMaxColumns()
    );
  }

  feuille.setFrozenRows(4);
  feuille.setHiddenGridlines(true);

  // Largeurs.
  feuille.setColumnWidth(1, 30);
  feuille.setColumnWidth(2, 190);
  feuille.setColumnWidth(3, 190);
  feuille.setColumnWidth(4, 190);
  feuille.setColumnWidth(5, 190);
  feuille.setColumnWidth(6, 30);

  // ==========================================================
  // TITRE
  // ==========================================================

  feuille
    .getRange("B1:E1")
    .merge()
    .setValue("📘 CAMPMANAGER V4 — AIDE")
    .setBackground("#17365d")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(20)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  feuille.setRowHeight(1, 42);

  feuille
    .getRange("B2:E2")
    .merge()
    .setValue(
      "Cliquez sur votre rôle pour accéder directement aux consignes."
    )
    .setBackground("#d9eaf7")
    .setFontColor("#17365d")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  // Lignes de départ des sections.
  const lignes = {
    direction: 8,
    reception: 47,
    femme: 82,
    gouvernante: 108
  };

  // ==========================================================
  // BOUTONS DE NAVIGATION
  // ==========================================================

  creerBoutonAide_(
    feuille,
    "B4",
    "👨‍💼 DIRECTION",
    lignes.direction,
    "#d9ead3"
  );

  creerBoutonAide_(
    feuille,
    "C4",
    "🏨 RÉCEPTIONNISTE",
    lignes.reception,
    "#cfe2f3"
  );

  creerBoutonAide_(
    feuille,
    "D4",
    "🧹 FEMME DE CHAMBRE",
    lignes.femme,
    "#fff2cc"
  );

  creerBoutonAide_(
    feuille,
    "E4",
    "✅ GOUVERNANTE",
    lignes.gouvernante,
    "#eadcf8"
  );

  // ==========================================================
  // DIRECTION
  // ==========================================================

  const finDirection = ecrireSectionAide_(
    feuille,
    lignes.direction,
    "👨‍💼 DIRECTION — CAMPMANAGER & ACCÈS V4",
    "#d9ead3",
    [
      [
        "Votre rôle",
        "Piloter l'exploitation, contrôler les priorités et assurer la cohérence entre Import, Base, Réception, Ménage et CampManager V4."
      ],
      [
        "Menu CampManager",
        "Le menu 🏢 CampManager regroupe les fonctions utilisées au quotidien pour l'exploitation : import des réservations, actualisation, tableau de bord, application V4, tri / organisation de Réception, rapports, aide et maintenance courante."
      ],
      [
        "Actualiser le logiciel",
        "Utilisez 🏢 CampManager > 🔄 Actualiser le logiciel lorsqu'une mise à jour générale est nécessaire ou après une modification importante qui ne semble pas encore apparaître."
      ],
      [
        "Arrivées / Départs",
        "Les recherches Arrivées et Départs se basent sur les données de Base. Après une recherche, utilisez Rétablir le tri normal pour revenir à l'affichage habituel."
      ],
      [
        "Tri du parc",
        "Les tris permettent d'afficher plus facilement les logements Libres, Prêts ou Occupés en priorité. Un tri ne modifie pas l'état réel d'un logement."
      ],
      [
        "Import des réservations",
        "Les réservations importées arrivent dans Import puis alimentent Base. En fonctionnement normal, il n'est pas nécessaire de libérer ou réparer Import avant chaque chargement."
      ],
      [
        "Réservation manuelle",
        "Une réservation créée manuellement doit être saisie dans Base. Les réservations provenant des imports continuent d'être alimentées par Import."
      ],
      [
        "Modification de séjour",
        "En cas de changement de dates, de logement ou de switch le jour même, vérifiez toujours que l'Import correspond à la situation réelle afin d'éviter qu'une ancienne information ne revienne lors d'une synchronisation."
      ],
      [
        "Affecter le personnel",
        "Dans Réception, renseignez le personnel et la gouvernante pour chaque logement concerné."
      ],
      [
        "Double rôle",
        "Une personne déclarée à la fois Femme de chambre + Gouvernante peut, selon ses droits, valider directement son propre logement de À faire vers Prêt."
      ],
      [
        "Client en attente",
        "Si le client est déjà arrivé et que son logement n'est pas prêt, la Réception renseigne son numéro dans Téléphone attente. Le logement devient prioritaire ⚠️."
      ],
      [
        "Priorités",
        "⚠️ Client en attente > 🔴 Départ + arrivée > 🟣 Recontrôle > 🔵 Ménage à faire."
      ],
      [
        "Menu Accès V4",
        "Le menu Accès V4 sert principalement à vérifier et gérer les accès utilisateurs ainsi qu'à effectuer certaines opérations de maintenance."
      ],
      [
        "État des accès",
        "Utilisez Voir l'état des accès pour contrôler si les utilisateurs disposent correctement de leur accès V4."
      ],
      [
        "PIN / utilisateur",
        "Chaque utilisateur doit idéalement utiliser son propre accès. En cas de départ, de changement d'utilisateur ou de problème de connexion, utilisez les fonctions prévues pour réinitialiser, désactiver ou réactiver l'accès."
      ],
      [
        "Synchronisation 1 minute",
        "La synchronisation automatique fonctionne normalement sans intervention. Ne réinstallez la synchronisation que si elle ne fonctionne plus correctement."
      ],
      [
        "Libérer la feuille Import",
        "À utiliser uniquement si Import est réellement bloqué ou protégé et empêche le chargement. Cette opération n'est pas nécessaire avant chaque import."
      ],
      [
        "Protections Drive",
        "La réparation des protections Drive sert en cas de problème d'autorisation. Elle n'a normalement pas besoin d'être refaite à chaque changement d'ordinateur."
      ],
      [
        "Ménage sur Drive",
        "La feuille Ménage reste une solution de secours. L'utilisation normale sur le terrain se fait depuis CampManager V4."
      ],
      [
        "En cas de problème",
        "Ne modifiez pas les colonnes techniques cachées. Commencez par actualiser le logiciel, puis vérifiez Import, Base et Réception avant toute correction manuelle."
      ]
    ]
  );

  creerLienRetourHautAide_(feuille, finDirection + 1);

  // ==========================================================
  // RÉCEPTION
  // ==========================================================

  const finReception = ecrireSectionAide_(
    feuille,
    lignes.reception,
    "🏨 RÉCEPTIONNISTE",
    "#cfe2f3",
    [
      [
        "Avant de commencer",
        "Travaillez principalement dans la feuille Réception. Les informations de réservation sont issues de Base, elle-même alimentée par la feuille Import."
      ],
      [
        "Client encore sur place",
        "Le logement reste Occupé tant que le client n'est pas réellement parti."
      ],
      [
        "Client parti",
        "Dès le départ réel du client, passez l'état de Occupé à Parti."
      ],
      [
        "Pourquoi 'Parti' ?",
        "Le passage sur Parti déclenche le circuit ménage. Après synchronisation, la tâche devient disponible dans CampManager V4 pour l'équipe affectée."
      ],
      [
        "Personnel",
        "Affectez la femme de chambre ou le binôme dans Personnel."
      ],
      [
        "Gouvernante",
        "Affectez la personne chargée du contrôle dans Gouvernante."
      ],
      [
        "Arrivées / Départs",
        "Utilisez 🏢 CampManager > ↕️ Trier / organiser Réception pour afficher les arrivées ou les départs d'une date précise."
      ],
      [
        "Rétablir le tri normal",
        "Après une recherche Arrivées / Départs ou un tri particulier, utilisez Rétablir le tri normal pour revenir à l'affichage habituel."
      ],
      [
        "Client déjà arrivé",
        "Saisissez son numéro de téléphone dans Téléphone attente si son logement n'est pas prêt."
      ],
      [
        "Priorité ⚠️",
        "Dès que le téléphone est renseigné, le logement devient prioritaire ⚠️ et doit être traité en priorité jusqu'à Prêt."
      ],
      [
        "Après validation Prêt",
        "Le ⚠️ disparaît, mais le numéro du client reste visible en Réception afin que l'accueil puisse l'appeler."
      ],
      [
        "Appeler le client",
        "Après avoir prévenu le client que son logement est prêt, supprimez manuellement son numéro de Téléphone attente."
      ],
      [
        "SWITCH LE JOUR MÊME",
        "⚠️ IMPORTANT : lorsqu'un client change de logement le jour même, il ne suffit pas de corriger uniquement Réception. Il faut également modifier l'Import afin que le nouveau logement soit la référence lors des synchronisations suivantes."
      ],
      [
        "Exemple de switch",
        "Le client devait être en 101 mais passe finalement en 205 : mettez à jour la situation dans Réception ET faites en sorte que l'Import indique également le 205."
      ],
      [
        "Après un switch",
        "Vérifiez que l'ancien logement est correctement libéré, que le nouveau est occupé et que les tâches ménage concernent les bons logements."
      ],
      [
        "Règle simple",
        "MODIFICATION DE SÉJOUR = VÉRIFICATION / MODIFICATION DE L'IMPORT."
      ],
      [
        "Délai de synchronisation",
        "Une modification peut demander environ 1 à 2 minutes avant d'apparaître partout. Évitez de refaire plusieurs fois la même modification pendant ce délai."
      ],
      [
        "Erreur d'affectation",
        "Corrigez Personnel ou Gouvernante dans Réception, puis actualisez si nécessaire."
      ],
      [
        "Ne pas modifier",
        "Évitez toute modification directe dans les colonnes techniques ou cachées."
      ]
    ]
  );

  creerLienRetourHautAide_(feuille, finReception + 1);

  // ==========================================================
  // FEMME DE CHAMBRE
  // ==========================================================

  const finFemme = ecrireSectionAide_(
    feuille,
    lignes.femme,
    "🧹 FEMME DE CHAMBRE",
    "#fff2cc",
    [
      [
        "Usage conseillé",
        "Utilisez CampManager V4 sur votre téléphone. La feuille Google Sheets Ménage sert uniquement de solution de secours."
      ],
      [
        "À faire",
        "Le logement est à nettoyer."
      ],
      [
        "Priorité ⚠️",
        "Un logement marqué ⚠️ correspond à un client déjà arrivé et en attente. Il doit être traité en priorité."
      ],
      [
        "Ordre des priorités",
        "Respectez l'ordre indiqué dans CampManager : client en attente, départ + arrivée, recontrôle, puis ménage à faire."
      ],
      [
        "Validation normale",
        "Lorsque le ménage est terminé, passez le logement de À faire à À vérifier."
      ],
      [
        "Après validation",
        "Le logement passe à la gouvernante pour contrôle."
      ],
      [
        "En cas d'erreur",
        "Si vous avez validé le mauvais logement, remettez-le sur À faire si cette option vous est proposée ou contactez la Réception / Gouvernante."
      ],
      [
        "Ne pas choisir Prêt",
        "Une femme de chambre qui n'a pas le rôle Gouvernante ne doit pas passer un logement directement sur Prêt."
      ],
      [
        "Ne pas choisir À recontrôler",
        "Le statut À recontrôler appartient au circuit de contrôle gouvernante."
      ],
      [
        "Double rôle",
        "Si vous êtes également Gouvernante et que vos droits le permettent, CampManager peut vous autoriser à passer directement votre propre logement de À faire à Prêt."
      ],
      [
        "Binôme",
        "Si vous travaillez en binôme, respectez l'affectation indiquée dans Personnel."
      ],
      [
        "Accès logement",
        "Consultez les informations d'accès au logement affichées dans l'application."
      ],
      [
        "Actualisation",
        "Si une modification faite par la Réception n'apparaît pas immédiatement, attendez la synchronisation puis actualisez votre liste."
      ],
      [
        "En cas de doute",
        "Si le numéro de logement, le statut ou l'affectation semble incorrect, contactez la Réception avant de valider."
      ]
    ]
  );

  creerLienRetourHautAide_(feuille, finFemme + 1);

  // ==========================================================
  // GOUVERNANTE
  // ==========================================================

  const finGouvernante = ecrireSectionAide_(
    feuille,
    lignes.gouvernante,
    "✅ GOUVERNANTE",
    "#eadcf8",
    [
      [
        "Usage conseillé",
        "Utilisez CampManager V4. Si l'application n'est pas disponible, la feuille Ménage peut servir de solution de secours."
      ],
      [
        "À vérifier",
        "La femme de chambre a terminé le ménage. Le logement doit maintenant être contrôlé."
      ],
      [
        "Check",
        "Sur la feuille Ménage de secours, votre prénom apparaît dans Check lorsque vous êtes affectée au contrôle."
      ],
      [
        "Contrôle conforme",
        "Après contrôle, si le logement est conforme, passez-le sur Prêt."
      ],
      [
        "À recontrôler",
        "Utilisez À recontrôler lorsqu'une correction est nécessaire avant de pouvoir déclarer le logement Prêt."
      ],
      [
        "Après correction",
        "Le logement revient dans le circuit afin d'être contrôlé de nouveau."
      ],
      [
        "Client en attente ⚠️",
        "Contrôlez en priorité un logement marqué ⚠️. Une fois validé Prêt, l'alerte disparaît mais le numéro du client reste visible à la Réception pour qu'elle puisse l'appeler."
      ],
      [
        "Double rôle",
        "Si vous êtes également femme de chambre et que vous réalisez vous-même le ménage, vos droits peuvent permettre une validation directe À faire → Prêt."
      ],
      [
        "Logement Prêt",
        "Un logement validé Prêt sort du circuit des travaux à effectuer."
      ],
      [
        "Ne pas modifier l'affectation",
        "Les affectations Personnel et Gouvernante se gèrent depuis Réception, pas depuis la feuille Ménage."
      ],
      [
        "Actualisation",
        "Si une nouvelle tâche ou une modification n'apparaît pas immédiatement, attendez la synchronisation puis actualisez la liste."
      ],
      [
        "En cas de problème",
        "Si le logement n'est pas conforme ou si l'information affichée semble incohérente, ne le passez pas Prêt et signalez le problème à la Réception / Direction."
      ]
    ]
  );

  creerLienRetourHautAide_(feuille, finGouvernante + 1);

  // ==========================================================
  // MISE EN FORME FINALE
  // ==========================================================

  try {
    const tableau = ss.getSheetByName("Tableau de bord");
    if (tableau) {
      ss.setActiveSheet(feuille);
      ss.moveActiveSheet(tableau.getIndex() + 1);
    }
  } catch (erreur) {
    console.log(
      "Positionnement de l'onglet Aide non effectué : " +
      erreur.message
    );
  }

  feuille.activate();
  feuille.getRange("B1").activate();

  ss.toast(
    "La page Aide CampManager V4 a été créée / mise à jour.",
    "📘 Aide",
    5
  );
}


/**
 * Crée un bouton cliquable vers une section.
 */
function creerBoutonAide_(
  feuille,
  celluleA1,
  texte,
  ligneDestination,
  couleur
) {
  const url =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getUrl() +
    "#gid=" +
    feuille.getSheetId() +
    "&range=B" +
    ligneDestination;

  const riche =
    SpreadsheetApp
      .newRichTextValue()
      .setText(texte)
      .setLinkUrl(url)
      .build();

  feuille
    .getRange(celluleA1)
    .setRichTextValue(riche)
    .setBackground(couleur)
    .setFontColor("#17365d")
    .setFontWeight("bold")
    .setFontSize(12)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  feuille.setRowHeight(
    feuille.getRange(celluleA1).getRow(),
    34
  );
}


/**
 * Écrit une section d'aide.
 * Retourne la dernière ligne utilisée par la section.
 */
function ecrireSectionAide_(
  feuille,
  ligneDepart,
  titre,
  couleur,
  elements
) {
  feuille
    .getRange(
      ligneDepart,
      2,
      1,
      4
    )
    .merge()
    .setValue(titre)
    .setBackground(couleur)
    .setFontColor("#17365d")
    .setFontWeight("bold")
    .setFontSize(17)
    .setHorizontalAlignment("left")
    .setVerticalAlignment("middle");

  feuille.setRowHeight(
    ligneDepart,
    34
  );

  let ligne = ligneDepart + 2;

  elements.forEach(function(element) {
    feuille
      .getRange(
        ligne,
        2
      )
      .setValue(element[0])
      .setFontWeight("bold")
      .setBackground("#f3f6f9")
      .setFontColor("#17365d")
      .setVerticalAlignment("top")
      .setWrap(true);

    feuille
      .getRange(
        ligne,
        3,
        1,
        3
      )
      .merge()
      .setValue(element[1])
      .setBackground("#ffffff")
      .setFontColor("#222222")
      .setVerticalAlignment("top")
      .setWrap(true);

    feuille.setRowHeight(
      ligne,
      56
    );

    ligne++;
  });

  feuille
    .getRange(
      ligneDepart + 1,
      2,
      elements.length + 1,
      4
    )
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      "#d9d9d9",
      SpreadsheetApp.BorderStyle.SOLID
    );

  return ligne - 1;
}


/**
 * Lien de retour vers les rôles.
 */
function creerLienRetourHautAide_(
  feuille,
  ligne
) {
  const url =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getUrl() +
    "#gid=" +
    feuille.getSheetId() +
    "&range=B1";

  const riche =
    SpreadsheetApp
      .newRichTextValue()
      .setText("⬆️ Retour aux rôles")
      .setLinkUrl(url)
      .build();

  feuille
    .getRange(
      ligne,
      2,
      1,
      4
    )
    .merge()
    .setRichTextValue(riche)
    .setHorizontalAlignment("center")
    .setFontWeight("bold")
    .setBackground("#eeeeee")
    .setFontColor("#17365d");
}


/**
 * Supprime les anciennes images transparentes de navigation
 * créées par les versions 2.2 / 2.3.
 *
 * Cette fonction est conservée uniquement pour nettoyer la feuille
 * lorsque creerPageAideCampManager() est exécutée.
 */
function supprimerBoutonsImagesAide_(feuille) {
  try {
    const images = feuille.getImages();

    images.forEach(function(image) {
      const titre = String(
        image.getAltTextTitle() || ""
      );

      if (titre.indexOf("CAMPMANAGER_AIDE_") === 0) {
        image.remove();
      }
    });
  } catch (erreur) {
    console.log(
      "Suppression anciens boutons Aide non effectuée : " +
      erreur.message
    );
  }
}


/**
 * Ouvre directement la feuille Aide.
 * Peut être appelée depuis le menu CampManager.
 */
function ouvrirAideCampManager() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = ss.getSheetByName("Aide");

  if (!feuille) {
    creerPageAideCampManager();
    return;
  }

  feuille.activate();
  feuille.getRange("B1").activate();
}