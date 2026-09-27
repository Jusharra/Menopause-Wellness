// POST /.netlify/functions/add-offer — creates an Offers record, then rebuilds the site.
import { TABLES, createRecord } from "../../lib/airtable.js";
import { STATUSES, airtableFailure, json, readJson, rejectUnlessAdmin, triggerRebuild } from "../../lib/admin-api.js";
import { cleanList, cleanText, isHttpUrl } from "../../lib/util.js";

function validate(body) {
  const errors = [];
  const title = cleanText(body.title, 200);
  const affiliateUrl = cleanText(body.affiliateUrl, 2000);
  const imageUrl = cleanText(body.imageUrl, 2000);
  const status = STATUSES.includes(body.status) ? body.status : "Draft";
  const orderInput = body.order == null ? "" : String(body.order).trim();
  const order = orderInput === "" ? null : Number(orderInput);

  if (!title) errors.push("Title is required.");
  if (!isHttpUrl(affiliateUrl)) errors.push("Affiliate URL must be a valid http(s) URL.");
  if (imageUrl && !isHttpUrl(imageUrl)) errors.push("Image URL must be a valid http(s) URL.");
  if (order !== null && !Number.isFinite(order)) errors.push("Order must be a number.");

  const fields = {
    Title: title,
    Blurb: cleanText(body.blurb, 2000),
    "Affiliate URL": affiliateUrl,
    "Symptom Tag": cleanList(body.symptomTags).slice(0, 30),
    Status: status,
  };
  if (imageUrl) fields["Image URL"] = imageUrl;
  const badge = cleanText(body.badge, 100);
  if (badge) fields.Badge = badge;
  if (order !== null) fields.Order = order;

  return { errors, fields };
}

export default async (req) => {
  const rejection = await rejectUnlessAdmin(req);
  if (rejection) return rejection;

  const body = await readJson(req);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const { errors, fields } = validate(body);
  if (errors.length) return json(400, { error: errors.join(" ") });

  let record;
  try {
    record = await createRecord(TABLES.offers, fields);
  } catch (error) {
    return airtableFailure(error);
  }

  // Drafts don't appear on the site, so only published offers need a rebuild.
  const rebuild = fields.Status === "Published" ? await triggerRebuild(`added "${fields.Title}"`) : false;
  return json(201, { id: record.id, status: fields.Status, rebuild });
};
