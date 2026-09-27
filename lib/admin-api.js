// Helpers shared by the admin Netlify Functions.
import { COOKIE_NAME, MIN_SECRET_LENGTH, readCookie, verifySessionToken } from "./session.js";

export const STATUSES = ["Draft", "Published"];
export const RECORD_ID = /^rec[A-Za-z0-9]{14}$/;

export function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

/**
 * Returns an error Response if the request is not an authenticated admin call, else null.
 * Mutations must be JSON: combined with the SameSite=Strict cookie this blocks CSRF, since
 * a cross-site HTML form cannot send application/json.
 */
export async function rejectUnlessAdmin(req, method = "POST") {
  if (req.method !== method) return json(405, { error: "Method not allowed" });
  if (method !== "GET" && !(req.headers.get("content-type") || "").startsWith("application/json")) {
    return json(415, { error: "Expected a JSON request body" });
  }
  const secret = sessionSecret();
  if (!secret) return json(500, { error: "SESSION_SECRET is missing or shorter than 32 characters" });
  if (!(await verifySessionToken(readCookie(req, COOKIE_NAME), secret))) {
    return json(401, { error: "Not signed in" });
  }
  return null;
}

export async function readJson(req) {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export function airtableFailure(error) {
  console.error(error);
  const status = error.status === 404 || error.status === 422 ? error.status : 502;
  return json(status, { error: `Airtable request failed${error.status ? ` (${error.status})` : ""}. See function logs.` });
}

/** POST the Netlify build hook so the static site regenerates. Returns true on success. */
export async function triggerRebuild(reason) {
  const hook = process.env.NETLIFY_BUILD_HOOK_URL;
  if (!hook) {
    console.warn("NETLIFY_BUILD_HOOK_URL is not set; skipping rebuild.");
    return false;
  }
  try {
    const url = new URL(hook);
    url.searchParams.set("trigger_title", `Admin: ${reason}`.slice(0, 120));
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) console.error(`Build hook responded ${res.status}`);
    return res.ok;
  } catch (error) {
    console.error("Build hook failed:", error);
    return false;
  }
}
