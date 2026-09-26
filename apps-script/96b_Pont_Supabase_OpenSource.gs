/**
 * ============================================================
 * CAMPMANAGER — CLIENT DU PONT SUPABASE
 * VERSION OPEN SOURCE 0.1 — 14/09/2026
 * ============================================================
 *
 * SÉCURITÉ
 * --------
 * - aucun service_role dans Google Sheets ;
 * - aucun sb_secret_ dans Google Sheets ;
 * - chaque établissement possède son propre jeton privé ;
 * - ce jeton est stocké uniquement dans les Propriétés du script ;
 * - l'installation initiale utilise un code à usage unique.
 */


function appelerRpcCampManagerOpenSource_(
  nomRpc,
  parametres
) {
  const proprietes =
    PropertiesService.getScriptProperties();

  const jeton =
    String(
      proprietes.getProperty(
        CAMPMANAGER_BACKEND.PROP_BRIDGE_TOKEN
      ) || ""
    ).trim();

  if (!jeton) {
    throw new Error(
      "Le jeton privé CampManager est absent. " +
      "Utilisez « Installer un nouvel établissement »."
    );
  }

  return appelerPontCampManagerHttp_(
    {
      rpc:
        String(
          nomRpc || ""
        ).trim(),
      params:
        parametres || {}
    },
    jeton
  );
}


function bootstrapCampManagerV4_(
  codeInstallation,
  codeEtablissement,
  nomEtablissement,
  timezone
) {
  const resultat =
    appelerPontCampManagerHttp_(
      {
        action:
          "bootstrap",
        installationCode:
          String(
            codeInstallation || ""
          ).trim(),
        establishment: {
          code:
            String(
              codeEtablissement || ""
            )
              .trim()
              .toLowerCase(),
          name:
            String(
              nomEtablissement || ""
            ).trim(),
          timezone:
            String(
              timezone || "Europe/Paris"
            ).trim()
        }
      },
      ""
    );

  const jeton =
    String(
      resultat &&
      resultat.bridgeToken
        ? resultat.bridgeToken
        : ""
    ).trim();

  if (
    !resultat ||
    resultat.ok !== true ||
    !jeton
  ) {
    throw new Error(
      "Le serveur n’a pas fourni le jeton privé de l’établissement."
    );
  }

  return resultat;
}


function appelerPontCampManagerHttp_(
  corps,
  jeton
) {
  const url =
    obtenirUrlPontCampManager_();

  const options = {
    method:
      "post",
    contentType:
      "application/json",
    payload:
      JSON.stringify(
        corps || {}
      ),
    muteHttpExceptions:
      true,
    headers:
      {}
  };

  if (
    String(
      jeton || ""
    ).trim()
  ) {
    options.headers[
      "x-campmanager-token"
    ] =
      String(
        jeton
      ).trim();
  }

  let reponse;

  try {
    reponse =
      UrlFetchApp.fetch(
        url,
        options
      );

  } catch (erreur) {
    throw new Error(
      "Impossible de joindre le pont Supabase : " +
      messageErreurPontCampManager_(
        erreur
      )
    );
  }

  const codeHttp =
    reponse.getResponseCode();

  const texte =
    reponse.getContentText();

  let resultat;

  try {
    resultat =
      texte
        ? JSON.parse(
            texte
          )
        : {};

  } catch (erreur) {
    resultat = {
      brut:
        texte
    };
  }

  if (
    codeHttp < 200 ||
    codeHttp >= 300
  ) {
    const messageServeur =
      resultat &&
      typeof resultat ===
        "object" &&
      resultat.message
        ? String(
            resultat.message
          )
        : texte;

    throw new Error(
      "Le pont Supabase a refusé l'opération (HTTP " +
      codeHttp +
      "). " +
      (
        messageServeur ||
        "Réponse serveur vide."
      )
    );
  }

  return resultat;
}


function messageErreurPontCampManager_(
  erreur
) {
  return String(
    erreur &&
    erreur.message
      ? erreur.message
      : erreur
  );
}


function testerPontCampManagerV4() {
  const resultat =
    appelerRpcCampManagerOpenSource_(
      "ping_campmanager_bridge_v4",
      {}
    );

  SpreadsheetApp
    .getUi()
    .alert(
      "✅ Pont CampManager",
      "Connexion sécurisée validée.\n\n" +
      "Établissement : " +
      String(
        resultat.campingNom ||
        resultat.campingCode ||
        "—"
      ) +
      "\nVersion du pont : " +
      String(
        resultat.version ||
        "—"
      ),
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return resultat;
}