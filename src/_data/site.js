// Site-wide settings. Placeholder values: edit before launch.
export default {
  name: "Menopause Wellness",
  description:
    "Calm, plain-language guidance and carefully chosen products for women navigating perimenopause and menopause.",
  url: (process.env.URL || "http://localhost:8080").replace(/\/$/, ""),
  contactEmail: "hello@example.com",
  year: new Date().getFullYear(),
};
