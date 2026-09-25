/**
 * =========================================================
 * CAPFUN GRAND CERF
 * ACTUALISATION GÉNÉRALE — VERSION V2
 * =========================================================
 *
 * Actualise successivement :
 *
 * 1. les données importées ;
 * 2. la feuille Réception ;
 * 3. la feuille Ménage ;
 * 4. les statistiques ;
 * 5. le tableau de bord.
 */


/**
 * Actualise l’ensemble du logiciel.
 */
function actualiserLogiciel() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const etapes = [
    {
      message: "Synchronisation des imports…",
      action: function() {
        synchroniserImport(false);
      }
    },
    {
      message: "Mise à jour de la réception…",
      action: function() {
        mettreAJourReception(false);
      }
    },
    {
      message: "Mise à jour du ménage…",
      action: function() {
        mettreAJourMenage(false);
      }
    },
    {
      message: "Mise à jour des statistiques…",
      action: function() {
        mettreAJourStatistiques(false);
      }
    },
    {
      message: "Mise à jour du tableau de bord…",
      action: function() {
        mettreAJourTableauDeBord(false);
      }
    }
  ];

  try {
    etapes.forEach(function(etape) {
      classeur.toast(
        etape.message,
        "🔄 Actualisation",
        3
      );

      etape.action();
    });

    SpreadsheetApp.flush();

    classeur.toast(
      "Le logiciel est entièrement à jour.",
      "✅ Actualisation terminée",
      6
    );

  } catch (erreur) {
    const messageErreur =
      erreur && erreur.message
        ? erreur.message
        : String(erreur);

    console.error(
      "Erreur pendant l’actualisation générale :",
      erreur
    );

    classeur.toast(
      "Actualisation interrompue : " +
      messageErreur,
      "❌ Erreur",
      8
    );

    throw erreur;
  }
}
