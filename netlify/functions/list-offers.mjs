// GET /.netlify/functions/list-offers — all offers (Draft + Published) for the dashboard.
import { TABLES, listRecords } from "../../lib/airtable.js";
import { airtableFailure, json, rejectUnlessAdmin } from "../../lib/admin-api.js";

// "Commission Note" is intentionally not requested.
const FIELDS = ["Title", "Status", "Order", "Badge", "Symptom Tag"];

export default async (req) => {
  const rejection = await rejectUnlessAdmin(req, "GET");
  if (rejection) return rejection;

  try {
    const records = await listRecords(TABLES.offers, { fields: FIELDS, sort: [{ field: "Order", direction: "asc" }] });
    const offers = records.map(({ id, fields: f }) => ({
      id,
      title: f.Title ?? "",
      status: f.Status ?? "Draft",
      order: f.Order ?? null,
      badge: f.Badge ?? "",
      symptomTags: f["Symptom Tag"] ?? [],
    }));
    return json(200, { offers });
  } catch (error) {
    return airtableFailure(error);
  }
};
