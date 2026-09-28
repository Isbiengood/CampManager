/* CampManager V4 — configuration navigateur MULTI-ÉTABLISSEMENT
 * Version Open Source — configuration exemple
 *
 * Principe :
 * - un seul site GitHub Pages pour tous les établissements ;
 * - l'établissement est choisi par l'URL :
 *     ?camping=etablissement-du-lac
 * - aucun établissement n'est codé en dur ;
 * - sans paramètre, le dernier établissement mémorisé est utilisé ;
 * - les sessions/prénoms/thèmes sont séparés par établissement ;
 * - l'application appelle directement les RPC multi-établissement.
 *
 * SÉCURITÉ :
 * La clé ci-dessous est une clé PUBLISHABLE prévue pour le navigateur.
 * Ne jamais mettre service_role / sb_secret_ dans GitHub.
 */

(() => {
  "use strict";


  const CLE_CAMPING_MEMORISE =
    "campmanager_v4_camping";

  function normaliserCodeCamping_(
    valeur
  ) {
    const code =
      String(
        valeur || ""
      )
        .trim()
        .toLowerCase();

    if (
      /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(
        code
      )
    ) {
      return code;
    }

    return "";
  }


  function lireCampingDepuisUrl_() {
    try {
      const params =
        new URLSearchParams(
          window.location.search || ""
        );

      return normaliserCodeCamping_(
        params.get(
          "camping"
        )
      );
    } catch (
      erreur
    ) {
      return "";
    }
  }


  const campingUrl =
    lireCampingDepuisUrl_();

  const campingMemorise =
    normaliserCodeCamping_(
      localStorage.getItem(
        CLE_CAMPING_MEMORISE
      )
    );

  const CAMPING_CODE =
    campingUrl ||
    campingMemorise ||
    "";

  /*
   * L'URL fournie par le Google Sheet est prioritaire.
   * Elle devient alors le dernier établissement mémorisé.
   */
  if (CAMPING_CODE) {
    localStorage.setItem(
      CLE_CAMPING_MEMORISE,
      CAMPING_CODE
    );
  }


  /*
   * Chaque établissement possède maintenant ses propres clés locales.
   * Ainsi un téléphone utilisé dans deux établissements ne mélange
   * jamais les sessions ou le prénom mémorisé.
   */
  const suffixe =
    "_" +
    (
      CAMPING_CODE ||
      "sans_etablissement"
    ).replace(
      /[^a-z0-9]+/g,
      "_"
    );


  window.CAMPMANAGER_V4 =
    Object.freeze({
      VERSION:
        "4.2.0-opensource",

      CAMPING_CODE:
        CAMPING_CODE,

      CONFIGURATION_VALIDE:
        CAMPING_CODE !== "",

      SUPABASE_URL:
        "https://YOUR_PROJECT_REF.supabase.co",

      SUPABASE_PUBLISHABLE_KEY:
        "YOUR_SUPABASE_PUBLISHABLE_KEY",

      REFRESH_MS:
        3000,

      STORAGE_TOKEN:
        "campmanager_v4_session" +
        suffixe,

      STORAGE_PRENOM:
        "campmanager_v4_prenom" +
        suffixe,

      STORAGE_THEME:
        "campmanager_v4_theme" +
        suffixe
    });



  /*
   * Affichage discret de l'établissement actif dans le bandeau.
   * On attend que le DOM soit disponible.
   */
  function afficherCampingActif_() {
    const sousTitre =
      document.querySelector(
        ".sous-titre"
      );

    if (
      sousTitre
    ) {
      sousTitre.textContent =
        CAMPING_CODE
          ? "V4 · " +
            CAMPING_CODE +
            " · accès sécurisé"
          : "V4 · établissement non configuré";
    }

    if (!CAMPING_CODE) {
      const erreur =
        document.getElementById(
          "erreurPrincipale"
        );

      if (erreur) {
        erreur.textContent =
          "Lien CampManager incomplet. Ouvrez l’application avec le lien ou le QR code fourni par votre établissement.";
        erreur.classList.remove(
          "cache"
        );
      }
    }
  }


  if (
    document.readyState ===
      "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      afficherCampingActif_,
      {
        once:
          true
      }
    );
  } else {
    afficherCampingActif_();
  }

})();
