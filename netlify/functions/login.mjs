// POST /.netlify/functions/login  (form field: password)
// On success: sets a signed, httpOnly session cookie and redirects to the dashboard.
import { createSessionToken, passwordMatches, sessionCookie } from "../../lib/session.js";
import { sessionSecret } from "../../lib/admin-api.js";

const redirect = (location, headers = {}) =>
  new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store", ...headers } });

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });

  const expected = process.env.ADMIN_PASSWORD;
  const secret = sessionSecret();
  if (!expected || !secret) {
    console.error("ADMIN_PASSWORD and SESSION_SECRET (32+ chars) must be set.");
    return new Response("Admin login is not configured.", { status: 500 });
  }

  let submitted = "";
  try {
    submitted = String((await req.formData()).get("password") ?? "");
  } catch {
    // Malformed body: treated as a wrong password.
  }

  if (!submitted || !(await passwordMatches(submitted, expected, secret))) {
    await new Promise((resolve) => setTimeout(resolve, 750)); // slow down guessing
    return redirect("/admin/?error=1");
  }

  return redirect("/admin/dashboard/", { "Set-Cookie": sessionCookie(await createSessionToken(secret)) });
};
