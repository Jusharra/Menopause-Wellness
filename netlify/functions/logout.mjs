// POST /.netlify/functions/logout — clears the session cookie.
import { clearedSessionCookie } from "../../lib/session.js";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  return new Response(null, {
    status: 303,
    headers: { Location: "/admin/", "Set-Cookie": clearedSessionCookie(), "Cache-Control": "no-store" },
  });
};
