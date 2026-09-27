// Runs on Netlify's edge BEFORE the static /admin/dashboard/ page is served.
// Without a valid signed session cookie the visitor is redirected to the login page,
// so the dashboard HTML is never delivered to unauthenticated users.
import { COOKIE_NAME, MIN_SECRET_LENGTH, readCookie, verifySessionToken } from "../../lib/session.js";

export default async (request, context) => {
  const secret = Netlify.env.get("SESSION_SECRET");
  const valid =
    secret && secret.length >= MIN_SECRET_LENGTH && (await verifySessionToken(readCookie(request, COOKIE_NAME), secret));

  if (!valid) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/admin/", "Cache-Control": "no-store" },
    });
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, headers });
};

export const config = { path: ["/admin/dashboard", "/admin/dashboard/*"] };
