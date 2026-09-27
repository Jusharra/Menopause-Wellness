// Site-wide settings.
export default {
  name: "MenoWellness",
  description:
    "Straightforward guidance and thoughtfully chosen products for women navigating perimenopause and menopause.",
  url: (process.env.URL || "http://localhost:8080").replace(/\/$/, ""),
  contactEmail: "sistacoinx@gmail.com",
  year: new Date().getFullYear(),
};
