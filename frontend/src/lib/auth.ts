/**
 * Keycloak PKCE auth helpers.
 *
 * Keycloak-js is initialized once as a singleton and re-used across the app.
 * In SSR (Next.js), Keycloak must only be initialized client-side.
 */

import type Keycloak from "keycloak-js";

let _keycloak: Keycloak | null = null;

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
  const kc = await getKeycloak();
  return kc.init({
    onLoad: "check-sso",
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    pkceMethod: "S256",
  });
}

export async function login(): Promise<void> {
  const kc = await getKeycloak();
  await kc.login({ redirectUri: `${window.location.origin}/dashboard` });
}

export async function logout(): Promise<void> {
  const kc = await getKeycloak();
  await kc.logout({ redirectUri: window.location.origin });
}

export async function getAccessToken(): Promise<string | null> {
  const kc = await getKeycloak();
  try {
    await kc.updateToken(30); // refresh if expiring within 30s
    return kc.token ?? null;
  } catch {
    return null;
  }
}
