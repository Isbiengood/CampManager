/**
 * ============================================================
 * CAMPMANAGER — CONFIGURATION BACKEND
 * VERSION OPEN SOURCE 0.1 — 14/09/2026
 * ============================================================
 *
 * Ce fichier ne contient AUCUN secret.
 *
 * Renseignez ici le projet Supabase et l’URL web appartenant à votre instance.
 *
 * Pour une installation totalement indépendante :
 * - déployer son propre projet Supabase ;
 * - remplacer SUPABASE_URL par l'URL de ce projet ;
 * - conserver le même nom de fonction Edge ou adapter BRIDGE_FUNCTION_SLUG ;
 * - remplacer PUBLIC_APP_URL par l'URL GitHub Pages / hébergement choisi.
 *
 * NE JAMAIS mettre ici :
 * - service_role ;
 * - sb_secret_... ;
 * - un jeton privé CampManager.
 */
const CAMPMANAGER_BACKEND = Object.freeze({
  VERSION: "0.1",
  SUPABASE_URL:
    "https://YOUR-PROJECT.supabase.co",
  BRIDGE_FUNCTION_SLUG:
    "campmanager-v4-bridge",
  PUBLIC_APP_URL:
    "https://YOUR-GITHUB-USER.github.io/YOUR-REPO/v4.html",

  PROP_BRIDGE_TOKEN:
    "CAMPMANAGER_V4_BRIDGE_TOKEN",

  PROP_PENDING_CODE:
    "CAMPMANAGER_INSTALL_PENDING_CODE",
  PROP_PENDING_NAME:
    "CAMPMANAGER_INSTALL_PENDING_NAME",
  PROP_PENDING_TIMEZONE:
    "CAMPMANAGER_INSTALL_PENDING_TIMEZONE"
});


function obtenirUrlPontCampManager_() {
  const base =
    String(
      CAMPMANAGER_BACKEND.SUPABASE_URL || ""
    )
      .trim()
      .replace(
        /\/+$/g,
        ""
      );

  const slug =
    String(
      CAMPMANAGER_BACKEND.BRIDGE_FUNCTION_SLUG || ""
    ).trim();

  if (
    !/^https:\/\/[a-z0-9.-]+$/i.test(
      base
    ) ||
    !/^[a-z0-9][a-z0-9-]{1,62}$/i.test(
      slug
    )
  ) {
    throw new Error(
      "La configuration backend CampManager est incomplète."
    );
  }

  return (
    base +
    "/functions/v1/" +
    encodeURIComponent(
      slug
    )
  );
}


function obtenirUrlApplicationPubliqueCampManager_() {
  const url =
    String(
      CAMPMANAGER_BACKEND.PUBLIC_APP_URL || ""
    ).trim();

  if (
    !/^https:\/\//i.test(
      url
    )
  ) {
    throw new Error(
      "L’URL publique CampManager n’est pas configurée."
    );
  }

  return url;
}
