/**
 * ============================================================
 * CAPFUN GRAND CERF
 * CAMPMANAGER MOBILE — API WEB V3.2.7 DOUBLE RÔLE
 * FEMMES DE CHAMBRE + GOUVERNANTES
 * ============================================================
 *
 * Le téléphone mémorise uniquement le prénom de l'utilisateur.
 * L'application retrouve ensuite tous les logements où ce prénom
 * apparaît seul ou dans un binôme.
 */


/**
 * Affiche l'application web.
 */
function doGet(e) {
  const page =
    e &&
    e.parameter &&
    e.parameter.page
      ? String(
          e.parameter.page
        ).trim()
      : "";

  if (
    page ===
    "rapport-email"
  ) {
    return creerPageConfigurationEmailRapport_();
  }

  const modele =
    HtmlService.createTemplateFromFile(
      "61_Web_Index"
    );

  const prenomInitial =
    e &&
    e.parameter &&
    e.parameter.prenom
      ? String(
          e.parameter.prenom
        ).trim()
      : "";

  /*
   * V3.2.10 — principe repris de la V2.1.2 prénom persistant.
   *
   * GitHub transmet son URL au Web App.
   * Après sélection du prénom, Apps Script peut ainsi faire une
   * navigation volontaire vers :
   *
   * https://...github.io/capfun-menage-mobile/?prenom=Marine
   *
   * Le prénom est alors enregistré par la page GitHub elle-même,
   * sans dépendre uniquement de postMessage.
   */
  const urlConteneur =
    e &&
    e.parameter &&
    e.parameter.conteneur
      ? String(
          e.parameter.conteneur
        ).trim()
      : "";

  modele.prenomInitialJson =
    JSON.stringify(
      prenomInitial
    );

  modele.urlApplicationJson =
    JSON.stringify(
      ScriptApp
        .getService()
        .getUrl()
    );

  modele.urlConteneurJson =
    JSON.stringify(
      urlConteneur
    );

  return modele
    .evaluate()
    .setTitle("CampManager Mobile")
    .addMetaTag(
      "viewport",
      "width=device-width, initial-scale=1, viewport-fit=cover"
    )
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}


/**
 * Inclut un fichier HTML secondaire.
 *
 * @param {string} nomFichier
 *
 * @return {string}
 */
function inclureWeb_(nomFichier) {
  return HtmlService
    .createHtmlOutputFromFile(
      nomFichier
    )
    .getContent();
}


/**
 * Retourne les données nécessaires au premier lancement.
 *
 * @return {Object}
 */
function chargerApplicationMenageMobile() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleMenage =
    classeur.getSheetByName(
      FEUILLES.MENAGE
    );

  if (!feuilleMenage) {
    throw new Error(
      "La feuille Ménage est introuvable."
    );
  }

  /*
   * V3.2.6 — démarrage rapide :
   * le premier écran n'a besoin que de la liste des personnes/roles.
   * Il ne reconstruit donc plus toute la feuille Ménage.
   */
  return {
    nomApplication:
      "CampManager Mobile",

    personnes:
      lirePersonnesEtRolesMenageMobile_(),

    synchroniseLe:
      new Date().toISOString()
  };
}


/**
 * Retourne le rôle d'une personne.
 *
 * @param {string} prenom
 *
 * @return {Object}
 */
function lireRolePersonneMenageMobile_(
  prenom
) {
  const cleRecherche =
    creerClePrenomMenageMobile_(
      prenom
    );

  const personnes =
    lirePersonnesEtRolesMenageMobile_();

  const personne =
    personnes.find(
      function(element) {
        return (
          creerClePrenomMenageMobile_(
            element.prenom
          ) ===
          cleRecherche
        );
      }
    );

  return personne || {
    prenom:
      normaliserPrenomMenageMobile_(
        prenom
      ),
    femmeDeChambre:
      false,
    gouvernante:
      false,
    role:
      "inconnu"
  };
}


/**
 * Retourne les logements concernant une personne.
 *
 * Le prénom peut apparaître :
 * - seul : Alicia ;
 * - dans un binôme : Alicia/Sam.
 *
 * @param {string} prenom
 *
 * @return {Object}
 */
function chargerLogementsPersonneMenageMobile(
  prenom
) {
  const prenomNormalise =
    normaliserPrenomMenageMobile_(
      prenom
    );

  if (
    prenomNormalise === ""
  ) {
    return {
      prenom: "",
      role: "inconnu",
      logements: [],
      synchroniseLe:
        new Date().toISOString()
    };
  }

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleMenage =
    classeur.getSheetByName(
      FEUILLES.MENAGE
    );

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  if (
    !feuilleMenage ||
    !feuilleReception
  ) {
    throw new Error(
      "Les feuilles Ménage ou Réception sont introuvables."
    );
  }

  /*
   * V3.2.5 — PERFORMANCE
   *
   * Un simple rafraîchissement du téléphone ne reconstruit plus
   * toute la feuille Ménage. Cette reconstruction applique des
   * validations, formats et couleurs à de nombreuses cellules et
   * pouvait prendre plusieurs dizaines de secondes.
   *
   * Ménage est déjà tenu à jour lors des changements métier
   * (Réception, téléphone attente, validation ménage/gouvernante).
   * Ici on fait uniquement une LECTURE.
   */
  const role =
    lireRolePersonneMenageMobile_(
      prenomNormalise
    );

  const gouvernantesParLogement =
    lireGouvernantesParLogementMenageMobile_(
      feuilleReception
    );

  const lignesMenage =
    lireLignesMenageMobile_(
      feuilleMenage
    );

  const logements = [];
  const controlesAVenir = [];

  lignesMenage.forEach(
    function(ligne) {
      ligne.gouvernante =
        gouvernantesParLogement[
          ligne.logement
        ] || "";

      ligne.mode =
        "";

      /*
       * Femme de chambre :
       * uniquement ses logements À faire.
       *
       * V3.2.7 — DOUBLE RÔLE
       * Si la personne est à la fois femme de chambre ET gouvernante,
       * et qu'elle est affectée au ménage de ce logement,
       * elle peut valider directement « Prêt ».
       *
       * Elle n'a donc pas besoin de recevoir ensuite une deuxième
       * demande de contrôle pour le même logement.
       */
      const estPersonnelDuLogement =
        personnelContientPrenomMenageMobile_(
          ligne.personnel,
          prenomNormalise
        );

      const estGouvernanteDuLogement =
        personnelContientPrenomMenageMobile_(
          ligne.gouvernante,
          prenomNormalise
        );

      const doubleRole =
        role.femmeDeChambre &&
        role.gouvernante;

      if (
        role.femmeDeChambre &&
        ligne.etatMenage ===
          ETAT_MENAGE.A_FAIRE &&
        estPersonnelDuLogement
      ) {
        const copieMenage =
          Object.assign(
            {},
            ligne
          );

        copieMenage.mode =
          doubleRole
            ? "menage_controle"
            : "menage";

        copieMenage.actionSuivante =
          doubleRole
            ? ETAT_MENAGE.PRET
            : ETAT_MENAGE.A_VERIFIER;

        logements.push(
          copieMenage
        );
      }

      /*
       * Gouvernante :
       * contrôles disponibles maintenant.
       */
      if (
        role.gouvernante &&
        (
          ligne.etatMenage ===
            ETAT_MENAGE.A_VERIFIER ||
          ligne.etatMenage ===
            ETAT_MENAGE.A_RECONTROLER
        ) &&
        estGouvernanteDuLogement
      ) {
        const copieControle =
          Object.assign(
            {},
            ligne
          );

        copieControle.mode =
          "controle";

        copieControle.actionSuivante =
          ETAT_MENAGE.PRET;

        logements.push(
          copieControle
        );
      }

      /*
       * Gouvernante :
       * contrôles À VENIR.
       *
       * Le logement est déjà attribué à la gouvernante,
       * mais le ménage est encore « À faire ».
       *
       * Il est visible à titre prévisionnel uniquement :
       * aucun bouton de validation n'est disponible.
       */
      if (
        role.gouvernante &&
        ligne.etatMenage ===
          ETAT_MENAGE.A_FAIRE &&
        estGouvernanteDuLogement &&
        !(
          doubleRole &&
          estPersonnelDuLogement
        )
      ) {
        const copieAVenir =
          Object.assign(
            {},
            ligne
          );

        copieAVenir.mode =
          "a_venir";

        copieAVenir.actionSuivante =
          "";

        controlesAVenir.push(
          copieAVenir
        );
      }
    }
  );

  return {
    prenom:
      prenomNormalise,

    role:
      role.role,

    femmeDeChambre:
      role.femmeDeChambre,

    gouvernante:
      role.gouvernante,

    logements:
      logements,

    controlesAVenir:
      controlesAVenir,

    synchroniseLe:
      new Date().toISOString()
  };
}


/**
 * Lit la gouvernante affectée à chaque logement dans Réception.
 */
function lireGouvernantesParLogementMenageMobile_(
  feuilleReception
) {
  const resultat = {};

  if (
    feuilleReception.getLastRow() <
    LIGNES.DEBUT
  ) {
    return resultat;
  }

  const nombreLignes =
    feuilleReception.getLastRow() -
    LIGNES.DEBUT +
    1;

  const donnees =
    feuilleReception
      .getRange(
        LIGNES.DEBUT,
        COLONNES_RECEPTION.LOGEMENT,
        nombreLignes,
        COLONNES_RECEPTION.GOUVERNANTE -
          COLONNES_RECEPTION.LOGEMENT +
          1
      )
      .getDisplayValues();

  donnees.forEach(
    function(ligne) {
      const logement =
        normaliserValeurMenage(
          ligne[0]
        );

      const indexGouvernante =
        COLONNES_RECEPTION.GOUVERNANTE -
        COLONNES_RECEPTION.LOGEMENT;

      const gouvernante =
        String(
          ligne[
            indexGouvernante
          ] || ""
        ).trim();

      if (
        logement !== ""
      ) {
        resultat[
          logement
        ] =
          gouvernante;
      }
    }
  );

  return resultat;
}


/**
 * Fait avancer l'état d'un logement.
 *
 * Transitions autorisées :
 *
 * À faire       → À vérifier (ménage seul)
 * À faire       → Prêt (double rôle ménage + gouvernante)
 * À vérifier    → Prêt
 * À recontrôler → Prêt
 *
 * @param {Object} demande
 *
 * @return {Object}
 */
function avancerEtatMenageMobile(
  demande
) {
  const verrou =
    LockService.getDocumentLock();

  verrou.waitLock(
    10000
  );

  try {
    if (
      !demande ||
      !demande.logement ||
      !demande.prenom ||
      !demande.etatActuel
    ) {
      throw new Error(
        "La demande est incomplète."
      );
    }

    const logement =
      normaliserValeurMenage(
        demande.logement
      );

    const prenom =
      normaliserPrenomMenageMobile_(
        demande.prenom
      );

    const etatAttendu =
      normaliserValeurMenage(
        demande.etatActuel
      );

    const classeur =
      SpreadsheetApp.getActiveSpreadsheet();

    const feuilleMenage =
      classeur.getSheetByName(
        FEUILLES.MENAGE
      );

    const feuilleReception =
      classeur.getSheetByName(
        FEUILLES.RECEPTION
      );

    if (
      !feuilleMenage ||
      !feuilleReception
    ) {
      throw new Error(
        "Les feuilles Ménage ou Réception sont introuvables."
      );
    }

    mettreAJourMenage(
      false
    );

    const ligneMenage =
      trouverLigneMenageParLogement(
        feuilleMenage,
        logement
      );

    if (!ligneMenage) {
      return {
        succes: false,
        conflit: true,
        message:
          "Le logement " +
          logement +
          " n'est plus dans la liste Ménage."
      };
    }

    const ligneReception =
      trouverLigneReceptionParLogement(
        feuilleReception,
        logement
      );

    if (!ligneReception) {
      return {
        succes: false,
        conflit: true,
        message:
          "Le logement " +
          logement +
          " est introuvable dans Réception."
      };
    }

    const personnelActuel =
      normaliserPersonnelMenage_(
        feuilleMenage
          .getRange(
            ligneMenage,
            COLONNES_MENAGE.PERSONNEL
          )
          .getValue()
      );

    const gouvernanteActuelle =
      String(
        feuilleReception
          .getRange(
            ligneReception,
            COLONNES_RECEPTION.GOUVERNANTE
          )
          .getValue() || ""
      ).trim();

    const celluleEtat =
      feuilleMenage.getRange(
        ligneMenage,
        COLONNES_MENAGE.ETAT_MENAGE
      );

    const etatActuel =
      normaliserValeurMenage(
        celluleEtat.getValue()
      );

    if (
      etatActuel !==
      etatAttendu
    ) {
      return {
        succes: false,
        conflit: true,
        message:
          "L'état du logement " +
          logement +
          " a déjà changé. Actualisez la liste."
      };
    }

    let nouvelEtat =
      "";

    const roleUtilisateur =
      lireRolePersonneMenageMobile_(
        prenom
      );

    const doubleRoleUtilisateur =
      roleUtilisateur.femmeDeChambre &&
      roleUtilisateur.gouvernante;

    /*
     * Femme de chambre :
     *
     * - rôle ménage uniquement :
     *     À faire → À vérifier
     *
     * - double rôle femme de chambre + gouvernante :
     *     À faire → Prêt directement
     *
     * Le double rôle est autorisé dès lors que la personne
     * est bien affectée au ménage de ce logement.
     */
    if (
      etatActuel ===
        ETAT_MENAGE.A_FAIRE &&
      personnelContientPrenomMenageMobile_(
        personnelActuel,
        prenom
      )
    ) {
      nouvelEtat =
        doubleRoleUtilisateur
          ? ETAT_MENAGE.PRET
          : ETAT_MENAGE.A_VERIFIER;
    }

    /*
     * Gouvernante :
     * À vérifier / À recontrôler → Prêt uniquement.
     */
    if (
      (
        etatActuel ===
          ETAT_MENAGE.A_VERIFIER ||
        etatActuel ===
          ETAT_MENAGE.A_RECONTROLER
      ) &&
      personnelContientPrenomMenageMobile_(
        gouvernanteActuelle,
        prenom
      )
    ) {
      nouvelEtat =
        ETAT_MENAGE.PRET;
    }

    if (
      nouvelEtat === ""
    ) {
      return {
        succes: false,
        conflit: true,
        message:
          "Cette action ne vous est plus attribuée. Actualisez la liste."
      };
    }

    celluleEtat.setValue(
      nouvelEtat
    );

    /*
     * IMPORTANT :
     * on force immédiatement l'écriture dans Google Sheets
     * avant toute reconstruction de Ménage.
     *
     * Sans ce flush, une reconstruction lancée dans la même
     * exécution pouvait relire l'ancien état « À faire » et
     * écraser le passage vers « À vérifier ».
     */
    SpreadsheetApp.flush();

    const evenement = {
      range:
        celluleEtat,

      value:
        nouvelEtat,

      oldValue:
        etatActuel
    };

    const bloque =
      bloquerEtatMenageSiOccupe(
        evenement
      );

    if (
      bloque
    ) {
      return {
        succes: false,
        conflit: true,
        message:
          "Le client est encore présent. " +
          "La réception doit d'abord passer le logement sur Parti."
      };
    }

    synchroniserEtatMenageVersReception(
      evenement
    );

    /*
     * V3.2.4 — L'appel Apps Script ci-dessus ne déclenche pas
     * automatiquement le déclencheur onEdit installable.
     * On finalise donc explicitement l'alerte client côté serveur.
     *
     * Le numéro de téléphone est conservé ; seul ⚠️ / jaune disparaît.
     */
    if (
      nouvelEtat === ETAT_MENAGE.PRET &&
      typeof terminerAttenteClientPourLogementV323_ ===
        "function"
    ) {
      terminerAttenteClientPourLogementV323_(
        logement
      );
    }

    /*
     * Historique Ménage :
     * - À faire -> À vérifier : création du cycle
     * - À vérifier / À recontrôler -> Prêt : fermeture du cycle
     *
     * L'historique est volontairement séparé du moteur Ménage
     * afin qu'une erreur d'historique ne bloque jamais le travail.
     */
    try {
      enregistrerHistoriqueMenageDepuisApplication_({
        logement:
          logement,
        prenomCliqueur:
          prenom,
        etatAvant:
          etatActuel,
        etatApres:
          nouvelEtat,
        personnel:
          personnelActuel,
        gouvernante:
          gouvernanteActuelle,
        source:
          "Application"
      });
    } catch (erreurHistorique) {
      console.error(
        "Historique Ménage non enregistré : " +
        erreurHistorique.message
      );
    }

    /*
     * V3.2.4 — Stabilisation avant réponse au téléphone.
     *
     * Toutes les écritures précédentes ont déjà été flushées.
     * On reconstruit maintenant Ménage UNE FOIS avant de répondre.
     * La gouvernante reçoit ainsi immédiatement l'état définitif
     * au prochain chargement et un seul appui suffit.
     */
    SpreadsheetApp.flush();

    mettreAJourMenage(
      false
    );

    SpreadsheetApp.flush();

    return {
      succes: true,
      logement:
        logement,
      ancienEtat:
        etatActuel,
      nouvelEtat:
        nouvelEtat,
      message:
        nouvelEtat ===
          ETAT_MENAGE.PRET
          ? "Le logement " +
            logement +
            " est validé Prêt."
          : "Le logement " +
            logement +
            " est envoyé à la gouvernante pour contrôle."
    };

  } finally {
    verrou.releaseLock();
  }
}


/**
 * Détermine la prochaine étape autorisée.
 */
function determinerEtatSuivantMenageMobile_(
  etatActuel
) {
  if (
    etatActuel ===
    ETAT_MENAGE.A_FAIRE
  ) {
    return ETAT_MENAGE.A_VERIFIER;
  }

  if (
    etatActuel ===
      ETAT_MENAGE.A_VERIFIER ||
    etatActuel ===
      ETAT_MENAGE.A_RECONTROLER
  ) {
    return ETAT_MENAGE.PRET;
  }

  return "";
}


/**
 * Lit les prénoms disponibles dans Paramètres.
 *
 * La colonne I contient déjà uniquement les personnes
 * actives ou extras disponibles.
 *
 * @return {Array<string>}
 */
function lirePersonnesMenageMobile_() {
  return lirePersonnesEtRolesMenageMobile_()
    .map(
      function(personne) {
        return personne.prenom;
      }
    );
}


/**
 * Retourne les personnes disponibles et leurs rôles.
 *
 * Une même personne peut exceptionnellement être présente
 * dans les deux listes ; dans ce cas son rôle est « mixte ».
 */
function lirePersonnesEtRolesMenageMobile_() {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleParametres =
    classeur.getSheetByName(
      FEUILLES.PARAMETRES
    );

  const personnesParCle = {};

  function ajouterPersonne_(
    prenom,
    type
  ) {
    const nom =
      normaliserPrenomMenageMobile_(
        prenom
      );

    if (
      nom === "" ||
      nom === "🗑 Effacer"
    ) {
      return;
    }

    const cle =
      creerClePrenomMenageMobile_(
        nom
      );

    if (
      !personnesParCle[
        cle
      ]
    ) {
      personnesParCle[
        cle
      ] = {
        prenom:
          nom,
        femmeDeChambre:
          false,
        gouvernante:
          false
      };
    }

    personnesParCle[
      cle
    ][
      type
    ] = true;
  }

  if (
    feuilleParametres &&
    feuilleParametres.getLastRow() >=
      LIGNES.DEBUT
  ) {
    const nombreLignes =
      feuilleParametres.getLastRow() -
      LIGNES.DEBUT +
      1;

    const personnel =
      feuilleParametres
        .getRange(
          LIGNES.DEBUT,
          COLONNES_PARAMETRES.PERSONNEL_DISPONIBLE,
          nombreLignes,
          1
        )
        .getDisplayValues();

    personnel.forEach(
      function(ligne) {
        ajouterPersonne_(
          ligne[0],
          "femmeDeChambre"
        );
      }
    );

    const gouvernantes =
      feuilleParametres
        .getRange(
          LIGNES.DEBUT,
          COLONNES_PARAMETRES.GOUVERNANTES_DISPONIBLES,
          nombreLignes,
          1
        )
        .getDisplayValues();

    gouvernantes.forEach(
      function(ligne) {
        ajouterPersonne_(
          ligne[0],
          "gouvernante"
        );
      }
    );
  }

  /*
   * Sécurité : conserve aussi les personnes déjà affectées
   * dans les feuilles, même si leur statut vient d'être changé.
   */
  const feuilleMenage =
    classeur.getSheetByName(
      FEUILLES.MENAGE
    );

  if (
    feuilleMenage
  ) {
    lireLignesMenageMobile_(
      feuilleMenage
    ).forEach(
      function(ligne) {
        decomposerPersonnelMenageMobile_(
          ligne.personnel
        ).forEach(
          function(prenom) {
            ajouterPersonne_(
              prenom,
              "femmeDeChambre"
            );
          }
        );
      }
    );
  }

  const feuilleReception =
    classeur.getSheetByName(
      FEUILLES.RECEPTION
    );

  if (
    feuilleReception &&
    feuilleReception.getLastRow() >=
      LIGNES.DEBUT
  ) {
    const gouvernantes =
      feuilleReception
        .getRange(
          LIGNES.DEBUT,
          COLONNES_RECEPTION.GOUVERNANTE,
          feuilleReception.getLastRow() -
            LIGNES.DEBUT +
            1,
          1
        )
        .getDisplayValues();

    gouvernantes.forEach(
      function(ligne) {
        decomposerPersonnelMenageMobile_(
          ligne[0]
        ).forEach(
          function(prenom) {
            ajouterPersonne_(
              prenom,
              "gouvernante"
            );
          }
        );
      }
    );
  }

  return Object.keys(
    personnesParCle
  )
    .map(
      function(cle) {
        const personne =
          personnesParCle[
            cle
          ];

        personne.role =
          personne.femmeDeChambre &&
          personne.gouvernante
            ? "mixte"
            : personne.gouvernante
              ? "gouvernante"
              : "menage";

        return personne;
      }
    )
    .sort(
      function(a, b) {
        return a.prenom.localeCompare(
          b.prenom,
          "fr",
          {
            sensitivity:
              "base"
          }
        );
      }
    );
}


/**
 * Vérifie qu'un personnel contient exactement un prénom.
 *
 * Exemple :
 * Alicia est trouvé dans Alicia/Sam,
 * mais Ali n'est pas trouvé dans Alicia.
 */
function personnelContientPrenomMenageMobile_(
  personnel,
  prenom
) {
  const cleRecherche =
    creerClePrenomMenageMobile_(
      prenom
    );

  return decomposerPersonnelMenageMobile_(
    personnel
  ).some(
    function(prenomPersonnel) {
      return (
        creerClePrenomMenageMobile_(
          prenomPersonnel
        ) === cleRecherche
      );
    }
  );
}


/**
 * Découpe une affectation en prénoms.
 */
function decomposerPersonnelMenageMobile_(
  personnel
) {
  return String(
    personnel || ""
  )
    .split(
      /\s*(?:\/|,|&|\+|\bet\b)\s*/i
    )
    .map(
      function(prenom) {
        return normaliserPrenomMenageMobile_(
          prenom
        );
      }
    )
    .filter(
      function(prenom) {
        return prenom !== "";
      }
    );
}


/**
 * Normalise un prénom sans changer son affichage.
 */
function normaliserPrenomMenageMobile_(
  prenom
) {
  return String(
    prenom || ""
  ).trim();
}


/**
 * Crée une clé de comparaison sans accents ni majuscules.
 */
function creerClePrenomMenageMobile_(
  prenom
) {
  return normaliserPrenomMenageMobile_(
    prenom
  )
    .toLocaleLowerCase(
      "fr"
    )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}


/**
 * Lit les lignes actuellement visibles dans Ménage.
 */
function lireLignesMenageMobile_(
  feuilleMenage
) {
  const derniereLigne =
    feuilleMenage.getLastRow();

  if (
    derniereLigne <
    LIGNES.DEBUT
  ) {
    return [];
  }

  const nombreLignes =
    derniereLigne -
    LIGNES.DEBUT +
    1;

  const valeurs =
    feuilleMenage
      .getRange(
        LIGNES.DEBUT,
        1,
        nombreLignes,
        COLONNES_MENAGE.NOMBRE_COLONNES
      )
      .getDisplayValues();

  return valeurs
    .map(
      function(ligne) {
        const etatMenage =
          normaliserValeurMenage(
            ligne[
              COLONNES_MENAGE.ETAT_MENAGE - 1
            ]
          );

        return {
          logement:
            normaliserValeurMenage(
              ligne[
                COLONNES_MENAGE.LOGEMENT - 1
              ]
            ),

          personnel:
            normaliserPersonnelMenage_(
              ligne[
                COLONNES_MENAGE.PERSONNEL - 1
              ]
            ),

          priorite:
            normaliserValeurMenage(
              ligne[
                COLONNES_MENAGE.PRIORITE - 1
              ]
            ),

          acces:
            normaliserValeurMenage(
              ligne[
                COLONNES_MENAGE.ACCES - 1
              ]
            ),

          etatMenage:
            etatMenage,

          etatReception:
            normaliserValeurMenage(
              ligne[
                COLONNES_MENAGE.ETAT_RECEPTION - 1
              ]
            ),

          actionSuivante:
            determinerEtatSuivantMenageMobile_(
              etatMenage
            )
        };
      }
    )
    .filter(
      function(ligne) {
        return (
          ligne.logement !== "" &&
          ligne.personnel !== "" &&
          ligne.etatMenage !==
            ETAT_MENAGE.PRET
        );
      }
    );
}



/**
 * Petite page Web utilisée par le lien présent
 * dans le rapport quotidien.
 */
function creerPageConfigurationEmailRapport_() {
  const html =
    `<!doctype html>
<html lang="fr">
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport ménage</title>
<style>
body{
  margin:0;
  background:#f3f5f8;
  color:#17202a;
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
}
main{
  max-width:560px;
  margin:30px auto;
  padding:18px;
}
.carte{
  background:white;
  border-radius:20px;
  padding:26px 20px;
  box-shadow:0 10px 28px rgba(23,54,93,.14);
}
h1{font-size:28px;margin-top:0}
p{font-size:18px;line-height:1.45}
input{
  width:100%;
  box-sizing:border-box;
  min-height:58px;
  padding:12px 14px;
  border:2px solid #c9d2dc;
  border-radius:14px;
  font-size:19px;
}
button{
  width:100%;
  min-height:60px;
  margin-top:14px;
  border:0;
  border-radius:14px;
  font-size:18px;
  font-weight:800;
  cursor:pointer;
}
.enregistrer{background:#17365d;color:white}
.reset{background:#fde8e8;color:#8b1a1a}
#message{
  margin-top:16px;
  font-weight:800;
  font-size:17px;
}
</style>
</head>
<body>
<main>
  <div class="carte">
    <h1>📧 Rapport ménage</h1>
    <p>
      Modifiez l’adresse qui reçoit automatiquement
      le rapport quotidien vers 19 h.
    </p>
    <input
      id="email"
      type="email"
      placeholder="adresse@exemple.fr"
      autocomplete="email"
    >
    <button class="enregistrer" onclick="enregistrer()">
      Enregistrer l’adresse
    </button>
    <button class="reset" onclick="reinitialiser()">
      Réinitialiser l’adresse
    </button>
    <div id="message"></div>
  </div>
</main>
<script>
const email = document.getElementById("email");
const message = document.getElementById("message");

google.script.run
  .withSuccessHandler(function(reponse){
    email.value = reponse.email || "";
  })
  .lireConfigurationRapportMenageWeb();

function enregistrer(){
  message.textContent = "Enregistrement…";

  google.script.run
    .withSuccessHandler(function(reponse){
      message.textContent = reponse.message || "";
    })
    .enregistrerEmailRapportDepuisWeb(email.value);
}

function reinitialiser(){
  if(!confirm("Supprimer l’adresse e-mail du rapport ?")){
    return;
  }

  message.textContent = "Réinitialisation…";

  google.script.run
    .withSuccessHandler(function(reponse){
      email.value = "";
      message.textContent = reponse.message || "";
    })
    .enregistrerEmailRapportDepuisWeb("");
}
</script>
</body>
</html>`;

  return HtmlService
    .createHtmlOutput(
      html
    )
    .setTitle(
      "Configurer le rapport ménage"
    )
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}
