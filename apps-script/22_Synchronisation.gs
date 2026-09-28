/**
 * ============================================================
 * CAMPMANAGER
 * SYNCHRONISATION IMPORT → BASE
 * VERSION V3.1 — MULTI-HÉBERGEMENTS
 * ============================================================
 *
 * La source importée reste la référence officielle.
 *
 * IMPORTANT :
 * plusieurs lignes peuvent avoir :
 * - le même nom ;
 * - la même date d'arrivée ;
 * - la même date de départ.
 *
 * Elles correspondent alors à plusieurs hébergements du même client/groupe.
 *
 * Le rapprochement se fait par groupe :
 * Nom + Arrivée + Départ
 *
 * puis chaque hébergement est apparié individuellement :
 * 1. même logement si possible ;
 * 2. même catégorie si possible ;
 * 3. une ligne restante du même groupe ;
 * 4. sinon création d'un nouvel ID #N.
 *
 * Ainsi un switch de logement ne crée pas de doublon.
 */


function synchroniserImport(
  afficherMessage
) {
  if (
    afficherMessage ===
      undefined
  ) {
    afficherMessage =
      true;
  }

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleImport =
    classeur.getSheetByName(
      FEUILLES.IMPORT
    );

  const feuilleBase =
    classeur.getSheetByName(
      FEUILLES.BASE
    );

  if (
    !feuilleImport ||
    !feuilleBase
  ) {
    throw new Error(
      "La feuille Import ou Base est introuvable."
    );
  }

  const resultat =
    synchroniserBaseDepuisImport(
      feuilleImport,
      feuilleBase
    );

  if (
    afficherMessage
  ) {
    SpreadsheetApp
      .getUi()
      .alert(
        construireBilanSynchronisationESeason_(
          resultat
        )
      );
  }

  return resultat;
}


function synchroniserBaseDepuisImport(
  feuilleImport,
  feuilleBase
) {
  const maintenant =
    new Date();

  const resultat = {
    ajoutees: 0,
    modifiees: 0,
    inchangees: 0,
    reactivees: 0,
    annulees: 0,
    manuellesRapprochees: 0,
    groupesMultiHebergements: 0,
    dateMinImport: null,
    dateMaxImport: null
  };

  const donneesImport =
    lireDonneesSynchronisationESeason_(
      feuilleImport,
      COLONNES_IMPORT.NOMBRE_COLONNES,
      COLONNES_IMPORT.NOM_CLIENT
    );

  const donneesBase =
    lireDonneesSynchronisationESeason_(
      feuilleBase,
      COLONNES_BASE.NOMBRE_COLONNES,
      COLONNES_BASE.NOM_CLIENT
    );

  const groupesImport =
    grouperImportESeason_(
      donneesImport
    );

  const groupesBase =
    grouperBaseESeason_(
      donneesBase
    );

  Object.keys(
    groupesImport
  ).forEach(
    function(cle) {
      if (
        groupesImport[
          cle
        ].length >
          1
      ) {
        resultat.groupesMultiHebergements++;
      }

      groupesImport[
        cle
      ].forEach(
        function(item) {
          if (
            !resultat.dateMinImport ||
            item.arrivee.getTime() <
              resultat.dateMinImport.getTime()
          ) {
            resultat.dateMinImport =
              item.arrivee;
          }

          if (
            !resultat.dateMaxImport ||
            item.arrivee.getTime() >
              resultat.dateMaxImport.getTime()
          ) {
            resultat.dateMaxImport =
              item.arrivee;
          }
        }
      );
    }
  );

  /*
   * Ensemble global des IDs déjà utilisés.
   */
  const idsUtilises = {};

  donneesBase.forEach(
    function(ligne) {
      const id =
        String(
          ligne[
            COLONNES_BASE.ID_SEJOUR - 1
          ] || ""
        ).trim();

      if (
        id !== ""
      ) {
        idsUtilises[
          id
        ] =
          true;
      }
    }
  );

  /*
   * Rapprochement groupe par groupe.
   */
  Object.keys(
    groupesImport
  ).forEach(
    function(cle) {
      const importGroupe =
        groupesImport[
          cle
        ];

      const baseGroupe =
        (
          groupesBase[
            cle
          ] || []
        ).slice();

      const appariements =
        apparierGroupeESeason_(
          importGroupe,
          baseGroupe
        );

      appariements.forEach(
        function(pair) {
          const imp =
            pair.import;

          if (
            pair.base
          ) {
            const baseItem =
              pair.base;

            const indexBase =
              baseItem.index;

            const ancienneLigne =
              donneesBase[
                indexBase
              ];

            let id =
              String(
                ancienneLigne[
                  COLONNES_BASE.ID_SEJOUR - 1
                ] || ""
              ).trim();

            if (
              id === ""
            ) {
              id =
                creerNouvelIdSejourDansGroupe_(
                  cle,
                  idsUtilises
                );
            }

            const origineAvant =
              String(
                ancienneLigne[
                  COLONNES_BASE.ORIGINE - 1
                ] || ""
              ).trim();

            const etatAvant =
              String(
                ancienneLigne[
                  COLONNES_BASE.ETAT_RESERVATION - 1
                ] || ""
              ).trim();

            const nouvelleLigne = [
              id,
              imp.nom,
              imp.arrivee,
              imp.depart,
              imp.logement,
              imp.categorie,
              ETAT_RESERVATION.ACTIVE,
              maintenant,
              ORIGINE_RESERVATION.IMPORT
            ];

            if (
              origineAvant ===
                ORIGINE_RESERVATION.MANUELLE
            ) {
              resultat.manuellesRapprochees++;
            }

            if (
              reservationImportModifieeESeason_(
                ancienneLigne,
                nouvelleLigne
              )
            ) {
              donneesBase[
                indexBase
              ] =
                nouvelleLigne;

              if (
                etatAvant ===
                  ETAT_RESERVATION.ANNULEE ||
                etatAvant ===
                  ETAT_RESERVATION.ARCHIVEE
              ) {
                resultat.reactivees++;
              } else {
                resultat.modifiees++;
              }

            } else {
              ancienneLigne[
                COLONNES_BASE.DERNIERE_SYNCHRONISATION - 1
              ] =
                maintenant;

              ancienneLigne[
                COLONNES_BASE.ORIGINE - 1
              ] =
                ORIGINE_RESERVATION.IMPORT;

              resultat.inchangees++;
            }

          } else {
            const id =
              creerNouvelIdSejourDansGroupe_(
                cle,
                idsUtilises
              );

            donneesBase.push([
              id,
              imp.nom,
              imp.arrivee,
              imp.depart,
              imp.logement,
              imp.categorie,
              ETAT_RESERVATION.ACTIVE,
              maintenant,
              ORIGINE_RESERVATION.IMPORT
            ]);

            resultat.ajoutees++;
          }
        }
      );
    }
  );

  /*
   * Annulations :
   * uniquement dans la période couverte par l'export,
   * et uniquement pour des lignes d'origine Import.
   *
   * On calcule combien de lignes importées existent pour chaque groupe.
   * Si Base en contient davantage après appariement, les lignes importées
   * excédentaires sont annulées.
   */
  if (
    resultat.dateMinImport &&
    resultat.dateMaxImport
  ) {
    const min =
      resultat.dateMinImport.getTime();

    const max =
      resultat.dateMaxImport.getTime();

    const groupesActifsImport =
      grouperImportESeason_(
        donneesImport
      );

    const groupesBaseApres =
      grouperBaseESeason_(
        donneesBase
      );

    Object.keys(
      groupesBaseApres
    ).forEach(
      function(cle) {
        const baseGroupe =
          groupesBaseApres[
            cle
          ];

        if (
          baseGroupe.length ===
            0
        ) {
          return;
        }

        const arrivee =
          baseGroupe[0]
            .arrivee;

        if (
          arrivee.getTime() <
            min ||
          arrivee.getTime() >
            max
        ) {
          return;
        }

        const importGroupe =
          groupesActifsImport[
            cle
          ] || [];

        /*
         * On refait l'appariement pour savoir quelles lignes Base
         * correspondent réellement au fichier courant.
         */
        const pairs =
          apparierGroupeESeason_(
            importGroupe,
            baseGroupe
          );

        const indicesUtilises = {};

        pairs.forEach(
          function(pair) {
            if (
              pair.base
            ) {
              indicesUtilises[
                pair.base.index
              ] =
                true;
            }
          }
        );

        baseGroupe.forEach(
          function(baseItem) {
            if (
              indicesUtilises[
                baseItem.index
              ]
            ) {
              return;
            }

            const ligne =
              donneesBase[
                baseItem.index
              ];

            const origine =
              String(
                ligne[
                  COLONNES_BASE.ORIGINE - 1
                ] || ""
              ).trim();

            const etat =
              String(
                ligne[
                  COLONNES_BASE.ETAT_RESERVATION - 1
                ] || ""
              ).trim();

            if (
              origine !==
                ORIGINE_RESERVATION.IMPORT ||
              etat ===
                ETAT_RESERVATION.ARCHIVEE ||
              etat ===
                ETAT_RESERVATION.ANNULEE
            ) {
              return;
            }

            ligne[
              COLONNES_BASE.ETAT_RESERVATION - 1
            ] =
              ETAT_RESERVATION.ANNULEE;

            ligne[
              COLONNES_BASE.DERNIERE_SYNCHRONISATION - 1
            ] =
              maintenant;

            resultat.annulees++;
          }
        );
      }
    );
  }

  reecrireBaseSynchroniseeESeason_(
    feuilleBase,
    donneesBase
  );

  return resultat;
}


/**
 * Regroupe l'Import par Nom + Arrivée + Départ.
 */
function grouperImportESeason_(
  donnees
) {
  const groupes = {};

  donnees.forEach(
    function(ligne, index) {
      const nom =
        String(
          ligne[
            COLONNES_IMPORT.NOM_CLIENT - 1
          ] || ""
        ).trim();

      const arrivee =
        convertirDateSynchronisationESeason_(
          ligne[
            COLONNES_IMPORT.DATE_ARRIVEE - 1
          ]
        );

      const depart =
        convertirDateSynchronisationESeason_(
          ligne[
            COLONNES_IMPORT.DATE_DEPART - 1
          ]
        );

      const cle =
        creerCleGroupeSejour_(
          nom,
          arrivee,
          depart
        );

      if (
        cle === ""
      ) {
        return;
      }

      if (
        !groupes[
          cle
        ]
      ) {
        groupes[
          cle
        ] = [];
      }

      groupes[
        cle
      ].push({
        indexImport:
          index,
        cle:
          cle,
        nom:
          nom,
        arrivee:
          arrivee,
        depart:
          depart,
        logement:
          ligne[
            COLONNES_IMPORT.LOGEMENT - 1
          ],
        categorie:
          ligne[
            COLONNES_IMPORT.CATEGORIE - 1
          ]
      });
    }
  );

  return groupes;
}


/**
 * Regroupe Base par Nom + Arrivée + Départ.
 */
function grouperBaseESeason_(
  donnees
) {
  const groupes = {};

  donnees.forEach(
    function(ligne, index) {
      const nom =
        String(
          ligne[
            COLONNES_BASE.NOM_CLIENT - 1
          ] || ""
        ).trim();

      const arrivee =
        convertirDateSynchronisationESeason_(
          ligne[
            COLONNES_BASE.DATE_ARRIVEE - 1
          ]
        );

      const depart =
        convertirDateSynchronisationESeason_(
          ligne[
            COLONNES_BASE.DATE_DEPART - 1
          ]
        );

      const cle =
        creerCleGroupeSejour_(
          nom,
          arrivee,
          depart
        );

      if (
        cle === ""
      ) {
        return;
      }

      if (
        !groupes[
          cle
        ]
      ) {
        groupes[
          cle
        ] = [];
      }

      groupes[
        cle
      ].push({
        index:
          index,
        id:
          String(
            ligne[
              COLONNES_BASE.ID_SEJOUR - 1
            ] || ""
          ).trim(),
        cle:
          cle,
        nom:
          nom,
        arrivee:
          arrivee,
        depart:
          depart,
        logement:
          ligne[
            COLONNES_BASE.LOGEMENT - 1
          ],
        categorie:
          ligne[
            COLONNES_BASE.CATEGORIE - 1
          ],
        origine:
          String(
            ligne[
              COLONNES_BASE.ORIGINE - 1
            ] || ""
          ).trim(),
        etat:
          String(
            ligne[
              COLONNES_BASE.ETAT_RESERVATION - 1
            ] || ""
          ).trim()
      });
    }
  );

  return groupes;
}


/**
 * Appariment un-à-un d'un groupe importé avec Base.
 *
 * Priorités :
 * 1. logement identique ;
 * 2. catégorie identique ;
 * 3. une ligne restante.
 */
function apparierGroupeESeason_(
  importGroupe,
  baseGroupe
) {
  const disponibles =
    baseGroupe.slice();

  const resultat = [];

  function extraireIndex_(
    predicate
  ) {
    for (
      let i = 0;
      i <
      disponibles.length;
      i++
    ) {
      if (
        predicate(
          disponibles[
            i
          ]
        )
      ) {
        return i;
      }
    }

    return -1;
  }

  importGroupe.forEach(
    function(imp) {
      const logementImp =
        String(
          imp.logement || ""
        ).trim();

      const categorieImp =
        String(
          imp.categorie || ""
        ).trim();

      let index =
        extraireIndex_(
          function(baseItem) {
            return (
              logementImp !== "" &&
              String(
                baseItem.logement || ""
              ).trim() ===
                logementImp
            );
          }
        );

      if (
        index ===
          -1
      ) {
        index =
          extraireIndex_(
            function(baseItem) {
              return (
                categorieImp !== "" &&
                String(
                  baseItem.categorie || ""
                ).trim() ===
                  categorieImp
              );
            }
          );
      }

      if (
        index ===
          -1 &&
        disponibles.length >
          0
      ) {
        index =
          0;
      }

      if (
        index !==
          -1
      ) {
        const baseItem =
          disponibles.splice(
            index,
            1
          )[0];

        resultat.push({
          import:
            imp,
          base:
            baseItem
        });

      } else {
        resultat.push({
          import:
            imp,
          base:
            null
        });
      }
    }
  );

  return resultat;
}


/**
 * Clé de groupe, non unique lorsqu'un client a plusieurs hébergements.
 */
function creerCleGroupeSejour_(
  nom,
  dateArrivee,
  dateDepart
) {
  const arrivee =
    convertirDateSynchronisationESeason_(
      dateArrivee
    );

  const depart =
    convertirDateSynchronisationESeason_(
      dateDepart
    );

  if (
    !arrivee ||
    !depart ||
    String(
      nom || ""
    ).trim() === ""
  ) {
    return "";
  }

  const nomNormalise =
    String(
      nom
    )
      .trim()
      .toUpperCase()
      .normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /\s+/g,
        " "
      );

  const fuseau =
    Session.getScriptTimeZone();

  return (
    nomNormalise +
    "|" +
    Utilities.formatDate(
      arrivee,
      fuseau,
      "yyyyMMdd"
    ) +
    "|" +
    Utilities.formatDate(
      depart,
      fuseau,
      "yyyyMMdd"
    )
  );
}


/**
 * Compatibilité avec les scripts déjà créés.
 * Retourne la clé de groupe.
 */
function creerIdSejourTechnique_(
  nom,
  dateArrivee,
  dateDepart
) {
  return creerCleGroupeSejour_(
    nom,
    dateArrivee,
    dateDepart
  );
}


/**
 * Crée le prochain ID #N disponible du groupe.
 */
function creerNouvelIdSejourDansGroupe_(
  cle,
  idsUtilises
) {
  let numero =
    1;

  let id =
    cle +
    "#" +
    numero;

  while (
    idsUtilises[
      id
    ]
  ) {
    numero++;

    id =
      cle +
      "#" +
      numero;
  }

  idsUtilises[
    id
  ] =
    true;

  return id;
}


/**
 * Attribue un ID unique à une ligne manuelle de Base.
 */
function creerIdUniquePourLigneManuelleBase_(
  feuilleBase,
  ligneNumero,
  nom,
  arrivee,
  depart
) {
  const cle =
    creerCleGroupeSejour_(
      nom,
      arrivee,
      depart
    );

  if (
    cle === ""
  ) {
    return "";
  }

  const idsUtilises = {};

  const derniereLigne =
    feuilleBase.getLastRow();

  if (
    derniereLigne >=
      LIGNES.DEBUT
  ) {
    const valeurs =
      feuilleBase
        .getRange(
          LIGNES.DEBUT,
          COLONNES_BASE.ID_SEJOUR,
          derniereLigne -
            LIGNES.DEBUT +
            1,
          1
        )
        .getDisplayValues();

    valeurs.forEach(
      function(ligne, index) {
        const numeroFeuille =
          LIGNES.DEBUT +
          index;

        if (
          numeroFeuille ===
            ligneNumero
        ) {
          return;
        }

        const id =
          String(
            ligne[0] || ""
          ).trim();

        if (
          id !== ""
        ) {
          idsUtilises[
            id
          ] =            true;
        }
      }
    );
  }

  return creerNouvelIdSejourDansGroupe_(
    cle,
    idsUtilises
  );
}


function reservationImportModifieeESeason_(
  ancienneLigne,
  nouvelleLigne
) {
  const colonnes = [
    COLONNES_BASE.ID_SEJOUR,
    COLONNES_BASE.NOM_CLIENT,
    COLONNES_BASE.DATE_ARRIVEE,
    COLONNES_BASE.DATE_DEPART,
    COLONNES_BASE.LOGEMENT,
    COLONNES_BASE.CATEGORIE,
    COLONNES_BASE.ETAT_RESERVATION,
    COLONNES_BASE.ORIGINE
  ];

  return colonnes.some(
    function(colonne) {
      return !valeursSynchronisationIdentiquesESeason_(
        ancienneLigne[
          colonne - 1
        ],
        nouvelleLigne[
          colonne - 1
        ]
      );
    }
  );
}


function lireDonneesSynchronisationESeason_(
  feuille,
  nombreColonnes,
  colonneReference
) {
  const derniereLigne =
    feuille.getLastRow();

  if (
    derniereLigne <
      LIGNES.DEBUT
  ) {
    return [];
  }

  return feuille
    .getRange(
      LIGNES.DEBUT,
      1,
      derniereLigne -
        LIGNES.DEBUT +
        1,
      nombreColonnes
    )
    .getValues()
    .filter(
      function(ligne) {
        return String(
          ligne[
            colonneReference - 1
          ] || ""
        ).trim() !== "";
      }
    );
}


function reecrireBaseSynchroniseeESeason_(
  feuilleBase,
  donneesBase
) {
  const nombreLignesAEffacer =
    Math.max(
      feuilleBase.getLastRow() -
        LIGNES.DEBUT +
        1,
      donneesBase.length,
      0
    );

  if (
    nombreLignesAEffacer >
      0
  ) {
    feuilleBase
      .getRange(
        LIGNES.DEBUT,
        1,
        nombreLignesAEffacer,
        COLONNES_BASE.NOMBRE_COLONNES
      )
      .clearContent();
  }

  donneesBase.sort(
    function(a, b) {
      const dateA =
        convertirDateSynchronisationESeason_(
          a[
            COLONNES_BASE.DATE_ARRIVEE - 1
          ]
        );

      const dateB =
        convertirDateSynchronisationESeason_(
          b[
            COLONNES_BASE.DATE_ARRIVEE - 1
          ]
        );

      const tA =
        dateA
          ? dateA.getTime()
          : 0;

      const tB =
        dateB
          ? dateB.getTime()
          : 0;

      if (
        tA !==
          tB
      ) {
        return tA -
          tB;
      }

      return String(
        a[
          COLONNES_BASE.LOGEMENT - 1
        ] || ""
      ).localeCompare(
        String(
          b[
            COLONNES_BASE.LOGEMENT - 1
          ] || ""
        ),
        "fr",
        {
          numeric: true
        }
      );
    }
  );

  if (
    donneesBase.length ===
      0
  ) {
    return;
  }

  feuilleBase
    .getRange(
      LIGNES.DEBUT,
      1,
      donneesBase.length,
      COLONNES_BASE.NOMBRE_COLONNES
    )
    .setValues(
      donneesBase
    );

  feuilleBase
    .getRange(
      LIGNES.DEBUT,
      COLONNES_BASE.DATE_ARRIVEE,
      donneesBase.length,
      2
    )
    .setNumberFormat(
      "dd/MM/yyyy"
    );

  feuilleBase
    .getRange(
      LIGNES.DEBUT,
      COLONNES_BASE.DERNIERE_SYNCHRONISATION,
      donneesBase.length,
      1
    )
    .setNumberFormat(
      "dd/MM/yyyy HH:mm:ss"
    );
}


function valeursSynchronisationIdentiquesESeason_(
  valeurA,
  valeurB
) {
  const aDate =
    valeurA instanceof Date &&
    !isNaN(
      valeurA.getTime()
    );

  const bDate =
    valeurB instanceof Date &&
    !isNaN(
      valeurB.getTime()
    );

  if (
    aDate ||
    bDate
  ) {
    return (
      aDate &&
      bDate &&
      valeurA.getTime() ===
        valeurB.getTime()
    );
  }

  return (
    String(
      valeurA || ""
    ).trim() ===
    String(
      valeurB || ""
    ).trim()
  );
}


function convertirDateSynchronisationESeason_(
  valeur
) {
  if (
    valeur instanceof Date &&
    !isNaN(
      valeur.getTime()
    )
  ) {
    return new Date(
      valeur.getFullYear(),
      valeur.getMonth(),
      valeur.getDate()
    );
  }

  if (
    typeof valeur ===
      "number" &&
    isFinite(
      valeur
    )
  ) {
    const origine =
      new Date(
        Date.UTC(
          1899,
          11,
          30
        )
      );

    const date =
      new Date(
        origine.getTime() +
        valeur *
          86400000
      );

    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
  }

  const texte =
    String(
      valeur || ""
    ).trim();

  const fr =
    texte.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    );

  if (
    fr
  ) {
    return new Date(
      Number(
        fr[3]
      ),
      Number(
        fr[2]
      ) - 1,
      Number(
        fr[1]
      )
    );
  }

  return null;
}


function construireBilanSynchronisationESeason_(
  resultat
) {
  const fuseau =
    Session.getScriptTimeZone();

  const periode =
    resultat.dateMinImport &&
    resultat.dateMaxImport
      ? (
          "\nPériode d'arrivées couverte : " +
          Utilities.formatDate(
            resultat.dateMinImport,
            fuseau,
            "dd/MM/yyyy"
          ) +
          " → " +
          Utilities.formatDate(
            resultat.dateMaxImport,
            fuseau,
            "dd/MM/yyyy"
          )
        )
      : "";

  return (
    "Synchronisation des réservations terminée.\n\n" +
    "Nouveaux séjours : " +
    resultat.ajoutees +
    "\nSéjours mis à jour : " +
    resultat.modifiees +
    "\nSéjours inchangés : " +
    resultat.inchangees +
    "\nSéjours réactivés : " +
    resultat.reactivees +
    "\nAjouts manuels rapprochés avec l'import : " +
    resultat.manuellesRapprochees +
    "\nGroupes multi-hébergements : " +
    resultat.groupesMultiHebergements +
    "\nSéjours annulés dans la période importée : " +
    resultat.annulees +
    periode
  );
}



/**
 * ============================================================
 * ARCHIVAGE ANNUEL
 * ============================================================
 */


/**
 * Archive la saison précédente depuis le menu.
 *
 * Exemple :
 * en 2027, archive les réservations dont
 * la date de départ appartient à l'année 2026.
 *
 * Une sauvegarde complète est créée avant l'opération
 * si la fonction creerSauvegarde() existe dans le projet.
 *
 * @return {Object|undefined}
 */
function archiverSaisonPrecedente() {

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const ui =
    SpreadsheetApp.getUi();

  const anneeActuelle =
    new Date().getFullYear();

  const anneeAArchiver =
    anneeActuelle - 1;

  const confirmation =
    ui.alert(
      "🗄️ Archiver la saison " +
        anneeAArchiver,
      "Toutes les réservations dont la date de départ " +
        "est comprise entre le 1er janvier et le 31 décembre " +
        anneeAArchiver +
        " passeront à l’état « Archivée ».\n\n" +
        "Aucune ligne ne sera supprimée.\n\n" +
        "Continuer ?",
      ui.ButtonSet.YES_NO
    );

  if (
    confirmation !==
    ui.Button.YES
  ) {
    return;
  }

  const verrou =
    LockService.getDocumentLock();

  if (
    !verrou.tryLock(10000)
  ) {
    classeur.toast(
      "Une autre opération est en cours.",
      "⚠️ Archivage",
      6
    );

    return;
  }

  try {

    if (
      typeof creerSauvegarde ===
      "function"
    ) {
      classeur.toast(
        "Création de la sauvegarde de sécurité…",
        "🗄️ Archivage",
        4
      );

      creerSauvegarde();
    }

    const feuilleBase =
      classeur.getSheetByName(
        FEUILLES.BASE
      );

    if (!feuilleBase) {
      throw new Error(
        'La feuille "' +
          FEUILLES.BASE +
          '" est introuvable.'
      );
    }

    const resultat =
      archiverReservationsAnnee_(
        feuilleBase,
        anneeAArchiver
      );

    SpreadsheetApp.flush();

    ui.alert(
      "Archivage terminé",
      "Saison archivée : " +
        anneeAArchiver +
        "\n\n" +
        "Réservations archivées : " +
        resultat.archivees +
        "\n" +
        "Déjà archivées : " +
        resultat.dejaArchivees +
        "\n" +
        "Ignorées : " +
        resultat.ignorees,
      ui.ButtonSet.OK
    );

    return resultat;

  } catch (erreur) {

    classeur.toast(
      "Archivage interrompu : " +
        erreur.message,
      "❌ Archivage",
      8
    );

    throw erreur;

  } finally {

    verrou.releaseLock();
  }
}


/**
 * Archive les réservations dont la date de départ
 * appartient à l'année indiquée.
 *
 * Aucun enregistrement n'est supprimé.
 */
function archiverReservationsAnnee_(
  feuilleBase,
  annee
) {

  const donneesBase =
    lireDonneesSynchronisationESeason_(
      feuilleBase,
      COLONNES_BASE.NOMBRE_COLONNES,
      COLONNES_BASE.NOM_CLIENT
    );

  const resultat = {
    annee: annee,
    archivees: 0,
    dejaArchivees: 0,
    ignorees: 0
  };

  const maintenant =
    new Date();

  donneesBase.forEach(
    function(ligne) {

      const dateDepart =
        ligne[
          COLONNES_BASE.DATE_DEPART - 1
        ];

      if (
        !(dateDepart instanceof Date) ||
        isNaN(dateDepart.getTime()) ||
        dateDepart.getFullYear() !== annee
      ) {
        resultat.ignorees++;
        return;
      }

      const ancienEtat =
        String(
          ligne[
            COLONNES_BASE.ETAT_RESERVATION - 1
          ] || ""
        ).trim();

      if (
        ancienEtat ===
        ETAT_RESERVATION.ARCHIVEE
      ) {
        resultat.dejaArchivees++;
        return;
      }

      ligne[
        COLONNES_BASE.ETAT_RESERVATION - 1
      ] = ETAT_RESERVATION.ARCHIVEE;

      ligne[
        COLONNES_BASE.DERNIERE_SYNCHRONISATION - 1
      ] = maintenant;

      resultat.archivees++;
    }
  );

  reecrireBaseSynchroniseeESeason_(
    feuilleBase,
    donneesBase
  );

  return resultat;
}


/**
 * Affiche uniquement les réservations archivées
 * dans la feuille Base.
 */
function afficherReservationsArchivees() {

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleBase =
    classeur.getSheetByName(
      FEUILLES.BASE
    );

  if (!feuilleBase) {
    throw new Error(
      'La feuille "' +
        FEUILLES.BASE +
        '" est introuvable.'
    );
  }

  classeur.setActiveSheet(
    feuilleBase
  );

  const plage =
    feuilleBase.getDataRange();

  if (
    feuilleBase.getFilter()
  ) {
    feuilleBase
      .getFilter()
      .remove();
  }

  plage.createFilter();

  feuilleBase
    .getFilter()
    .setColumnFilterCriteria(
      COLONNES_BASE.ETAT_RESERVATION,
      SpreadsheetApp
        .newFilterCriteria()
        .whenTextEqualTo(
          ETAT_RESERVATION.ARCHIVEE
        )
        .build()
    );

  classeur.toast(
    "Affichage des réservations archivées.",
    "🗄️ Archives",
    4
  );
}


/**
 * Retire le filtre appliqué à la feuille Base.
 */
function afficherToutesLesReservationsBase() {

  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleBase =
    classeur.getSheetByName(
      FEUILLES.BASE
    );

  if (!feuilleBase) {
    return;
  }

  const filtre =
    feuilleBase.getFilter();

  if (filtre) {
    filtre.remove();
  }

  classeur.setActiveSheet(
    feuilleBase
  );

  classeur.toast(
    "Toutes les réservations sont affichées.",
    "Base",
    3
  );
}

