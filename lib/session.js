// Stateless, HMAC-signed admin session tokens.
// Uses only Web Crypto so it runs in both Netlify Functions (Node) and Edge Functions (Deno).
// Token format: "v1.<expiresAtUnixSeconds>.<base64url HMAC-SHA256 of 'v1.<expiresAt>'>"

export const COOKIE_NAME = "mw_admin";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const MIN_SECRET_LENGTH = 32;

const encoder = new TextEncoder();

function importKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function toBase64Url(buffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function createSessionToken(secret, now = Date.now()) {
  const payload = `v1.${Math.floor(now / 1000) + SESSION_TTL_SECONDS}`;
  const signature = await crypto.subtle.sign("HMAC", await importKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(token, secret, now = Date.now()) {
  if (!token || !secret) return false;
  const [version, expiresAt, signature, ...rest] = token.split(".");
  if (version !== "v1" || rest.length || !/^\d+$/.test(expiresAt ?? "") || !signature) return false;
  if (Number(expiresAt) * 1000 < now) return false;
  try {
    // crypto.subtle.verify performs a constant-time comparison.
    return await crypto.subtle.verify(
      "HMAC",
      await importKey(secret),
      fromBase64Url(signature),
      encoder.encode(`v1.${expiresAt}`),
    );
  } catch {
    return false;
  }
}

/** Constant-time password check: verify the submitted password against an HMAC of the real one. */
export async function passwordMatches(submitted, expected, secret) {
  const key = await importKey(secret);
  const expectedMac = await crypto.subtle.sign("HMAC", key, encoder.encode(expected));
  return crypto.subtle.verify("HMAC", key, expectedMac, encoder.encode(submitted));
}

export function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearedSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
