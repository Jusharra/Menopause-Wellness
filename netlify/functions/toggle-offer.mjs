// POST /.netlify/functions/toggle-offer  { id, status: "Draft" | "Published" }
import { TABLES, updateRecord } from "../../lib/airtable.js";
import { RECORD_ID, STATUSES, airtableFailure, json, readJson, rejectUnlessAdmin, triggerRebuild } from "../../lib/admin-api.js";

export default async (req) => {
  const rejection = await rejectUnlessAdmin(req);
  if (rejection) return rejection;

  const body = await readJson(req);
  if (!body || !RECORD_ID.test(body.id ?? "") || !STATUSES.includes(body.status)) {
    return json(400, { error: "Expected { id, status: 'Draft' | 'Published' }." });
  }

  try {
    await updateRecord(TABLES.offers, body.id, { Status: body.status });
  } catch (error) {
    return airtableFailure(error);
  }

  const rebuild = await triggerRebuild(`set ${body.id} to ${body.status}`);
  return json(200, { id: body.id, status: body.status, rebuild });
};
