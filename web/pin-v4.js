(() => {
  "use strict";

  const CFG =
    window.CAMPMANAGER_V4;

  if (
    !CFG ||
    !window.supabase
  ) {
    return;
  }

  const client =
    window.supabase.createClient(
      CFG.SUPABASE_URL,
      CFG.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

  const $ = id =>
    document.getElementById(id);

  const boutonConnexion =
    $("boutonConnexion");

  const champPrenom =
    $("champPrenom");

  const champPin =
    $("champPin");

  const erreurConnexion =
    $("erreurConnexion");

  if (
    !boutonConnexion ||
    !champPrenom ||
    !champPin
  ) {
    return;
  }

  function texteErreur(
    error
  ) {
    const message =
      String(
        error?.message ||
        error ||
        "Erreur inconnue"
      );

    return message
      .replace(
        /^.*?:\s*/,
        ""
      )
      .trim();
  }

  function afficherErreur(
    message
  ) {
    if (!erreurConnexion) {
      return;
    }

    erreurConnexion.textContent =
      message || "";

    erreurConnexion.classList.toggle(
      "cache",
      !message
    );
  }

  function prenomActuel() {
    const memorise =
      localStorage.getItem(
        CFG.STORAGE_PRENOM
      ) || "";

    return (
      memorise ||
      champPrenom.value ||
      ""
    ).trim();
  }

  const boutonCreation =
    document.createElement(
      "button"
    );

  boutonCreation.id =
    "boutonCreationPin";

  boutonCreation.type =
    "button";

  boutonCreation.className =
    "bouton-secondaire";

  boutonCreation.textContent =
    "Première connexion / nouveau PIN";

  const zone =
    document.createElement(
      "div"
    );

  zone.id =
    "zoneCreationPin";

  zone.className =
    "option cache";

  zone.innerHTML = `
    <b>🔑 Créer votre code PIN</b>

    <div class="etat-technique" style="margin-top:6px">
      Saisissez le code d’activation à 6 chiffres fourni par le responsable,
      puis choisissez votre propre PIN de 4 à 8 chiffres.
    </div>

    <input
      id="champActivationV4"
      class="champ"
      type="password"
      inputmode="numeric"
      autocomplete="one-time-code"
      placeholder="Code d’activation (6 chiffres)"
      maxlength="6"
    >

    <input
      id="champNouveauPinV4"
      class="champ"
      type="password"
      inputmode="numeric"
      autocomplete="new-password"
      placeholder="Choisissez votre PIN"
      maxlength="8"
    >

    <input
      id="champConfirmationPinV4"
      class="champ"
      type="password"
      inputmode="numeric"
      autocomplete="new-password"
      placeholder="Confirmez votre PIN"
      maxlength="8"
    >

    <button
      id="boutonValiderCreationPinV4"
      class="bouton-principal"
      type="button"
    >
      Créer mon PIN
    </button>

    <button
      id="boutonAnnulerCreationPinV4"
      class="bouton-secondaire"
      type="button"
    >
      Annuler
    </button>

    <div class="note-securite">
      🔒 Le code d’activation n’est utilisable qu’une seule fois
      et expire après 24 heures.
    </div>
  `;

  boutonConnexion.insertAdjacentElement(
    "afterend",
    boutonCreation
  );

  boutonCreation.insertAdjacentElement(
    "afterend",
    zone
  );

  const champActivation =
    $("champActivationV4");

  const champNouveauPin =
    $("champNouveauPinV4");

  const champConfirmation =
    $("champConfirmationPinV4");

  const boutonValider =
    $("boutonValiderCreationPinV4");

  const boutonAnnuler =
    $("boutonAnnulerCreationPinV4");

  function ouvrirCreation() {
    afficherErreur(
      ""
    );

    zone.classList.remove(
      "cache"
    );

    boutonCreation.classList.add(
      "cache"
    );

    champActivation.value =
      "";

    champNouveauPin.value =
      "";

    champConfirmation.value =
      "";

    setTimeout(
      () => {
        champActivation.focus();
      },
      50
    );
  }

  function fermerCreation() {
    zone.classList.add(
      "cache"
    );

    boutonCreation.classList.remove(
      "cache"
    );

    champActivation.value =
      "";

    champNouveauPin.value =
      "";

    champConfirmation.value =
      "";
  }

  async function creerPin() {
    if (
      navigator.onLine ===
      false
    ) {
      afficherErreur(
        "Pas de connexion Internet."
      );

      return;
    }

    const prenom =
      prenomActuel();

    const activation =
      champActivation.value.trim();

    const nouveauPin =
      champNouveauPin.value.trim();

    const confirmation =
      champConfirmation.value.trim();

    if (!prenom) {
      afficherErreur(
        "Indiquez d’abord votre prénom."
      );

      return;
    }

    if (
      !/^\d{6}$/.test(
        activation
      )
    ) {
      afficherErreur(
        "Le code d’activation doit contenir 6 chiffres."
      );

      return;
    }

    if (
      !/^\d{4,8}$/.test(
        nouveauPin
      )
    ) {
      afficherErreur(
        "Votre nouveau PIN doit contenir 4 à 8 chiffres."
      );

      return;
    }

    if (
      nouveauPin !==
      confirmation
    ) {
      afficherErreur(
        "Les deux PIN ne correspondent pas."
      );

      return;
    }

    boutonValider.disabled =
      true;

    boutonValider.textContent =
      "Création…";

    afficherErreur(
      ""
    );

    try {
      const {
        data,
        error
      } =
        await client.rpc(
          "creer_pin_avec_activation_v4",
          {
            p_prenom:
              prenom,

            p_code_activation:
              activation,

            p_nouveau_pin:
              nouveauPin
          }
        );

      if (error) {
        throw error;
      }

      if (
        !data ||
        data.ok !==
          true
      ) {
        throw new Error(
          "Impossible de créer le PIN."
        );
      }

      localStorage.setItem(
        CFG.STORAGE_PRENOM,
        data.prenom ||
          prenom
      );

      champPrenom.value =
        data.prenom ||
        prenom;

      champPin.value =
        nouveauPin;

      fermerCreation();

      /*
       * Réutilise la connexion officielle déjà présente
       * dans app-v4.js. Aucun second système de session.
       */
      boutonConnexion.click();

    } catch (
      error
    ) {
      afficherErreur(
        texteErreur(
          error
        )
      );

    } finally {
      boutonValider.disabled =
        false;

      boutonValider.textContent =
        "Créer mon PIN";
    }
  }

  boutonCreation.addEventListener(
    "click",
    ouvrirCreation
  );

  boutonAnnuler.addEventListener(
    "click",
    fermerCreation
  );

  boutonValider.addEventListener(
    "click",
    creerPin
  );

  champConfirmation.addEventListener(
    "keydown",
    event => {
      if (
        event.key ===
        "Enter"
      ) {
        creerPin();
      }
    }
  );
})();
