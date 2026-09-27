// Small helpers shared by the build (Eleventy) and the Netlify Functions.

export function cleanText(value, maxLength = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function cleanList(value) {
  return Array.isArray(value) ? value.map((v) => cleanText(v, 200)).filter(Boolean) : [];
}

// Only http(s) URLs are ever rendered into href/src attributes (blocks javascript: etc).
export function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value.trim());
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
