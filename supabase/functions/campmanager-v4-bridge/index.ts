const VERSION = "2.0.0-tenant-bound-bootstrap";

const ALLOWED_RPCS = new Set([
  "obtenir_camping_multicamping_v4",
  "synchroniser_drive_multicamping_v4",
  "recuperer_actions_drive_multicamping_v4",
  "marquer_action_drive_multicamping_v4",
  "reinitialiser_acces_personnel_multicamping_v4",
  "changer_actif_personnel_multicamping_v4",
  "lister_acces_personnel_multicamping_v4",
  "definir_pin_personnel_multicamping_v4",
]);

const LEGACY_RPC_MAP: Record<string, string> = {
  synchroniser_drive_v4: "synchroniser_drive_multicamping_v4",
  recuperer_actions_drive_v4: "recuperer_actions_drive_multicamping_v4",
  marquer_action_drive_v4: "marquer_action_drive_multicamping_v4",
};

const CAMPING_SCOPED_RPCS = new Set([
  "obtenir_camping_multicamping_v4",
  "synchroniser_drive_multicamping_v4",
  "recuperer_actions_drive_multicamping_v4",
  "marquer_action_drive_multicamping_v4",
  "reinitialiser_acces_personnel_multicamping_v4",
  "changer_actif_personnel_multicamping_v4",
  "lister_acces_personnel_multicamping_v4",
  "definir_pin_personnel_multicamping_v4",
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function generateBridgeToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `cmv4_${base64Url(bytes)}`;
}

function getServerSecretKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const preferred = parsed.default || Object.values(parsed)[0];
      if (typeof preferred === "string" && preferred.startsWith("sb_secret_")) {
        return preferred;
      }
    } catch (_) {
      // Compatibilité avec les anciens projets : service_role ci-dessous.
    }
  }

  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (legacy) return legacy;

  throw new Error("Aucune clé serveur Supabase disponible.");
}

function getSupabaseUrl() {
  const url = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/g, "");
  if (!url) throw new Error("SUPABASE_URL indisponible.");
  return url;
}

async function callServerRpc(rpc: string, params: Record<string, unknown>) {
  const supabaseUrl = getSupabaseUrl();
  const secretKey = getServerSecretKey();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(rpc)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify(params || {}),
    },
  );

  const text = await response.text();
  let data: unknown = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as Record<string, unknown>).message || text)
        : text || `HTTP ${response.status}`;

    throw new Error(message);
  }

  return data as Record<string, unknown>;
}

async function authenticateBridgeToken(token: string) {
  if (!token) throw new Error("Jeton CampManager manquant.");

  const tokenHash = await sha256Hex(token);
  const auth = await callServerRpc("authentifier_pont_campmanager_v4", {
    p_token_hash: tokenHash,
  });

  if (!auth || auth.ok !== true || !auth.campingCode) {
    throw new Error("Jeton CampManager invalide.");
  }

  return auth;
}

async function bootstrapInstallation(body: Record<string, unknown>) {
  const installationCode = String(body.installationCode || "").trim();
  const establishment =
    body.establishment && typeof body.establishment === "object"
      ? (body.establishment as Record<string, unknown>)
      : {};

  const code = String(establishment.code || "").trim().toLowerCase();
  const name = String(establishment.name || "").trim();
  const timezone = String(establishment.timezone || "Europe/Paris").trim();

  if (installationCode.length < 12) {
    return jsonResponse(
      { ok: false, message: "Code d’installation invalide." },
      400,
    );
  }

  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(code)) {
    return jsonResponse(
      { ok: false, message: "Code établissement invalide." },
      400,
    );
  }

  if (name.length < 2 || name.length > 120) {
    return jsonResponse(
      { ok: false, message: "Nom établissement invalide." },
      400,
    );
  }

  const bridgeToken = generateBridgeToken();
  const [installationCodeHash, bridgeTokenHash] = await Promise.all([
    sha256Hex(installationCode),
    sha256Hex(bridgeToken),
  ]);

  try {
    const created = await callServerRpc("bootstrap_installation_campmanager_v4", {
      p_installation_code_hash: installationCodeHash,
      p_bridge_token_hash: bridgeTokenHash,
      p_code: code,
      p_nom: name,
      p_timezone: timezone,
    });

    return jsonResponse({
      ...created,
      bridgeToken,
      bridgeVersion: VERSION,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ ok: false, message }, 400);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return jsonResponse({
      ok: true,
      service: "campmanager-v4-bridge",
      version: VERSION,
      installationBootstrap: true,
      tenantBoundTokens: true,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Méthode non autorisée." }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_) {
    return jsonResponse({ ok: false, message: "JSON invalide." }, 400);
  }

  if (String(body.action || "") === "bootstrap") {
    return bootstrapInstallation(body);
  }

  const token = (req.headers.get("x-campmanager-token") || "").trim();

  let auth: Record<string, unknown>;
  try {
    auth = await authenticateBridgeToken(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = token ? 403 : 401;
    return jsonResponse({ ok: false, message }, status);
  }

  const requestedRpc = String(body.rpc || "").trim();

  if (requestedRpc === "ping_campmanager_bridge_v4") {
    return jsonResponse({
      ok: true,
      service: "campmanager-v4-bridge",
      version: VERSION,
      authenticated: true,
      campingCode: auth.campingCode,
      campingNom: auth.campingNom,
      timezone: auth.timezone,
    });
  }

  const rpc = LEGACY_RPC_MAP[requestedRpc] || requestedRpc;

  if (!ALLOWED_RPCS.has(rpc)) {
    return jsonResponse({ ok: false, message: "RPC non autorisé." }, 403);
  }

  const params =
    body.params && typeof body.params === "object"
      ? { ...(body.params as Record<string, unknown>) }
      : {};

  if (CAMPING_SCOPED_RPCS.has(rpc)) {
    params.p_camping_code = auth.campingCode;
  }

  try {
    const result = await callServerRpc(rpc, params);
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ ok: false, message }, 500);
  }
});
