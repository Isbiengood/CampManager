(() => {
  "use strict";

  const CFG = window.CAMPMANAGER_V4;

  if (!CFG) {
    document.body.innerHTML =
      "<p style='padding:20px;font-family:sans-serif'>Configuration CampManager V4 introuvable.</p>";
    return;
  }

  const client = window.supabase.createClient(
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

  const $ = (id) =>
    document.getElementById(id);

  const el = {
    nomUtilisateur: $("nomUtilisateur"),
    etatTechnique: $("etatTechnique"),
    badgeVitesse: $("badgeVitesse"),
    listeTaches: $("listeTaches"),
    listeAvenir: $("listeAvenir"),
    zoneAvenir: $("zoneAvenir"),
    erreurPrincipale: $("erreurPrincipale"),
    voileConnexion: $("voileConnexion"),
    voileReglages: $("voileReglages"),
    champPrenom: $("champPrenom"),
    zonePrenomMemorise: $("zonePrenomMemorise"),
    textePrenomMemorise: $("textePrenomMemorise"),
    changerPrenomConnexion: $("changerPrenomConnexion"),
    champPin: $("champPin"),
    boutonConnexion: $("boutonConnexion"),
    erreurConnexion: $("erreurConnexion"),
    boutonActualiser: $("boutonActualiser"),
    boutonReglages: $("boutonReglages"),
    fermerReglages: $("fermerReglages"),
    boutonDeconnexion: $("boutonDeconnexion"),
    interrupteurSombre: $("interrupteurSombre"),
    prenomReglages: $("prenomReglages"),
    versionReglages: $("versionReglages"),
    toast: $("toast")
  };

  let token =
    localStorage.getItem(
      CFG.STORAGE_TOKEN
    ) || "";

  let prenomMemorise =
    localStorage.getItem(
      CFG.STORAGE_PRENOM
    ) || "";

  let utilisateur = null;
  let timer = null;
  let chargementEnCours = false;
  let actionEnCours = false;
  let toastTimer = null;

  function estEnLigne() {
    return navigator.onLine !== false;
  }

  function afficherToast(message) {
    clearTimeout(toastTimer);

    el.toast.textContent =
      message;

    el.toast.classList.remove(
      "cache"
    );

    toastTimer =
      setTimeout(() => {
        el.toast.classList.add(
          "cache"
        );
      }, 2600);
  }

  function afficherErreur(message) {
    if (!message) {
      el.erreurPrincipale.textContent =
        "";

      el.erreurPrincipale.classList.add(
        "cache"
      );

      return;
    }

    el.erreurPrincipale.textContent =
      message;

    el.erreurPrincipale.classList.remove(
      "cache"
    );
  }

  function afficherErreurConnexion(message) {
    el.erreurConnexion.textContent =
      message || "";

    el.erreurConnexion.classList.toggle(
      "cache",
      !message
    );
  }

  function texteErreur(error) {
    const message =
      String(
        error?.message ||
        error ||
        "Erreur inconnue"
      );

    if (
      /Failed to fetch|Load failed|NetworkError|fetch/i.test(
        message
      )
    ) {
      return "Pas de connexion Internet.";
    }

    return message
      .replace(/^.*?:\s*/, "")
      .trim();
  }

  function appliquerTheme() {
    const theme =
      localStorage.getItem(
        CFG.STORAGE_THEME
      );

    const sombre =
      theme === "dark";

    document.body.classList.toggle(
      "sombre",
      sombre
    );

    el.interrupteurSombre.checked =
      sombre;
  }

  function setEtatTechnique(
    texte,
    vitesse
  ) {
    el.etatTechnique.textContent =
      texte;

    if (
      typeof vitesse ===
      "number"
    ) {
      el.badgeVitesse.textContent =
        Math.round(
          vitesse
        ) + " ms";
    }
  }

  function appliquerPrenomMemoriseConnexion() {
    const aUnPrenom =
      !!prenomMemorise;

    el.zonePrenomMemorise.classList.toggle(
      "cache",
      !aUnPrenom
    );

    el.champPrenom.classList.toggle(
      "cache",
      aUnPrenom
    );

    if (aUnPrenom) {
      el.textePrenomMemorise.textContent =
        "Bonjour " +
        prenomMemorise;

      el.champPrenom.value =
        prenomMemorise;
    } else {
      el.textePrenomMemorise.textContent =
        "";

      el.champPrenom.value =
        "";
    }
  }

  function ouvrirConnexion() {
    appliquerPrenomMemoriseConnexion();

    el.voileConnexion.classList.remove(
      "cache"
    );

    setTimeout(() => {
      if (prenomMemorise) {
        el.champPin.focus();
      } else {
        el.champPrenom.focus();
      }
    }, 50);
  }

  function changerPrenomMemorise() {
    prenomMemorise =
      "";

    localStorage.removeItem(
      CFG.STORAGE_PRENOM
    );

    el.champPin.value =
      "";

    afficherErreurConnexion(
      ""
    );

    appliquerPrenomMemoriseConnexion();

    setTimeout(() => {
      el.champPrenom.focus();
    }, 50);
  }

  function fermerConnexion() {
    el.voileConnexion.classList.add(
      "cache"
    );
  }

  function nettoyerSessionLocale() {
    token = "";
    utilisateur = null;

    localStorage.removeItem(
      CFG.STORAGE_TOKEN
    );

    el.nomUtilisateur.textContent =
      "Utilisateur : —";

    el.prenomReglages.textContent =
      "—";

    el.listeTaches.innerHTML =
      "";

    el.listeAvenir.innerHTML =
      "";

    el.zoneAvenir.classList.add(
      "cache"
    );
  }

  function estErreurSession(message) {
    return /session expirée|session.*invalide/i.test(
      String(message || "")
    );
  }

  async function connexion() {
    if (!estEnLigne()) {
      afficherErreurConnexion(
        "Pas de connexion Internet."
      );
      return;
    }

    const prenom =
      (
        prenomMemorise ||
        el.champPrenom.value
      ).trim();

    const pin =
      el.champPin.value.trim();

    if (!prenom) {
      afficherErreurConnexion(
        "Indiquez votre prénom."
      );
      return;
    }

    if (!/^\d{4,8}$/.test(pin)) {
      afficherErreurConnexion(
        "Le PIN doit contenir 4 à 8 chiffres."
      );
      return;
    }

    afficherErreurConnexion(
      ""
    );

    el.boutonConnexion.disabled =
      true;

    el.boutonConnexion.textContent =
      "Connexion…";

    const depart =
      performance.now();

    try {
      const { data, error } =
        await client.rpc(
          "connexion_preprod_v4",
          {
            p_prenom:
              prenom,

            p_pin:
              pin
          }
        );

      if (error) {
        throw error;
      }

      if (
        !data ||
        !data.ok ||
        !data.token
      ) {
        throw new Error(
          "Connexion refusée."
        );
      }

      token =
        data.token;

      utilisateur = {
        prenom:
          data.prenom,

        role:
          data.role,

        femmeDeChambre:
          !!data.femmeDeChambre,

        gouvernante:
          !!data.gouvernante
      };

      localStorage.setItem(
        CFG.STORAGE_TOKEN,
        token
      );

      prenomMemorise =
        data.prenom;

      localStorage.setItem(
        CFG.STORAGE_PRENOM,
        prenomMemorise
      );

      el.champPrenom.value =
        prenomMemorise;

      el.champPin.value =
        "";

      fermerConnexion();

      await chargerLogements(
        true
      );

      setEtatTechnique(
        "En ligne · session sécurisée",
        performance.now() -
          depart
      );

    } catch (error) {
      afficherErreurConnexion(
        texteErreur(error)
      );

    } finally {
      el.boutonConnexion.disabled =
        false;

      el.boutonConnexion.textContent =
        "Se connecter";
    }
  }

  function classeEtat(etat) {
    if (
      etat === "À vérifier"
    ) {
      return "etat-a-verifier";
    }

    if (
      etat === "À recontrôler"
    ) {
      return "etat-a-recontroler";
    }

    return "etat-a-faire";
  }

  function texteAction(item) {
    if (
      item.actionSuivante ===
      "À vérifier"
    ) {
      return "🧹 Ménage terminé";
    }

    if (
      item.actionSuivante ===
      "Prêt"
    ) {
      if (
        item.mode ===
        "menage_controle"
      ) {
        return "✅ Ménage + contrôle : PRÊT";
      }

      return "✅ Contrôle terminé : PRÊT";
    }

    return "Valider";
  }

  function detailsCarte(item) {
    const morceaux = [];

    if (item.categorie) {
      morceaux.push(
        "<b>Type :</b> " +
        echapperHtml(
          item.categorie
        )
      );
    }

    if (item.personnel) {
      morceaux.push(
        "<b>Personnel :</b> " +
        echapperHtml(
          item.personnel
        )
      );
    }

    if (item.gouvernante) {
      morceaux.push(
        "<b>Gouvernante :</b> " +
        echapperHtml(
          item.gouvernante
        )
      );
    }

    if (item.acces) {
      morceaux.push(
        "<b>Accès :</b> " +
        echapperHtml(
          item.acces
        )
      );
    }

    if (item.etatReception) {
      morceaux.push(
        "<b>Réception :</b> " +
        echapperHtml(
          item.etatReception
        )
      );
    }

    return morceaux.join(
      "<br>"
    );
  }

  function echapperHtml(value) {
    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function carteHtml(
    item,
    avenir
  ) {
    const action =
      avenir
        ? ""
        : `
          <button
            class="action ${item.mode === "controle" ? "controle" : ""}"
            type="button"
            data-action-tache="${echapperHtml(item.tacheId)}"
            data-etat="${echapperHtml(item.etatMenage)}"
          >
            ${echapperHtml(texteAction(item))}
          </button>
        `;

    return `
      <article class="carte ${avenir ? "carte-avenir" : ""}" data-carte="${echapperHtml(item.tacheId)}">
        <div class="carte-haut">
          <div class="priorite">${echapperHtml(item.priorite || "")}</div>
          <div>
            <div class="numero">${echapperHtml(item.logement)}</div>
            ${item.categorie ? `<div class="categorie">${echapperHtml(item.categorie)}</div>` : ""}
          </div>
          <div class="etat ${classeEtat(item.etatMenage)}">
            ${echapperHtml(item.etatMenage)}
          </div>
        </div>
        <div class="details">${detailsCarte(item)}</div>
        ${action}
      </article>
    `;
  }

  function rendreListe(data) {
    const taches =
      Array.isArray(
        data.logements
      )
        ? data.logements
        : [];

    const avenir =
      Array.isArray(
        data.controlesAVenir
      )
        ? data.controlesAVenir
        : [];

    if (
      taches.length ===
      0
    ) {
      el.listeTaches.innerHTML =
        `<div class="vide">✅ Aucun hébergement à traiter pour le moment.</div>`;
    } else {
      el.listeTaches.innerHTML =
        taches
          .map(
            item =>
              carteHtml(
                item,
                false
              )
          )
          .join("");
    }

    if (
      avenir.length ===
      0
    ) {
      el.zoneAvenir.classList.add(
        "cache"
      );

      el.listeAvenir.innerHTML =
        "";
    } else {
      el.zoneAvenir.classList.remove(
        "cache"
      );

      el.listeAvenir.innerHTML =
        avenir
          .map(
            item =>
              carteHtml(
                item,
                true
              )
          )
          .join("");
    }

    document
      .querySelectorAll(
        "[data-action-tache]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            avancerEtat(
              button.dataset.actionTache,
              button.dataset.etat,
              button
            );
          }
        );
      });
  }

  async function chargerLogements(
    forceVisible = false
  ) {
    if (
      chargementEnCours ||
      !token
    ) {
      return;
    }

    if (!estEnLigne()) {
      setEtatTechnique(
        "Hors connexion"
      );
      return;
    }

    chargementEnCours =
      true;

    const depart =
      performance.now();

    try {
      const { data, error } =
        await client.rpc(
          "charger_logements_preprod_v4",
          {
            p_token:
              token
          }
        );

      if (error) {
        throw error;
      }

      utilisateur = {
        prenom:
          data.prenom,

        role:
          data.role,

        femmeDeChambre:
          !!data.femmeDeChambre,

        gouvernante:
          !!data.gouvernante
      };

      prenomMemorise =
        data.prenom;

      localStorage.setItem(
        CFG.STORAGE_PRENOM,
        prenomMemorise
      );

      el.nomUtilisateur.textContent =
        "Utilisateur : " +
        data.prenom;

      el.prenomReglages.textContent =
        data.prenom +
        " · " +
        (
          data.role === "double_role"
            ? "Ménage + Gouvernante"
            : data.role === "gouvernante"
              ? "Gouvernante"
              : "Ménage"
        );

      rendreListe(
        data
      );

      afficherErreur(
        ""
      );

      setEtatTechnique(
        "En ligne · données sécurisées",
        performance.now() -
          depart
      );

      if (forceVisible) {
        afficherToast(
          "Liste synchronisée"
        );
      }

    } catch (error) {
      const message =
        texteErreur(error);

      if (
        estErreurSession(
          message
        )
      ) {
        nettoyerSessionLocale();
        ouvrirConnexion();
        afficherErreurConnexion(
          "Votre session a expiré. Reconnectez-vous."
        );
      } else if (
        message ===
        "Pas de connexion Internet."
      ) {
        setEtatTechnique(
          "Hors connexion"
        );
      } else {
        afficherErreur(
          message
        );
      }

    } finally {
      chargementEnCours =
        false;
    }
  }

  async function avancerEtat(
    tacheId,
    etatActuel,
    button
  ) {
    if (
      actionEnCours ||
      !token
    ) {
      return;
    }

    if (!estEnLigne()) {
      afficherToast(
        "Pas de connexion · modification non enregistrée"
      );
      return;
    }

    actionEnCours =
      true;

    const carte =
      button.closest(
        ".carte"
      );

    button.disabled =
      true;

    if (carte) {
      carte.classList.add(
        "en-cours"
      );
    }

    const depart =
      performance.now();

    try {
      const { data, error } =
        await client.rpc(
          "avancer_etat_menage_preprod_v4",
          {
            p_token:
              token,

            p_tache_id:
              tacheId,

            p_etat_actuel:
              etatActuel
          }
        );

      if (error) {
        throw error;
      }

      afficherToast(
        `✅ ${data.logement} → ${data.nouvelEtat}`
      );

      await chargerLogements();

      setEtatTechnique(
        "En ligne · mise à jour enregistrée",
        performance.now() -
          depart
      );

    } catch (error) {
      const message =
        texteErreur(error);

      if (
        /état déjà modifié/i.test(
          message
        )
      ) {
        afficherToast(
          "✅ Déjà mis à jour sur un autre appareil"
        );

        await chargerLogements(
          true
        );
      } else if (
        estErreurSession(
          message
        )
      ) {
        nettoyerSessionLocale();
        ouvrirConnexion();
        afficherErreurConnexion(
          "Votre session a expiré."
        );
      } else {
        afficherToast(
          message
        );
      }

    } finally {
      actionEnCours =
        false;

      if (button.isConnected) {
        button.disabled =
          false;
      }

      if (
        carte &&
        carte.isConnected
      ) {
        carte.classList.remove(
          "en-cours"
        );
      }
    }
  }

  async function deconnexion() {
    const ancienToken =
      token;

    nettoyerSessionLocale();

    el.voileReglages.classList.add(
      "cache"
    );

    ouvrirConnexion();

    if (
      ancienToken &&
      estEnLigne()
    ) {
      try {
        await client.rpc(
          "deconnexion_preprod_v4",
          {
            p_token:
              ancienToken
          }
        );
      } catch (_) {
        // Le nettoyage local est prioritaire.
      }
    }
  }

  function lancerRafraichissement() {
    clearInterval(
      timer
    );

    timer =
      setInterval(() => {
        if (
          token &&
          document.visibilityState ===
            "visible" &&
          estEnLigne()
        ) {
          chargerLogements();
        }
      }, CFG.REFRESH_MS);
  }

  window.addEventListener(
    "online",
    async () => {
      setEtatTechnique(
        "Connexion rétablie · resynchronisation…"
      );

      if (token) {
        await chargerLogements(
          true
        );
      }
    }
  );

  window.addEventListener(
    "offline",
    () => {
      setEtatTechnique(
        "Hors connexion"
      );
    }
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState ===
          "visible" &&
        token &&
        estEnLigne()
      ) {
        chargerLogements();
      }
    }
  );

  el.boutonConnexion.addEventListener(
    "click",
    connexion
  );

  el.changerPrenomConnexion.addEventListener(
    "click",
    changerPrenomMemorise
  );

  el.champPin.addEventListener(
    "keydown",
    event => {
      if (
        event.key ===
        "Enter"
      ) {
        connexion();
      }
    }
  );

  el.boutonActualiser.addEventListener(
    "click",
    () => {
      chargerLogements(
        true
      );
    }
  );

  el.boutonReglages.addEventListener(
    "click",
    () => {
      el.voileReglages.classList.remove(
        "cache"
      );
    }
  );

  el.fermerReglages.addEventListener(
    "click",
    () => {
      el.voileReglages.classList.add(
        "cache"
      );
    }
  );

  el.boutonDeconnexion.addEventListener(
    "click",
    deconnexion
  );

  el.interrupteurSombre.addEventListener(
    "change",
    () => {
      localStorage.setItem(
        CFG.STORAGE_THEME,
        el.interrupteurSombre.checked
          ? "dark"
          : "light"
      );

      appliquerTheme();
    }
  );

  el.versionReglages.textContent =
    "CampManager " +
    CFG.VERSION +
    " · accès PIN sécurisé";

  appliquerTheme();
  lancerRafraichissement();

  if (token) {
    chargerLogements().then(() => {
      if (!utilisateur && token) {
        // En cas d'erreur silencieuse, l'appel aura affiché la connexion.
      }
    });
  } else {
    ouvrirConnexion();
  }

  if (!estEnLigne()) {
    setEtatTechnique(
      "Hors connexion"
    );
  }
})();
