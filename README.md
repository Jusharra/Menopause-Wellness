# Menopause Wellness: static affiliate site

A fast static site built with [Eleventy](https://www.11ty.dev/). Content comes from Airtable and is pulled in **at build time**. It's hosted on Netlify, with Netlify Forms for email capture and a small password-protected admin panel built on Netlify Functions.

No front-end framework and no CSS build step. The only npm dependency is `@11ty/eleventy`.

```
src/                     Eleventy input
  _data/                 Global data: offers.js, symptoms.js, offerSchema.js (Airtable), site.js
  _includes/             Layout, partials, CSS (inlined into each page)
  index.njk              Home page
  symptom.njk            One page per Symptoms row -> /symptoms/<slug>/
  disclosure.njk         /disclosure/
  admin/                 /admin/ (login) and /admin/dashboard/
  assets/                favicon, admin.js
lib/                     Server-side code shared by the build and the functions
  airtable.js            Minimal Airtable REST client
  content.js             Build-time loaders (memoized, one API pass per build)
  session.js             HMAC-signed session tokens (Web Crypto)
  admin-api.js           Auth check, JSON helpers, build-hook trigger
netlify/functions/       login, logout, list-offers, add-offer, toggle-offer, delete-offer, submission-created
netlify/edge-functions/  admin-guard.js: blocks /admin/dashboard/ without a valid session
```

## Environment variables

| Variable | Used by | What it is |
| --- | --- | --- |
| `AIRTABLE_API_KEY` | build + functions | Airtable **Personal Access Token**. Required scopes: `data.records:read`, `data.records:write`, `schema.bases:read`. Access: this base only. |
| `AIRTABLE_BASE_ID` | build + functions | `appPIg51oYqortKZJ` |
| `ADMIN_PASSWORD` | `login` function | Password for `/admin/`. Use a long, unique one. |
| `SESSION_SECRET` | functions + edge function | Random string of **at least 32 characters** used to sign the session cookie. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NETLIFY_BUILD_HOOK_URL` | admin functions | Build hook URL; see "How publishing works" below. |

None of these are hardcoded. `.env.example` lists the names. Copy it to `.env` for local work. `.env` is git-ignored.

### Setting them in Netlify

1. Netlify dashboard → your site → **Site configuration → Environment variables → Add a variable**.
2. Add each variable above. Scopes: leave **Builds, Functions and Runtime** checked. The build needs the Airtable vars, the functions need all of them, and the edge function needs `SESSION_SECRET`.
3. Mark `AIRTABLE_API_KEY`, `ADMIN_PASSWORD` and `SESSION_SECRET` as **secret** values if your plan offers it.
4. Trigger a new deploy (**Deploys → Trigger deploy**) so the build picks them up.

To sign out every admin session, change `SESSION_SECRET` and redeploy.

## Airtable setup

The site expects these tables and field names, spelled exactly as shown:

- **Offers**: Title, Blurb, Affiliate URL, Symptom Tag (multi-select), Image URL, Badge (single select), Status (single select: `Draft` / `Published`), Order (number), Commission Note
- **Symptoms**: Symptom Name, Slug, Intro Copy, Related Tags (multi-select)
- **Leads**: Email, Source Page, Symptom Interest, Date Captured

Notes:
- The build only **requests** the public Offer fields. `Commission Note` is never fetched, so it can't end up in the HTML. The admin list skips it too.
- Only offers with `Status = Published` appear on the site. They're sorted by `Order`, and offers with no Order go last.
- A symptom page shows every published offer whose **Symptom Tag** shares at least one value with the symptom's **Related Tags**. The match ignores case. Use the same tag names in both fields.
- If `Slug` is empty, it's generated from the Symptom Name.
- The admin form's tag and badge choices come from the Airtable field definitions, which needs `schema.bases:read`. Without that scope, the choices are pieced together from existing content.

## How publishing works (Airtable → build hook → live site)

The site is static. Airtable data is read **only during a build**, so a change in Airtable shows up on the site after the next deploy.

1. Create a build hook: Netlify → **Site configuration → Build & deploy → Continuous deployment → Build hooks → Add build hook** (name it "Airtable/Admin", branch `main`). Copy the URL.
2. Save it as `NETLIFY_BUILD_HOOK_URL`.
3. The admin panel triggers it on its own:
   - **add-offer** creates the record, then rebuilds if the offer is `Published`. Drafts don't show on the site, so they don't trigger a rebuild.
   - **toggle-offer** (Publish/Unpublish) and **delete-offer** update Airtable, then always rebuild.
   - A build takes about a minute, then the change is live.
4. **Edits made directly in Airtable** also need a rebuild. You can:
   - click **Trigger deploy** in Netlify, or
   - add an Airtable Automation: trigger "When a record is updated" (or a scheduled time) → action **Run a script** that runs `await fetch("<your build hook URL>", { method: "POST" })`, or
   - use a scheduled rebuild (e.g. a Zapier/Make timer that POSTs to the hook).

## Email capture (Netlify Forms)

- The `email-capture` form appears on the home page and on every symptom page. It has `data-netlify="true"`, a hidden `form-name` input, and a honeypot field.
- Hidden fields: `source_page` (the page path, filled in at build time) and `symptom_interest` (the symptom name on symptom pages).
- **Turn on form detection:** Netlify → **Forms → Enable form detection**, then redeploy. Submissions show up under **Forms**. After submitting, visitors land on `/thanks/`.
- **Copying leads to Airtable:** `netlify/functions/submission-created.mjs` runs automatically for each verified submission and adds a row to **Leads** (Email, Source Page, Symptom Interest, Date Captured). If it fails, the submission is still kept in Netlify Forms. Check the function log for errors.

## Admin panel

- `/admin/`: the password form posts to `/.netlify/functions/login`. The password is checked against `ADMIN_PASSWORD` with a constant-time comparison, and each wrong attempt adds a 750 ms delay. A correct password sets an `HttpOnly; Secure; SameSite=Strict` cookie. The cookie holds an HMAC-SHA256-signed expiry, is signed with `SESSION_SECRET`, and lasts 8 hours.
- `/admin/dashboard/` is protected **on the server** by `netlify/edge-functions/admin-guard.js`. That edge function runs before the page is served. Without a valid cookie it redirects to `/admin/`, so the page never reaches a signed-out visitor.
- Each dashboard action calls a function (`list-offers`, `add-offer`, `toggle-offer`, `delete-offer`). Every function checks the session cookie again and accepts only `application/json` requests, which blocks CSRF together with `SameSite=Strict`. It then calls the Airtable API and triggers the build hook.
- Deleting in the dashboard deletes the Airtable record. Airtable keeps deleted records in the base trash for a limited time.
- Optional hardening: add a [Netlify rate-limit rule](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/) for `/.netlify/functions/login`.

## Local development

Requires Node 20.12+ (Netlify builds with Node 22).

```bash
npm install
npm run build        # outputs to _site/
npm run dev          # Eleventy dev server at http://localhost:8080 (static pages only)
```

- **Without a `.env`**, the build uses placeholder sample data from `lib/sample-data.js`, so the site works on a fresh clone. This never happens in Netlify **production** builds: there, missing Airtable vars fail the build instead of deploying sample data.
- **With a `.env`** (copied from `.env.example`), the build pulls live Airtable data. Airtable is read once when the dev server starts, so restart `npm run dev` to pick up Airtable changes.
- **To test the admin panel, functions and edge function locally**, use the Netlify CLI. It reads `.env`, runs Eleventy, and serves everything at http://localhost:8888:

  ```bash
  npx netlify-cli dev
  ```

  Netlify Forms submissions are **not** processed locally. Test those on a deploy preview.

## Deploying

1. Push this repo to GitHub.
2. Netlify → **Add new site → Import an existing project** → pick the repo. `netlify.toml` already sets the build command (`npm run build`), the publish dir (`_site`), and the functions and edge-functions dirs.
3. Add the environment variables (above), enable form detection, create the build hook, and deploy.

## Images and performance

- CSS is inlined into each page, so there's no render-blocking stylesheet request. Fonts are system font stacks, so there are no web-font downloads. The public pages ship no JavaScript.
- On Netlify, offer images go through the **Netlify Image CDN** (`/.netlify/images`). They're resized to the card width and served as AVIF/WebP, with `srcset`, lazy-loading and fixed dimensions. `netlify.toml` allows any `https` image host: tighten `[images] remote_images` to the hosts you actually use.

## Before launch: placeholders to replace

- `src/_data/site.js`: site name, description, contact email
- `src/index.njk` front matter: hero copy and trust bar
- `src/_includes/partials/email-form.njk`: lead-magnet copy
- `src/_includes/partials/footer.njk`: About text
- `src/disclosure.njk`: review the legal language and add any program-specific statements (e.g. Amazon Associates)
