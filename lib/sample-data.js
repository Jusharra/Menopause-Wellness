// Placeholder content used ONLY when Airtable env vars are missing on a non-production
// build, so `npm run build` works on a fresh clone. Shaped like Airtable API records.

export const sampleSymptomRecords = [
  {
    id: "recSampleSymptom1",
    fields: {
      "Symptom Name": "Hot Flashes & Night Sweats",
      Slug: "hot-flashes",
      "Intro Copy":
        "Sudden waves of heat are one of the most common signs of perimenopause.\n\nThis page will hold a plain-language introduction to what may help. Placeholder copy: replace it in Airtable.",
      "Related Tags": ["Hot Flashes", "Sleep"],
    },
  },
  {
    id: "recSampleSymptom2",
    fields: {
      "Symptom Name": "Sleep Trouble",
      Slug: "sleep",
      "Intro Copy": "Waking at 3 a.m. again? Placeholder introduction about midlife sleep changes.",
      "Related Tags": ["Sleep"],
    },
  },
  {
    id: "recSampleSymptom3",
    fields: {
      "Symptom Name": "Brain Fog",
      Slug: "brain-fog",
      "Intro Copy": "Placeholder introduction about focus and memory changes during the menopause transition.",
      "Related Tags": ["Brain Fog", "Energy"],
    },
  },
  {
    id: "recSampleSymptom4",
    fields: {
      "Symptom Name": "Mood Changes",
      Slug: "mood",
      "Intro Copy": "Placeholder introduction about mood, anxiety and irritability in midlife.",
      "Related Tags": ["Mood"],
    },
  },
  {
    id: "recSampleSymptom5",
    fields: {
      "Symptom Name": "Joint Aches",
      Slug: "joint-aches",
      "Intro Copy": "Placeholder introduction about stiffness and joint discomfort.",
      "Related Tags": ["Joints"],
    },
  },
];

const sampleOffers = [
  ["Cooling Sleep Set", "Moisture-wicking pajamas designed for warm sleepers. Placeholder blurb.", ["Hot Flashes", "Sleep"], "Editor's Pick"],
  ["Magnesium Glycinate", "A gentle form of magnesium many women use as part of a wind-down routine. Placeholder blurb.", ["Sleep", "Mood"], "Best Value"],
  ["Menopause Support Supplement", "A daily blend formulated for the menopause transition. Placeholder blurb.", ["Hot Flashes", "Mood", "Energy"], ""],
  ["Portable Neck Fan", "Quiet, rechargeable and small enough for a handbag. Placeholder blurb.", ["Hot Flashes"], "New"],
  ["Guided Focus App", "Short daily exercises for focus and calm. Placeholder blurb.", ["Brain Fog", "Mood"], ""],
  ["Collagen + Joint Blend", "A daily powder aimed at joint comfort. Placeholder blurb.", ["Joints"], ""],
];

export const sampleOfferRecords = sampleOffers.map(([title, blurb, tags, badge], i) => ({
  id: `recSampleOffer00${i + 1}`,
  fields: {
    Title: title,
    Blurb: blurb,
    "Affiliate URL": `https://example.com/offer-${i + 1}`,
    "Symptom Tag": tags,
    Badge: badge || undefined,
    Order: (i + 1) * 10,
  },
}));
