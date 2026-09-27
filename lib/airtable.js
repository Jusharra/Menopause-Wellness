// Minimal Airtable REST client (https://airtable.com/developers/web/api).
// Used at build time by Eleventy and at runtime by the Netlify Functions.
// Server-side only: it reads AIRTABLE_API_KEY from the environment.

const API_ROOT = "https://api.airtable.com/v0";

export const TABLES = { offers: "Offers", symptoms: "Symptoms", leads: "Leads" };

export function airtableConfigured() {
  return Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
}

async function request(path, { method = "GET", body } = {}) {
  const { AIRTABLE_API_KEY: apiKey } = process.env;
  if (!airtableConfigured()) throw new Error("AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set.");

  const res = await fetch(`${API_ROOT}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    const error = new Error(`Airtable ${method} ${path.split("?")[0]} failed (${res.status}): ${detail}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

function tablePath(table, recordId) {
  const base = `${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`;
  return recordId ? `${base}/${recordId}` : base;
}

/** Fetch every record in a table, following Airtable's pagination. */
export async function listRecords(table, { fields, filterByFormula, sort } = {}) {
  const records = [];
  let offset;
  do {
    const query = new URLSearchParams({ pageSize: "100" });
    fields?.forEach((field) => query.append("fields[]", field));
    if (filterByFormula) query.set("filterByFormula", filterByFormula);
    sort?.forEach(({ field, direction = "asc" }, i) => {
      query.set(`sort[${i}][field]`, field);
      query.set(`sort[${i}][direction]`, direction);
    });
    if (offset) query.set("offset", offset);

    const page = await request(`${tablePath(table)}?${query}`);
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records;
}

// typecast lets Airtable map strings onto select options (and add new options if needed).
export const createRecord = (table, fields) =>
  request(tablePath(table), { method: "POST", body: { fields, typecast: true } });

export const updateRecord = (table, id, fields) =>
  request(tablePath(table, id), { method: "PATCH", body: { fields, typecast: true } });

export const deleteRecord = (table, id) => request(tablePath(table, id), { method: "DELETE" });

/** Table/field schema — requires the token scope schema.bases:read. */
export const getBaseSchema = () => request(`meta/bases/${process.env.AIRTABLE_BASE_ID}/tables`);
