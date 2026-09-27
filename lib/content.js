// Build-time content loading for Eleventy's global data files.
// Each loader runs at most once per build process (memoized), so Airtable is hit
// once per table no matter how many templates use the data.

import { TABLES, airtableConfigured, getBaseSchema, listRecords } from "./airtable.js";
import { cleanList, cleanText, isHttpUrl, slugify } from "./util.js";
import { sampleOfferRecords, sampleSymptomRecords } from "./sample-data.js";

// Only these fields are requested from Airtable. "Commission Note" is deliberately
// excluded so it can never leak into the generated HTML.
const OFFER_FIELDS = ["Title", "Blurb", "Affiliate URL", "Symptom Tag", "Image URL", "Badge", "Order"];
const SYMPTOM_FIELDS = ["Symptom Name", "Slug", "Intro Copy", "Related Tags"];

const cache = new Map();
function memo(key, load) {
  if (!cache.has(key)) {
    cache.set(
      key,
      load().catch((error) => {
        cache.delete(key);
        throw error;
      }),
    );
  }
  return cache.get(key);
}

let warnedAboutSampleData = false;
function useSampleData() {
  if (airtableConfigured()) return false;
  if (process.env.CONTEXT === "production") {
    throw new Error("AIRTABLE_API_KEY / AIRTABLE_BASE_ID are not set for this production build.");
  }
  if (!warnedAboutSampleData) {
    console.warn("[airtable] AIRTABLE_API_KEY / AIRTABLE_BASE_ID not set — building with sample data.");
    warnedAboutSampleData = true;
  }
  return true;
}

function toOffer({ id, fields: f }) {
  return {
    id,
    title: cleanText(f.Title, 200),
    blurb: cleanText(f.Blurb),
    affiliateUrl: isHttpUrl(f["Affiliate URL"]) ? f["Affiliate URL"].trim() : "",
    imageUrl: isHttpUrl(f["Image URL"]) ? f["Image URL"].trim() : "",
    symptomTags: cleanList(f["Symptom Tag"]),
    badge: cleanText(f.Badge, 60),
    order: Number.isFinite(f.Order) ? f.Order : null,
  };
}

function toSymptom({ id, fields: f }) {
  const name = cleanText(f["Symptom Name"], 200);
  return {
    id,
    name,
    slug: slugify(f.Slug || name),
    intro: cleanText(f["Intro Copy"]),
    relatedTags: cleanList(f["Related Tags"]),
  };
}

const byOrder = (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.title.localeCompare(b.title);

export function getOffers() {
  return memo("offers", async () => {
    const records = useSampleData()
      ? sampleOfferRecords
      : await listRecords(TABLES.offers, {
          fields: OFFER_FIELDS,
          filterByFormula: "{Status} = 'Published'",
          sort: [{ field: "Order", direction: "asc" }],
        });

    const offers = records.map(toOffer).filter((offer) => {
      if (offer.title && offer.affiliateUrl) return true;
      console.warn(`[airtable] Skipping offer ${offer.id}: missing Title or a valid Affiliate URL.`);
      return false;
    });
    return offers.sort(byOrder);
  });
}

export function getSymptoms() {
  return memo("symptoms", async () => {
    const records = useSampleData()
      ? sampleSymptomRecords
      : await listRecords(TABLES.symptoms, { fields: SYMPTOM_FIELDS });

    const seen = new Set();
    return records
      .map(toSymptom)
      .filter((symptom) => {
        if (!symptom.name || !symptom.slug) return false;
        if (seen.has(symptom.slug)) {
          console.warn(`[airtable] Duplicate symptom slug "${symptom.slug}" — skipping ${symptom.id}.`);
          return false;
        }
        seen.add(symptom.slug);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

// Case-insensitive de-duplication (first spelling wins), sorted alphabetically.
function uniqueSorted(values) {
  const byKey = new Map();
  for (const value of values) {
    const key = value.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, value);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * Choices for the admin "add offer" form. Read from the Airtable schema when the token
 * has schema.bases:read; otherwise derived from existing content.
 *
 * Symptom tags always include every symptom's Related Tags, so adding a symptom row in
 * Airtable is enough to get its checkbox. If that tag isn't yet an option on the Offers
 * "Symptom Tag" field, add-offer's typecast creates it when an offer first uses it.
 */
export function getOfferSchema() {
  return memo("offerSchema", async () => {
    const schema = { statuses: ["Draft", "Published"], symptomTags: null, badges: null };

    if (!useSampleData()) {
      try {
        const { tables } = await getBaseSchema();
        const offersTable = tables.find((t) => t.name === TABLES.offers);
        const choices = (name) =>
          offersTable?.fields.find((f) => f.name === name)?.options?.choices?.map((c) => c.name) ?? null;
        schema.symptomTags = choices("Symptom Tag");
        schema.badges = choices("Badge");
        schema.statuses = choices("Status") ?? schema.statuses;
      } catch (error) {
        console.warn(`[airtable] Could not read base schema (${error.message}). Deriving admin choices from content.`);
      }
    }

    const [offers, symptoms] = await Promise.all([getOffers(), getSymptoms()]);
    schema.symptomTags = uniqueSorted([
      ...(schema.symptomTags ?? offers.flatMap((o) => o.symptomTags)),
      ...symptoms.flatMap((s) => s.relatedTags),
    ]);
    schema.badges ??= uniqueSorted(offers.map((o) => o.badge).filter(Boolean));
    return schema;
  });
}
