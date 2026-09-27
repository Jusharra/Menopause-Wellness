// Event-triggered function: Netlify runs it automatically for every verified Netlify Forms
// submission (the file name "submission-created" is what wires it up). It copies
// email-capture leads into the Airtable "Leads" table. Submissions are still stored in
// Netlify Forms even if this fails.
import { TABLES, airtableConfigured, createRecord } from "../../lib/airtable.js";
import { cleanText } from "../../lib/util.js";

export default async (req) => {
  let payload;
  try {
    ({ payload } = await req.json());
  } catch {
    return new Response("Bad payload", { status: 400 });
  }
  if (payload?.form_name !== "email-capture") return new Response("Ignored");

  const data = payload.data ?? {};
  const email = cleanText(data.email, 254);
  if (!email) return new Response("No email", { status: 400 });
  if (!airtableConfigured()) {
    console.warn("Airtable env vars missing; lead not copied to Airtable.");
    return new Response("Airtable not configured");
  }

  try {
    await createRecord(TABLES.leads, {
      Email: email,
      "Source Page": cleanText(data.source_page, 300),
      "Symptom Interest": cleanText(data.symptom_interest, 200) || undefined,
      "Date Captured": payload.created_at || new Date().toISOString(),
    });
  } catch (error) {
    console.error("Could not save lead to Airtable:", error.message);
    return new Response("Airtable error", { status: 502 });
  }
  return new Response("OK");
};
