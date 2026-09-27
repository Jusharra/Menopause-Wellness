// POST /.netlify/functions/delete-offer  { id }
import { TABLES, deleteRecord } from "../../lib/airtable.js";
import { RECORD_ID, airtableFailure, json, readJson, rejectUnlessAdmin, triggerRebuild } from "../../lib/admin-api.js";

export default async (req) => {
  const rejection = await rejectUnlessAdmin(req);
  if (rejection) return rejection;

  const body = await readJson(req);
  if (!body || !RECORD_ID.test(body.id ?? "")) return json(400, { error: "Expected { id }." });

  try {
    await deleteRecord(TABLES.offers, body.id);
  } catch (error) {
    return airtableFailure(error);
  }

  const rebuild = await triggerRebuild(`deleted ${body.id}`);
  return json(200, { id: body.id, deleted: true, rebuild });
};
