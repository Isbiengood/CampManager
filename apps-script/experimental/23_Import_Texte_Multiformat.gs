/**
 * ============================================================
 * CAMPMANAGER — PARSEUR D'IMPORT TEXTE EXPÉRIMENTAL
 * TXT / CSV — tests synthétiques
 * ============================================================
 *
 * IMPORTANT :
 * - ce fichier n'est PAS encore branché sur le MASTER ;
 * - il sert à valider la lecture générique des exports texte ;
 * - la compatibilité eSeason réelle restera "à confirmer"
 *   jusqu'à réception d'un véritable export anonymisé.
 */


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
    lignes.length < 2
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
      ) !== -1
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
 * Tests synthétiques : aucun accès à Base/Réception.
 */
function testerParseurImportTexteCampManager() {
  const cas = [
    {
      nom:
        "tabulations + préambule",
      texte:
        "Rapport eSeason\n" +
        "Export du 24/09/2026\n" +
        "Nom du client\tDate de début de séjour\tDate de fin de séjour\tN° emplacement\tCatégorie empl\n" +
        "Famille Martin\t24/09/2026\t27/09/2026\t101\tMobil-home Confort\n"
    },
    {
      nom:
        "point-virgule",
      texte:
        "Nom client;Date arrivée;Date départ;N° hébergement;Catégorie\n" +
        "Mme Durand;25/09/2026;28/09/2026;A2;Lodge Premium\n"
    },
    {
      nom:
        "pipe + guillemets",
      texte:
        "Client|Arrivée|Départ|Hébergement|Type\n" +
        "\"Famille Dupont, Paris\"|26/09/2026|29/09/2026|203|\"Chalet Famille\"\n"
    },
    {
      nom:
        "CSV virgule",
      texte:
        "Client,Arrivée,Départ,Hébergement,Type\n" +
        "\"M. Bernard\",27/09/2026,30/09/2026,B4,\"Mobil-home Essentiel\"\n"
    }
  ];

  const resultats =
    cas.map(
      function(casTest) {
        const analyse =
          parserExportTexteReservations_(
            casTest.texte
          );

        if (
          analyse.lignes.length !== 2
        ) {
          throw new Error(
            "Test échoué : " +
            casTest.nom
          );
        }

        return {
          test:
            casTest.nom,
          ok:
            true,
          ligneEntetes:
            analyse.ligneEntetes,
          colonnes:
            analyse.lignes[0].length
        };
      }
    );

  Logger.log(
    JSON.stringify(
      resultats,
      null,
      2
    )
  );

  return resultats;
}
