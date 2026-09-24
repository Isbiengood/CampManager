/**
 * ============================================================
 * CAMPMANAGER — LEGACY
 * ANCIEN JOURNAL DE VERSION — NE PAS INSTALLER
 * ============================================================
 *
 * Ancien journal CampManager V3.2.7 — Double rôle.
 * Date : 13/08/2026.
 *
 * Conservé uniquement comme référence historique.
 * Ne pas ajouter au projet Apps Script MASTER Open Source.
 *
 * La version active multi-établissement utilise désormais :
 * 98_Multi_Camping_OpenSource.gs
 *
 * ============================================================
 */
/**
 * ============================================================
 * CAMPMANAGER — JOURNAL DE VERSION V3.2.7 DOUBLE RÔLE
 * ============================================================
 *
 * CM-006 — DOUBLE RÔLE FEMME DE CHAMBRE + GOUVERNANTE
 *
 * Règle :
 * - si une personne est à la fois femme de chambre et gouvernante ;
 * - et qu'elle est affectée au ménage d'un logement « À faire » ;
 * - elle peut valider directement le logement sur « Prêt ».
 *
 * Le téléphone affiche alors une seule demande :
 *
 * À faire
 *   ↓
 * VALIDER : PRÊT
 *   ↓
 * Prêt
 *
 * La personne ne reçoit pas ensuite une deuxième demande de contrôle
 * pour le même logement.
 *
 * Pour les autres profils :
 * - femme de chambre seule : À faire -> À vérifier ;
 * - gouvernante seule : À vérifier / À recontrôler -> Prêt.
 *
 * Historique :
 * le passage direct À faire -> Prêt est enregistré comme
 * « Ménage + Contrôle » avec la personne double rôle comme gouvernante.
 *
 * DATE : 13/08/2026
 */

function afficherVersionCampManagerV327() {
  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      "CampManager V3.2.7 — Double rôle",
      "✅ Version",
      5
    );
}
