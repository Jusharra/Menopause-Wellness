// Admin dashboard: add offers, publish/unpublish and delete via Netlify Functions.
// All data is rendered with textContent (never innerHTML) to avoid XSS.
(() => {
  const FUNCTIONS = "/.netlify/functions";
  const form = document.getElementById("add-offer-form");
  const formStatus = document.getElementById("form-status");
  const list = document.getElementById("offer-list");
  const listStatus = document.getElementById("list-status");

  async function callFunction(name, body) {
    const res = await fetch(`${FUNCTIONS}/${name}`, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      location.href = "/admin/";
      throw new Error("Your session expired. Please sign in again.");
    }
    if (res.status === 404) {
      throw new Error("Admin functions not found. Locally, run `netlify dev` instead of `npm run dev`.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  function say(el, message, kind = "info") {
    el.textContent = message;
    el.dataset.kind = kind;
  }

  const rebuildNote = (data) =>
    data.rebuild ? " Site rebuild started; changes go live in about a minute." : "";

  function make(tag, props = {}, children = []) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  }

  function renderOffers(offers) {
    list.replaceChildren();
    say(listStatus, offers.length ? "" : "No offers yet.");

    for (const offer of offers) {
      const published = offer.status === "Published";
      const meta = [
        offer.order != null ? `Order ${offer.order}` : null,
        offer.badge || null,
        offer.symptomTags.join(", ") || null,
      ].filter(Boolean).join(" · ");

      const toggle = make("button", {
        type: "button",
        className: `btn btn-small${published ? " btn-ghost" : ""}`,
        textContent: published ? "Unpublish" : "Publish",
      });
      const remove = make("button", { type: "button", className: "btn btn-small btn-danger", textContent: "Delete" });

      toggle.addEventListener("click", () =>
        runAction([toggle, remove], "toggle-offer", { id: offer.id, status: published ? "Draft" : "Published" },
          `"${offer.title}" is now ${published ? "a draft" : "published"}.`),
      );
      remove.addEventListener("click", () => {
        if (!confirm(`Delete "${offer.title}"? This removes the record from Airtable.`)) return;
        runAction([toggle, remove], "delete-offer", { id: offer.id }, `"${offer.title}" deleted.`);
      });

      list.append(
        make("li", { className: "offer-row" }, [
          make("div", { className: "offer-info" }, [
            make("strong", { textContent: offer.title || "(untitled)" }),
            make("span", { className: `pill${published ? " pill-published" : ""}`, textContent: offer.status || "Draft" }),
            " ",
            make("span", { className: "offer-meta", textContent: meta }),
          ]),
          make("div", { className: "offer-actions" }, [toggle, remove]),
        ]),
      );
    }
  }

  async function loadOffers() {
    say(listStatus, "Loading…");
    try {
      const { offers } = await callFunction("list-offers");
      renderOffers(offers);
    } catch (error) {
      say(listStatus, error.message, "error");
    }
  }

  async function runAction(buttons, name, body, successMessage) {
    buttons.forEach((b) => (b.disabled = true));
    try {
      const data = await callFunction(name, body);
      const { offers } = await callFunction("list-offers");
      renderOffers(offers);
      say(listStatus, successMessage + rebuildNote(data), "success");
    } catch (error) {
      say(listStatus, error.message, "error");
      buttons.forEach((b) => (b.disabled = false));
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const payload = {
      title: fields.get("title"),
      blurb: fields.get("blurb"),
      affiliateUrl: fields.get("affiliateUrl"),
      imageUrl: fields.get("imageUrl"),
      symptomTags: fields.getAll("symptomTags"),
      badge: fields.get("badge"),
      status: fields.get("status"),
      order: fields.get("order"),
    };

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    say(formStatus, "Saving…");
    try {
      const data = await callFunction("add-offer", payload);
      form.reset();
      say(formStatus, `Offer added as ${data.status}.${rebuildNote(data)}`, "success");
      loadOffers();
    } catch (error) {
      say(formStatus, error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });

  document.getElementById("refresh-offers").addEventListener("click", loadOffers);
  loadOffers();
})();
