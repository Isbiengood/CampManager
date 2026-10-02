/* CampManager V4 — configuration navigateur publique
 * La clé Supabase ci-dessous est une clé PUBLISHABLE destinée au navigateur.
 * Ne jamais placer de service_role / sb_secret_ dans ce fichier.
 */
(() => {
  "use strict";

  const CLE_ETABLISSEMENT_MEMORISE =
    "campmanager_v4_camping";

  function normaliserCodeEtablissement_(valeur) {
    const code =
      String(valeur || "")
        .trim()
        .toLowerCase();

    return /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(code)
      ? code
      : "";
  }

  function lireEtablissementDepuisUrl_() {
    try {
      const params =
        new URLSearchParams(
          window.location.search || ""
        );

      return normaliserCodeEtablissement_(
        params.get("camping")
      );
    } catch (erreur) {
      return "";
    }
  }

  const codeUrl =
    lireEtablissementDepuisUrl_();

  const codeMemorise =
    normaliserCodeEtablissement_(
      localStorage.getItem(
        CLE_ETABLISSEMENT_MEMORISE
      )
    );

  const CAMPING_CODE =
    codeUrl ||
    codeMemorise ||
    "";

  if (CAMPING_CODE) {
    localStorage.setItem(
      CLE_ETABLISSEMENT_MEMORISE,
      CAMPING_CODE
    );
  }

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
        "https://yjclaskssxtoqzpvtrnz.supabase.co",

      SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_7hYIwgh8eYim9XhWJFlvcw_MN9rDFaw",

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

  function afficherEtablissementActif_() {
    const sousTitre =
      document.querySelector(
        ".sous-titre"
      );

    if (sousTitre) {
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
      afficherEtablissementActif_,
      { once: true }
    );
  } else {
    afficherEtablissementActif_();
  }
})();
