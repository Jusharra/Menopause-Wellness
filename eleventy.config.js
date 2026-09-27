// Load a local .env file if present (Node >= 20.12). On Netlify, env vars come from the dashboard.
try {
  process.loadEnvFile();
} catch {
  // No .env file: fine.
}

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Netlify Image CDN resizes/compresses remote images and serves AVIF/WebP when supported.
// It only exists on Netlify, so local builds use the original URL.
const useImageCdn = process.env.NETLIFY === "true";
const imageUrl = (src, width) =>
  useImageCdn ? `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}&q=75` : src;

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  /** Plain Airtable long text -> escaped HTML paragraphs. */
  eleventyConfig.addFilter("paragraphs", (text) =>
    String(text ?? "")
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("\n"),
  );

  /** Offers whose Symptom Tag overlaps the given Related Tags (case-insensitive). */
  eleventyConfig.addFilter("offersForTags", (offers, tags) => {
    const wanted = new Set((tags || []).map((t) => t.toLowerCase()));
    return (offers || []).filter((offer) => offer.symptomTags.some((t) => wanted.has(t.toLowerCase())));
  });

  eleventyConfig.addFilter("imgSrc", (src, width = 800) => imageUrl(src, width));
  eleventyConfig.addFilter("imgSrcset", (src, widths = [400, 640, 960]) =>
    useImageCdn ? widths.map((w) => `${imageUrl(src, w)} ${w}w`).join(", ") : "",
  );

  eleventyConfig.addFilter("isoDate", (date) => new Date(date).toISOString().slice(0, 10));

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
