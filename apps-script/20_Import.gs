/**
 * ============================================================
 * CAMPMANAGER
 * IMPORT DIRECT DE RÉSERVATIONS (.XLSX / .TXT / .CSV)
 * VERSION 1.4 OPEN SOURCE — 25/09/2026
 * ============================================================
 *
 * Formats acceptés :
 * - Excel .xlsx ;
 * - texte .txt ;
 * - CSV .csv.
 *
 * Pour les fichiers texte, CampManager détecte automatiquement :
 * - la ligne d'en-têtes dans les 30 premières lignes ;
 * - le séparateur : tabulation, point-virgule, | ou virgule ;
 * - UTF-8 avec repli Windows-1252.
 *
 * Sécurité :
 * - prévisualisation avant application ;
 * - verrou global CampManager pendant l'application de l'import ;
 * - reconstruction opérationnelle immédiate ;
 * - purge ciblée des anciennes tâches Ménage devenues non éligibles ;
 * - statistiques et tableau de bord recalculés après import.
 *
 * NÉCESSITE POUR .XLSX :
 * Apps Script > Services > + > Drive API > Ajouter.
 *
 * Les imports .TXT / .CSV n'utilisent pas la conversion Drive API.
 */


/**
 * Ouvre la fenêtre de sélection du fichier d'import.
 */
function ouvrirImportESeason() {
  const html =
    HtmlService
      .createHtmlOutput(
        construireHtmlImportESeason_()
      )
      .setWidth(
        560
      )
      .setHeight(
        610
      );

  SpreadsheetApp
    .getUi()
    .showModalDialog(
      html,
      "📥 Importer des réservations"
    );
}


/**
 * Reçoit le fichier Excel, le convertit temporairement,
 * puis retourne le bilan AVANT application.
 */
function preparerImportESeason(
  fichier
) {
  if (
    !fichier ||
    !fichier.base64 ||
    !fichier.nom
  ) {
    throw new Error(
      "Aucun fichier n'a été reçu."
    );
  }

  const nomFichier =
    String(
      fichier.nom || ""
    ).trim();

  const estXlsx =
    /\.xlsx$/i.test(
      nomFichier
    );

  const estTexte =
    /\.(txt|csv)$/i.test(
      nomFichier
    );

  if (
    !estXlsx &&
    !estTexte
  ) {
    throw new Error(
      "Sélectionnez un export de réservations au format .xlsx, .txt ou .csv."
    );
  }

  const octets =
    Utilities.base64Decode(
      fichier.base64
    );

  let fichierTemporaireId =
    "";

  try {
    let donnees = [];

    if (
      estXlsx
    ) {
      const blob =
        Utilities.newBlob(
          octets,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          nomFichier
        );

      /*
       * Conversion Excel → Google Sheets.
       * Service Drive avancé requis.
       */
      const temporaire =
        Drive.Files.create(
          {
            name:
              "TEMP_ESEASON_XLSX_" +
              new Date().getTime(),
            mimeType:
              "application/vnd.google-apps.spreadsheet"
          },
          blob,
          {
            fields:
              "id,name"
          }
        );

      fichierTemporaireId =
        temporaire.id;

      donnees =
        lireExportESeasonDepuisFichierTemporaire_(
          fichierTemporaireId
        );

    } else {
      /*
       * TXT / CSV :
       * lecture directe, sans conversion Excel.
       */
      const texte =
        decoderTexteImportReservations_(
          octets
        );

      donnees =
        lireExportESeasonDepuisTexte_(
          texte
        );

      /*
       * On conserve une copie temporaire normalisée dans un
       * Google Sheet afin que la phase "Confirmer l'import"
       * utilise exactement le même chemin que le .xlsx.
       */
      fichierTemporaireId =
        creerFichierTemporaireESeasonDepuisDonnees_(
          donnees
        );
    }

    const bilan =
      analyserImportESeason_(
        donnees
      );

    return {
      succes: true,
      fichierTemporaireId:
        fichierTemporaireId,
      nombreLignes:
        donnees.length,
      ajoutees:
        bilan.ajoutees,
      modifiees:
        bilan.modifiees,
      inchangees:
        bilan.inchangees,
      reactivees:
        bilan.reactivees,
      manuellesRapprochees:
        bilan.manuellesRapprochees,
      groupesMultiHebergements:
        bilan.groupesMultiHebergements,
      annulees:
        bilan.annulees,
      periode:
        bilan.periode,
      format:
        estXlsx
          ? "XLSX"
          : (
              /\.csv$/i.test(
                nomFichier
              )
                ? "CSV"
                : "TXT"
            )
    };

  } catch (erreur) {
    if (
      fichierTemporaireId
    ) {
      supprimerFichierTemporaireESeason_(
        fichierTemporaireId
      );
    }

    throw erreur;
  }
}

/**
 * Confirme et applique l'import.
 */
function appliquerImportESeason(
  fichierTemporaireId
) {
  if (
    !fichierTemporaireId
  ) {
    throw new Error(
      "Fichier temporaire introuvable."
    );
  }

  const verrou =
    LockService.getScriptLock();

  let verrouObtenu =
    false;

  try {
    /*
     * Évite qu'un déclencheur V4 ou une autre action CampManager
     * modifie Réception / Ménage pendant l'application de l'import.
     */
    verrou.waitLock(
      30000
    );

    verrouObtenu =
      true;

    const donnees =
      lireExportESeasonDepuisFichierTemporaire_(
        fichierTemporaireId
      );

    ecrireFeuilleImportDepuisESeason_(
      donnees
    );

    const resultat =
      synchroniserImport(
        false
      );

    /*
     * Mise à jour opérationnelle immédiate.
     *
     * L'import est une action volontaire de l'utilisateur :
     * on peut donc reconstruire Réception à partir de Base.
     * La version sécurisée de 30_Reception préserve désormais
     * les colonnes manuelles par numéro de logement.
     */
    if (
      typeof mettreAJourReception ===
        "function"
    ) {
      mettreAJourReception(
        false
      );
    }

    SpreadsheetApp.flush();

    if (
      typeof mettreAJourMenage ===
        "function"
    ) {
      mettreAJourMenage(
        false
      );
    }

    SpreadsheetApp.flush();

    /*
     * Retire les anciennes tâches Ménage devenues non éligibles
     * si un séjour a été déplacé ou repoussé dans le nouvel import.
     */
    if (
      typeof purgerMenageNonEligibleDepuisReceptionV4_ ===
        "function"
    ) {
      purgerMenageNonEligibleDepuisReceptionV4_();
    }

    SpreadsheetApp.flush();

    if (
      typeof mettreAJourStatistiques ===
        "function"
    ) {
      mettreAJourStatistiques(
        false
      );
    }

    SpreadsheetApp.flush();

    if (
      typeof mettreAJourTableauDeBord ===
        "function"
    ) {
      mettreAJourTableauDeBord(
        false
      );
    }

    SpreadsheetApp.flush();

    return {
      succes: true,
      message:
        construireBilanSynchronisationESeason_(
          resultat
        )
    };

  } finally {
    if (
      verrouObtenu
    ) {
      verrou.releaseLock();
    }

    supprimerFichierTemporaireESeason_(
      fichierTemporaireId
    );
  }
}


/**
 * Annule l'import et supprime le fichier temporaire.
 */
function annulerImportESeason(
  fichierTemporaireId
) {
  supprimerFichierTemporaireESeason_(
    fichierTemporaireId
  );

  return true;
}


/**
 * Lit les 5 colonnes utiles de l'export de réservations.
 */
function lireExportESeasonDepuisFichierTemporaire_(
  id
) {
  const classeurTemp =
    SpreadsheetApp.openById(
      id
    );

  const feuilles =
    classeurTemp.getSheets();

  if (
    feuilles.length ===
      0
  ) {
    throw new Error(
      "Le fichier importé ne contient aucune feuille."
    );
  }

  const valeurs =
    feuilles[0]
      .getDataRange()
      .getValues();

  return extraireDonneesESeasonDepuisMatrice_(
    valeurs
  );
}


/**
 * Extrait les cinq colonnes CampManager depuis une matrice
 * contenant une ligne d'en-têtes suivie des réservations.
 *
 * Utilisé aussi bien pour XLSX que pour TXT / CSV.
 */
function extraireDonneesESeasonDepuisMatrice_(
  valeurs
) {
  if (
    !valeurs ||
    valeurs.length <
      2
  ) {
    throw new Error(
      "L'export de réservations est vide."
    );
  }

  const entetes =
    valeurs[0]
      .map(
        normaliserEnteteESeason_
      );

  const index = {
    nom:
      trouverColonneESeason_(
        entetes,
        [
          "nom du client",
          "nom client",
          "client",
          "nom",
          "liste de nom",
          "liste des noms",
          "liste nom"
        ]
      ),

    arrivee:
      trouverColonneESeason_(
        entetes,
        [
          "date de debut de sejour",
          "date debut de sejour",
          "date arrivee",
          "arrivee"
        ]
      ),

    depart:
      trouverColonneESeason_(
        entetes,
        [
          "date de fin de sejour",
          "date fin de sejour",
          "date depart",
          "depart"
        ]
      ),

    logement:
      trouverColonneESeason_(
        entetes,
        [
          "n emplacement",
          "no emplacement",
          "numero emplacement",
          "n hebergement",
          "no hebergement",
          "numero hebergement",
          "emplacement",
          "hebergement"
        ]
      ),

    categorie:
      trouverColonneESeason_(
        entetes,
        [
          "categorie empl",
          "categorie emplacement",
          "categorie hebergement",
          "categorie",
          "type hebergement",
          "type"
        ]
      )
  };

  Object.keys(
    index
  ).forEach(
    function(cle) {
      if (
        index[
          cle
        ] ===
          -1
      ) {
        throw new Error(
          "Colonne requise introuvable : " +
          cle +
          "."
        );
      }
    }
  );

  const donnees = [];

  valeurs
    .slice(
      1
    )
    .forEach(
      function(ligne) {
        const nom =
          String(
            ligne[
              index.nom
            ] || ""
          ).trim();

        if (
          nom === ""
        ) {
          return;
        }

        const arrivee =
          convertirDateSynchronisationESeason_(
            ligne[
              index.arrivee
            ]
          );

        const depart =
          convertirDateSynchronisationESeason_(
            ligne[
              index.depart
            ]
          );

        if (
          !arrivee ||
          !depart
        ) {
          throw new Error(
            "Date invalide pour le client : " +
            nom
          );
        }

        donnees.push([
          nom,
          arrivee,
          depart,
          ligne[
            index.logement
          ],
          ligne[
            index.categorie
          ]
        ]);
      }
    );

  if (
    donnees.length ===
      0
  ) {
    throw new Error(
      "Aucun séjour exploitable n'a été trouvé dans l'export."
    );
  }

  /*
   * Plusieurs lignes au même nom et aux mêmes dates
   * restent volontairement autorisées.
   */
  return donnees;
}


/**
 * Décode un fichier texte reçu sous forme d'octets.
 *
 * Priorité UTF-8. Si des caractères de remplacement apparaissent,
 * relecture en Windows-1252, fréquent dans les exports Windows.
 */
function decoderTexteImportReservations_(
  octets
) {
  const blob =
    Utilities.newBlob(
      octets
    );

  const utf8 =
    blob
      .getDataAsString(
        "UTF-8"
      )
      .replace(
        /^\uFEFF/,
        ""
      );

  if (
    utf8.indexOf(
      "\uFFFD"
    ) === -1
  ) {
    return utf8;
  }

  return blob
    .getDataAsString(
      "windows-1252"
    )
    .replace(
      /^\uFEFF/,
      ""
    );
}


/**
 * Analyse un texte délimité et détecte :
 * - la ligne d'en-têtes, dans les 30 premières lignes ;
 * - le séparateur : tabulation, ;, | ou , ;
 * - les cinq colonnes nécessaires à CampManager.
 */
function parserExportTexteReservations_(
  texte
) {
  const lignesBrutes =
    String(
      texte || ""
    )
      .replace(
        /\r\n?/g,
        "\n"
      )
      .split(
        "\n"
      );

  const separateurs = [
    "\t",
    ";",
    "|",
    ","
  ];

  let meilleur =
    null;

  const limite =
    Math.min(
      lignesBrutes.length,
      30
    );

  for (
    let ligneIndex = 0;
    ligneIndex < limite;
    ligneIndex++
  ) {
    const ligne =
      String(
        lignesBrutes[
          ligneIndex
        ] || ""
      ).trim();

    if (!ligne) {
      continue;
    }

    separateurs.forEach(
      function(separateur) {
        const cellules =
          parserLigneDelimiteeReservations_(
            lignesBrutes[
              ligneIndex
            ],
            separateur
          );

        const reconnues =
          compterColonnesReservationsReconnues_(
            cellules
          );

        const score =
          reconnues * 100 +
          cellules.length;

        if (
          !meilleur ||
          score > meilleur.score
        ) {
          meilleur = {
            ligneIndex:
              ligneIndex,
            separateur:
              separateur,
            cellules:
              cellules,
            reconnues:
              reconnues,
            score:
              score
          };
        }
      }
    );
  }

  if (
    !meilleur ||
    meilleur.reconnues < 5
  ) {
    throw new Error(
      "Impossible d'identifier les 5 colonnes nécessaires. " +
      "Colonnes attendues : client, arrivée, départ, hébergement et catégorie."
    );
  }

  const lignes = [];

  for (
    let index = meilleur.ligneIndex;
    index < lignesBrutes.length;
    index++
  ) {
    const brute =
      String(
        lignesBrutes[
          index
        ] || ""
      );

    if (
      brute.trim() === ""
    ) {
      continue;
    }

    lignes.push(
      parserLigneDelimiteeReservations_(
        brute,
        meilleur.separateur
      )
    );
  }

  if (
    lignes.length <
      2
  ) {
    throw new Error(
      "Le fichier texte ne contient aucune réservation exploitable."
    );
  }

  return {
    separateur:
      meilleur.separateur,
    ligneEntetes:
      meilleur.ligneIndex + 1,
    lignes:
      lignes
  };
}


/**
 * Parse une ligne délimitée en prenant en charge les guillemets
 * et les guillemets doublés.
 */
function parserLigneDelimiteeReservations_(
  ligne,
  separateur
) {
  const resultat = [];
  let courant = "";
  let entreGuillemets = false;

  for (
    let index = 0;
    index < ligne.length;
    index++
  ) {
    const caractere =
      ligne.charAt(
        index
      );

    if (
      caractere === '"'
    ) {
      if (
        entreGuillemets &&
        ligne.charAt(
          index + 1
        ) === '"'
      ) {
        courant += '"';
        index++;
      } else {
        entreGuillemets =
          !entreGuillemets;
      }

      continue;
    }

    if (
      caractere === separateur &&
      !entreGuillemets
    ) {
      resultat.push(
        courant.trim()
      );
      courant = "";
      continue;
    }

    courant +=
      caractere;
  }

  resultat.push(
    courant.trim()
  );

  return resultat;
}


function normaliserEnteteImportReservations_(
  valeur
) {
  return String(
    valeur || ""
  )
    .trim()
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[°º]/g,
      "o"
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}


function trouverColonneImportReservations_(
  entetes,
  possibilites
) {
  const attendues =
    possibilites.map(
      normaliserEnteteImportReservations_
    );

  for (
    let index = 0;
    index < entetes.length;
    index++
  ) {
    if (
      attendues.indexOf(
        entetes[
          index
        ]
      ) !==
        -1
    ) {
      return index;
    }
  }

  return -1;
}


function compterColonnesReservationsReconnues_(
  entetesBrutes
) {
  const entetes =
    entetesBrutes.map(
      normaliserEnteteImportReservations_
    );

  const listes = [
    [
      "nom du client",
      "nom client",
      "client",
      "nom",
      "liste de nom",
      "liste des noms",
      "liste nom"
    ],
    [
      "date de debut de sejour",
      "date debut de sejour",
      "date arrivee",
      "arrivee"
    ],
    [
      "date de fin de sejour",
      "date fin de sejour",
      "date depart",
      "depart"
    ],
    [
      "n emplacement",
      "no emplacement",
      "numero emplacement",
      "n hebergement",
      "no hebergement",
      "numero hebergement",
      "emplacement",
      "hebergement"
    ],
    [
      "categorie empl",
      "categorie emplacement",
      "categorie hebergement",
      "categorie",
      "type hebergement",
      "type"
    ]
  ];

  let total =
    0;

  listes.forEach(
    function(possibilites) {
      if (
        trouverColonneImportReservations_(
          entetes,
          possibilites
        ) !== -1
      ) {
        total++;
      }
    }
  );

  return total;
}


/**
 * Convertit un export TXT / CSV en lignes CampManager.
 */
function lireExportESeasonDepuisTexte_(
  texte
) {
  const analyse =
    parserExportTexteReservations_(
      texte
    );

  return extraireDonneesESeasonDepuisMatrice_(
    analyse.lignes
  );
}


/**
 * Crée un Google Sheet temporaire normalisé pour conserver
 * le résultat de la prévisualisation TXT / CSV jusqu'à la confirmation de l'utilisateur.
 */
function creerFichierTemporaireESeasonDepuisDonnees_(
  donnees
) {
  const classeurTemp =
    SpreadsheetApp.create(
      "TEMP_ESEASON_TEXTE_" +
      new Date().getTime()
    );

  const feuille =
    classeurTemp.getSheets()[0];

  feuille
    .getRange(
      1,
      1,
      1,
      5
    )
    .setValues([[
      "Nom client",
      "Date arrivée",
      "Date départ",
      "N° emplacement",
      "Catégorie"
    ]]);

  if (
    donnees.length >
      0
  ) {
    feuille
      .getRange(
        2,
        1,
        donnees.length,
        5
      )
      .setValues(
        donnees
      );

    feuille
      .getRange(
        2,
        2,
        donnees.length,
        2
      )
      .setNumberFormat(
        "dd/MM/yyyy"
      );
  }

  SpreadsheetApp.flush();

  return classeurTemp.getId();
}

/**
 * Analyse l'import sans modifier le classeur.
 */
function analyserImportESeason_(
  donnees
) {
  const classeur =
    SpreadsheetApp.getActiveSpreadsheet();

  const feuilleBase =
    classeur.getSheetByName(
      FEUILLES.BASE
    );

  if (
    !feuilleBase
  ) {
    throw new Error(
      "La feuille Base est introuvable."
    );
  }

  const base =
    lireDonneesSynchronisationESeason_(
      feuilleBase,
      COLONNES_BASE.NOMBRE_COLONNES,
      COLONNES_BASE.NOM_CLIENT
    );

  const groupesImport =
    grouperImportESeason_(
      donnees
    );

  const groupesBase =
    grouperBaseESeason_(
      base
    );

  const bilan = {
    ajoutees: 0,
    modifiees: 0,
    inchangees: 0,
    reactivees: 0,
    manuellesRapprochees: 0,
    annulees: 0,
    groupesMultiHebergements: 0,
    periode: ""
  };

  let min =
    null;

  let max =
    null;

  Object.keys(
    groupesImport
  ).forEach(
    function(cle) {
      const importGroupe =
        groupesImport[
          cle
        ];

      if (
        importGroupe.length >
          1
      ) {
        bilan.groupesMultiHebergements++;
      }

      importGroupe.forEach(
        function(item) {
          if (
            !min ||
            item.arrivee.getTime() <
              min.getTime()
          ) {
            min =
              item.arrivee;
          }

          if (
            !max ||
            item.arrivee.getTime() >
              max.getTime()
          ) {
            max =
              item.arrivee;
          }
        }
      );

      const pairs =
        apparierGroupeESeason_(
          importGroupe,
          (
            groupesBase[
              cle
            ] || []
          )
        );

      pairs.forEach(
        function(pair) {
          if (
            !pair.base
          ) {
            bilan.ajoutees++;

            return;
          }

          const ancienne =
            base[
              pair.base.index
            ];

          const origine =
            String(
              ancienne[
                COLONNES_BASE.ORIGINE - 1
              ] || ""
            ).trim();

          if (
            origine ===
              ORIGINE_RESERVATION.MANUELLE
          ) {
            bilan.manuellesRapprochees++;
          }

          const etat =
            String(
              ancienne[
                COLONNES_BASE.ETAT_RESERVATION - 1
              ] || ""
            ).trim();

          if (
            etat ===
              ETAT_RESERVATION.ANNULEE ||
            etat ===
              ETAT_RESERVATION.ARCHIVEE
          ) {
            bilan.reactivees++;
          }

          const nouvelle = [
            String(
              ancienne[
                COLONNES_BASE.ID_SEJOUR - 1
              ] || ""
            ).trim(),
            pair.import.nom,
            pair.import.arrivee,
            pair.import.depart,
            pair.import.logement,
            pair.import.categorie,
            ETAT_RESERVATION.ACTIVE,
            new Date(),
            ORIGINE_RESERVATION.IMPORT
          ];

          if (
            reservationImportModifieeESeason_(
              ancienne,
              nouvelle
            )
          ) {
            bilan.modifiees++;
          } else {
            bilan.inchangees++;
          }
        }
      );
    }
  );

  /*
   * Annulations prévisionnelles dans la période importée.
   */
  if (
    min &&
    max
  ) {
    Object.keys(
      groupesBase
    ).forEach(
      function(cle) {
        const baseGroupe =
          groupesBase[
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
            min.getTime() ||
          arrivee.getTime() >
            max.getTime()
        ) {
          return;
        }

        const importGroupe =
          groupesImport[
            cle
          ] || [];

        const pairs =
          apparierGroupeESeason_(
            importGroupe,
            baseGroupe
          );

        const utilises = {};

        pairs.forEach(
          function(pair) {
            if (
              pair.base
            ) {
              utilises[
                pair.base.index
              ] =
                true;
            }
          }
        );

        baseGroupe.forEach(
          function(item) {
            if (
              utilises[
                item.index
              ]
            ) {
              return;
            }

            const ligne =
              base[
                item.index
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
              origine ===
                ORIGINE_RESERVATION.IMPORT &&
              etat !==
                ETAT_RESERVATION.ANNULEE &&
              etat !==
                ETAT_RESERVATION.ARCHIVEE
            ) {
              bilan.annulees++;
            }
          }
        );
      }
    );

    bilan.periode =
      Utilities.formatDate(
        min,
        Session.getScriptTimeZone(),
        "dd/MM/yyyy"
      ) +
      " → " +
      Utilities.formatDate(
        max,
        Session.getScriptTimeZone(),
        "dd/MM/yyyy"
      );
  }

  return bilan;
}


/**
 * Écrit les données importées dans la feuille Import.
 *
 * La feuille Import reste modifiable :
 * un switch de logement peut donc être corrigé directement
 * dans la colonne D avant de lancer une synchronisation manuelle.
 */
function ecrireFeuilleImportDepuisESeason_(
  donnees
) {
  const feuille =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        FEUILLES.IMPORT
      );

  if (
    !feuille
  ) {
    throw new Error(
      "La feuille Import est introuvable."
    );
  }

  feuille
    .getRange(
      LIGNES.ENTETES,
      1,
      1,
      5
    )
    .setValues([[
      "Nom client",
      "Date arrivée",
      "Date départ",
      "N° emplacement",
      "Catégorie"
    ]]);

  const nombreLignes =
    Math.max(
      feuille.getMaxRows() -
        LIGNES.DEBUT +
        1,
      donnees.length
    );

  if (
    nombreLignes >
      0
  ) {
    feuille
      .getRange(
        LIGNES.DEBUT,
        1,
        nombreLignes,
        5
      )
      .clearContent();
  }

  feuille
    .getRange(
      LIGNES.DEBUT,
      1,
      donnees.length,
      5
    )
    .setValues(
      donnees
    );

  feuille
    .getRange(
      LIGNES.DEBUT,
      COLONNES_IMPORT.DATE_ARRIVEE,
      donnees.length,
      2
    )
    .setNumberFormat(
      "dd/MM/yyyy"
    );
}


function supprimerFichierTemporaireESeason_(
  id
) {
  if (
    !id
  ) {
    return;
  }

  try {
    DriveApp
      .getFileById(
        id
      )
      .setTrashed(
        true
      );
  } catch (erreur) {
    console.log(
      "Fichier temporaire d'import non supprimé : " +
      erreur.message
    );
  }
}


function normaliserEnteteESeason_(
  valeur
) {
  return String(
    valeur || ""
  )
    .trim()
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[°º]/g,
      "o"
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}


function trouverColonneESeason_(
  entetes,
  possibilites
) {
  const normalisees =
    possibilites.map(
      normaliserEnteteESeason_
    );

  for (
    let index = 0;
    index < entetes.length;
    index++
  ) {
    if (
      normalisees.indexOf(
        entetes[
          index
        ]
      ) !==
        -1
    ) {
      return index;
    }
  }

  return -1;
}


/**
 * Fenêtre HTML de sélection + prévisualisation.
 */
function construireHtmlImportESeason_() {
  return `
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
body{
  font-family:Arial,sans-serif;
  padding:20px;
  color:#17202a;
  background:#f5f7fa;
}
h2{color:#17365d;margin-top:0}
.carte{
  background:white;
  padding:18px;
  border-radius:14px;
  border:1px solid #dbe3ec;
}
input{
  width:100%;
  box-sizing:border-box;
  padding:12px;
  background:white;
  border:1px solid #cbd5e1;
  border-radius:10px;
}
button{
  width:100%;
  padding:14px;
  margin-top:12px;
  border:0;
  border-radius:10px;
  font-weight:bold;
  cursor:pointer;
}
.primaire{background:#17365d;color:white}
.valider{background:#16803a;color:white}
.annuler{background:#e5e7eb;color:#222}
#bilan{
  margin-top:16px;
  padding:14px;
  background:#eef6ff;
  border-radius:10px;
  display:none;
  line-height:1.55;
}
#message{margin-top:12px;font-weight:bold}
</style>
</head>
<body>
<div class="carte">
<h2>📥 Import des réservations</h2>
<p>Sélectionnez un export de réservations au format <b>.xlsx</b>, <b>.txt</b> ou <b>.csv</b>.</p>

<input id="fichier" type="file" accept=".xlsx,.txt,.csv">

<button class="primaire" onclick="analyser()">
  Analyser le fichier
</button>

<div id="bilan"></div>

<button id="confirmer" class="valider" style="display:none" onclick="confirmerImport()">
  Confirmer l'import
</button>

<button id="annuler" class="annuler" style="display:none" onclick="annulerImport()">
  Annuler
</button>

<div id="message"></div>
</div>

<script>
let tempId = "";

function analyser(){
  const input = document.getElementById("fichier");
  const fichier = input.files[0];

  if(!fichier){
    document.getElementById("message").textContent =
      "Sélectionnez d'abord un fichier.";
    return;
  }

  document.getElementById("message").textContent =
    "Analyse en cours…";

  const lecteur = new FileReader();

  lecteur.onload = function(e){
    const base64 =
      e.target.result.split(",")[1];

    google.script.run
      .withSuccessHandler(function(r){
        tempId = r.fichierTemporaireId;

        document.getElementById("bilan").style.display = "block";
        document.getElementById("bilan").innerHTML =
          "<b>Vérification avant import</b><br><br>" +
          "Format détecté : " + (r.format || "—") + "<br>" +
          "Séjours dans le fichier : " + r.nombreLignes + "<br>" +
          "Période d'arrivées : " + (r.periode || "—") + "<br><br>" +
          "➕ Nouveaux : " + r.ajoutees + "<br>" +
          "✏️ Modifiés : " + r.modifiees + "<br>" +
          "✅ Inchangés : " + r.inchangees + "<br>" +
          "♻️ Réactivés : " + r.reactivees + "<br>" +
          "🔗 Ajouts manuels retrouvés dans l’export : " +
            r.manuellesRapprochees + "<br>" +
          "🏘️ Groupes multi-hébergements : " +
            r.groupesMultiHebergements + "<br>" +
          "❌ Annulations détectées : " + r.annulees;

        document.getElementById("confirmer").style.display = "block";
        document.getElementById("annuler").style.display = "block";
        document.getElementById("message").textContent =
          "Vérifiez le bilan puis confirmez.";
      })
      .withFailureHandler(function(erreur){
        document.getElementById("message").textContent =
          "❌ Erreur : " +
          (erreur && erreur.message ? erreur.message : String(erreur));
        document.getElementById("confirmer").style.display = "none";
        document.getElementById("annuler").style.display = "none";
      })
      .preparerImportESeason({
        nom:fichier.name,
        base64:base64
      });
  };

  lecteur.readAsDataURL(fichier);
}

function confirmerImport(){
  if(!tempId){return;}

  document.getElementById("message").textContent =
    "Import et actualisation en cours…";

  google.script.run
    .withSuccessHandler(function(r){
      document.getElementById("message").textContent =
        "✅ Import terminé.";
      document.getElementById("bilan").innerHTML =
        "<b>Import terminé</b><br><br>" +
        String(r.message || "").replace(/\\n/g,"<br>");
      document.getElementById("confirmer").style.display = "none";
      document.getElementById("annuler").style.display = "none";
      tempId = "";
    })
    .withFailureHandler(function(erreur){
      document.getElementById("message").textContent =
        "❌ Erreur : " +
        (erreur && erreur.message ? erreur.message : String(erreur));
    })
    .appliquerImportESeason(tempId);
}

function annulerImport(){
  if(!tempId){
    google.script.host.close();
    return;
  }

  google.script.run
    .withSuccessHandler(function(){
      google.script.host.close();
    })
    .annulerImportESeason(tempId);
}
</script>
</body>
</html>`;
}}}}