/**
 * ============================================================
 * CAMPMANAGER
 * ACTUALISATION AUTOMATIQUE QUOTIDIENNE
 * ============================================================
 */


/**
 * Fonction exécutée automatiquement chaque nuit.
 */
function actualisationAutomatiqueMinuit() {
  try {
    actualiserLogiciel();

  } catch (erreur) {
    console.error(
      "Erreur pendant l’actualisation automatique :",
      erreur
    );

    throw erreur;
  }
}


/**
 * Installe le déclencheur quotidien.
 *
 * À exécuter manuellement une seule fois.
 */
function installerDeclencheurMinuit() {
  supprimerDeclencheursMinuit_();

  ScriptApp
    .newTrigger(
      "actualisationAutomatiqueMinuit"
    )
    .timeBased()
    .atHour(0)
    .nearMinute(5)
    .everyDays(1)
    .create();

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      "L’actualisation automatique quotidienne est installée.",
      "✅ Déclencheur",
      6
    );
}


/**
 * Supprime les anciens déclencheurs portant
 * sur la même fonction, afin d’éviter les doublons.
 */
function supprimerDeclencheursMinuit_() {
  const declencheurs =
    ScriptApp.getProjectTriggers();

  declencheurs.forEach(
    function(declencheur) {
      if (
        declencheur.getHandlerFunction() ===
        "actualisationAutomatiqueMinuit"
      ) {
        ScriptApp.deleteTrigger(
          declencheur
        );
      }
    }
  );
}


/**
 * Permet de supprimer volontairement
 * l’actualisation automatique.
 */
function desinstallerDeclencheurMinuit() {
  supprimerDeclencheursMinuit_();

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      "L’actualisation automatique a été supprimée.",
      "Déclencheur",
      5
    );
}
