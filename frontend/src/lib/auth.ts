/**
 * Keycloak PKCE auth helpers.
 *
 * Keycloak-js is initialized once as a singleton and re-used across the app.
 * In SSR (Next.js), Keycloak must only be initialized client-side.
 */

import type Keycloak from "keycloak-js";

let _keycloak: Keycloak | null = null;
let _initPromise: Promise<boolean> | null = null;
let _isInitialized = false;

function isInitialized(kc: Keycloak): boolean {
  return _isInitialized || Boolean((kc as unknown as { didInitialize?: boolean }).didInitialize);
}

export async function getKeycloak(): Promise<Keycloak> {
  if (typeof window === "undefined") {
    throw new Error("Keycloak can only be used in the browser");
  }

  if (_keycloak) return _keycloak;

  const KeycloakLib = (await import("keycloak-js")).default;

  _keycloak = new KeycloakLib({
    url: process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "http://localhost:8080",
    realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? "platform",
    clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "frontend-app",
  });

  return _keycloak;
}

export async function initKeycloak(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (_initPromise) return _initPromise;

  const kc = await getKeycloak();
  _initPromise = kc
    .init({
      onLoad: "check-sso",
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      pkceMethod: "S256",
      checkLoginIframe: false,
    })
    .then((authenticated) => {
      _isInitialized = true;
      return authenticated;
    })
    .catch((err) => {
      _initPromise = null;
      throw err;
    });

  return _initPromise;
}

export async function login(): Promise<void> {
  const kc = await getKeycloak();
  if (!isInitialized(kc)) {
    try {
      await initKeycloak();
    } catch {
      if (!isInitialized(kc)) {
        await kc.init({
          pkceMethod: "S256",
          checkLoginIframe: false,
        });
        _isInitialized = true;
      }
    }
  }
  await kc.login({ redirectUri: `${window.location.origin}/dashboard` });
}

export async function logout(): Promise<void> {
  const kc = await getKeycloak();
  if (!isInitialized(kc)) {
    try {
      await initKeycloak();
    } catch {
      // ignore
    }
  }
  await kc.logout({ redirectUri: `${window.location.origin}/auth/login` });
}

export async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const kc = await getKeycloak();
  if (!isInitialized(kc)) {
    try {
      await initKeycloak();
    } catch {
      return null;
    }
  }
  try {
    await kc.updateToken(30); // refresh if expiring within 30s
    return kc.token ?? null;
  } catch {
    return null;
  }
}
