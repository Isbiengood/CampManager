/**
 * ============================================================
 * CAMPMANAGER — LEGACY
 * ANCIEN SYSTÈME — NE PAS INSTALLER
 * ============================================================
 *
 * Conservé uniquement comme référence historique.
 *
 * Ancienne initialisation administrateur CampManager V4.
 * Ne pas ajouter au projet Apps Script MASTER Open Source.
 *
 * Remplacé par l'architecture :
 * - 04_Configuration_CampManager.gs
 * - 05_Installation_CampManager.gs
 * - 96b_Pont_Supabase_OpenSource.gs
 * - 98_Multi_Camping_OpenSource.gs
 *
 * ============================================================
 */
/**
 * ============================================================
 * CAMPMANAGER V4 — JETON SÉCURISÉ DU PONT SUPABASE
 * VERSION 1.0
 * ============================================================
 *
 * BUT
 * ---
 * Génère un jeton privé utilisé uniquement entre :
 *   Google Apps Script -> Edge Function Supabase
 *
 * Le jeton complet :
 * - est généré dans Apps Script ;
 * - est enregistré dans les Propriétés du script ;
 * - n'est PAS affiché ;
 * - n'est PAS envoyé dans les logs ;
 * - ne doit PAS être communiqué.
 *
 * Seule son empreinte SHA-256 peut être communiquée.
 *
 * PROPRIÉTÉ CRÉÉE
 * ----------------
 * CAMPMANAGER_V4_BRIDGE_TOKEN
 *
 * FONCTION À EXÉCUTER
 * -------------------
 * genererJetonPontCampManagerV4
 * ============================================================
 */


function genererJetonPontCampManagerV4() {
  const ui =
    SpreadsheetApp.getUi();

  const proprietes =
    PropertiesService
      .getScriptProperties();

  const nomPropriete =
    "CAMPMANAGER_V4_BRIDGE_TOKEN";

  const dejaPresent =
    String(
      proprietes.getProperty(
        nomPropriete
      ) || ""
    ).trim();

  if (dejaPresent) {
    const confirmation =
      ui.alert(
        "CampManager V4 — Jeton déjà présent",
        "Un jeton sécurisé existe déjà.\n\n" +
        "Le régénérer invalidera l'ancien pont dès que Supabase sera mis à jour.\n\n" +
        "Voulez-vous vraiment générer un nouveau jeton ?",
        ui.ButtonSet.YES_NO
      );

    if (
      confirmation !==
        ui.Button.YES
    ) {
      const empreinteExistante =
        calculerEmpreinteSha256CampManagerV4_(
          dejaPresent
        );

      ui.alert(
        "CampManager V4 — Jeton conservé",
        "Le jeton existant n'a pas été modifié.\n\n" +
        "EMPREINTE SHA-256 À ME COMMUNIQUER :\n\n" +
        empreinteExistante +
        "\n\n" +
        "Vous pouvez copier cette empreinte : elle ne permet pas de retrouver le jeton privé.",
        ui.ButtonSet.OK
      );

      return {
        cree:
          false,

        empreinte_sha256:
          empreinteExistante
      };
    }
  }

  /*
   * Plusieurs UUID sont combinés avec de l'aléatoire et
   * un horodatage afin d'obtenir un jeton long et imprévisible.
   */
  const morceaux = [
    Utilities.getUuid(),
    Utilities.getUuid(),
    Utilities.getUuid(),
    Utilities.getUuid(),
    String(
      new Date().getTime()
    ),
    String(
      Math.random()
    )
  ];

  const source =
    morceaux.join(
      "|"
    );

  /*
   * Le jeton stocké n'est pas la source brute :
   * on la transforme en SHA-256 puis en hexadécimal,
   * ce qui produit un secret de 64 caractères.
   */
  const jeton =
    calculerEmpreinteSha256CampManagerV4_(
      source
    );

  proprietes.setProperty(
    nomPropriete,
    jeton
  );

  const verification =
    String(
      proprietes.getProperty(
        nomPropriete
      ) || ""
    ).trim();

  if (
    verification !==
      jeton
  ) {
    throw new Error(
      "Le jeton n'a pas pu être enregistré dans les Propriétés du script."
    );
  }

  /*
   * Seule l'empreinte DU JETON est affichée.
   * Le jeton lui-même reste secret.
   */
  const empreinte =
    calculerEmpreinteSha256CampManagerV4_(
      jeton
    );

  ui.alert(
    "✅ CampManager V4 — Jeton sécurisé créé",
    "Le jeton privé a été créé et enregistré dans :\n\n" +
    "Paramètres du projet > Propriétés du script\n" +
    nomPropriete +
    "\n\n" +
    "NE COPIEZ PAS LA VALEUR DE CETTE PROPRIÉTÉ.\n\n" +
    "Envoyez-moi uniquement cette EMPREINTE SHA-256 :\n\n" +
    empreinte +
    "\n\n" +
    "Cette empreinte peut être communiquée sans révéler le jeton privé.",
    ui.ButtonSet.OK
  );

  return {
    cree:
      true,

    empreinte_sha256:
      empreinte
  };
}


/**
 * Affiche uniquement l'empreinte du jeton déjà enregistré.
 * Utile si la fenêtre précédente a été fermée trop vite.
 */
function afficherEmpreinteJetonPontCampManagerV4() {
  const nomPropriete =
    "CAMPMANAGER_V4_BRIDGE_TOKEN";

  const jeton =
    String(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          nomPropriete
        ) || ""
    ).trim();

  if (!jeton) {
    throw new Error(
      "Aucun jeton n'est enregistré. Exécutez d'abord genererJetonPontCampManagerV4()."
    );
  }

  const empreinte =
    calculerEmpreinteSha256CampManagerV4_(
      jeton
    );

  SpreadsheetApp
    .getUi()
    .alert(
      "CampManager V4 — Empreinte du jeton",
      "EMPREINTE SHA-256 À ME COMMUNIQUER :\n\n" +
      empreinte +
      "\n\n" +
      "Ne communiquez jamais la valeur de CAMPMANAGER_V4_BRIDGE_TOKEN.",
      SpreadsheetApp
        .getUi()
        .ButtonSet.OK
    );

  return empreinte;
}


/**
 * SHA-256 -> hexadécimal minuscule.
 */
function calculerEmpreinteSha256CampManagerV4_(
  texte
) {
  const octets =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(
        texte || ""
      ),
      Utilities.Charset.UTF_8
    );

  return octets
    .map(
      function(octet) {
        const valeur =
          octet < 0
            ? octet + 256
            : octet;

        return (
          "0" +
          valeur.toString(16)
        ).slice(-2);
      }
    )
    .join("");
}

