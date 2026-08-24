// Works in Chrome, Edge, Firefox and Safari. Firefox and Safari expose the
// same API under `browser`, Chrome and Edge under `chrome`, so pick whichever
// this browser actually has.
const api = (typeof browser !== "undefined" && browser.storage) ? browser : chrome;

const KEY = "cloverCodes";

// ---------- tabs ----------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-on"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-on"));
    tab.classList.add("is-on");
    document.getElementById("panel-" + tab.dataset.tab).classList.add("is-on");
  });
});

// ---------- storage ----------
function getCodes() {
  return new Promise((resolve) => {
    api.storage.local.get([KEY], (res) => resolve(res[KEY] || []));
  });
}

function setCodes(codes) {
  return new Promise((resolve) => {
    api.storage.local.set({ [KEY]: codes }, resolve);
  });
}

// ---------- saved list ----------
async function renderSaved() {
  const list = document.getElementById("saved-list");
  const codes = await getCodes();
  list.innerHTML = "";

  if (codes.length === 0) {
    list.innerHTML = `<div class="empty">Nothing saved yet.<br>Open the Add tab to put in your first code.</div>`;
    return;
  }

  codes.forEach((c) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div>
        <div class="row-store"></div>
        <div class="row-note"></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="pill"></span>
        <button class="kill" title="Remove">&times;</button>
      </div>`;
    row.querySelector(".row-store").textContent = c.store;
    row.querySelector(".row-note").textContent = c.note || "";
    row.querySelector(".pill").textContent = c.code;
    row.querySelector(".kill").addEventListener("click", async () => {
      const rest = (await getCodes()).filter((x) => x.id !== c.id);
      await setCodes(rest);
      renderSaved();
    });
    list.appendChild(row);
  });
}

// ---------- add ----------
document.getElementById("save-btn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const store = document.getElementById("f-store").value.trim().toLowerCase();
  const code = document.getElementById("f-code").value.trim();
  const note = document.getElementById("f-note").value.trim();

  if (!store || !code) {
    status.textContent = "Store and code are both needed.";
    status.className = "status err";
    return;
  }

  const codes = await getCodes();
  codes.push({ id: Date.now().toString(36), store, code, note });
  await setCodes(codes);

  status.textContent = "Saved. Sharing with everyone…";
  status.className = "status ok";
  document.getElementById("f-store").value = "";
  document.getElementById("f-code").value = "";
  document.getElementById("f-note").value = "";
  renderSaved();

  // Also share it to the community backend, so it shows up for everyone.
  cloudSend({ type: "clover_submit", row: { store, code, label: note || null, kind: "code" } })
    .then((r) => {
      status.textContent = (r && r.ok)
        ? "Saved for you and shared with everyone. 🍀"
        : "Saved for you. (Community is offline right now.)";
      renderCommunity();
    });
});

// ---------- evergreen ----------
function renderEvergreen() {
  const list = document.getElementById("evergreen-list");
  list.innerHTML = "";
  (window.CLOVER_EVERGREEN || []).forEach((e) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div>
        <div class="row-store"></div>
        <div class="row-note"></div>
      </div>
      <span class="pct"></span>`;
    row.querySelector(".row-store").textContent = `${e.store} — ${e.label}`;
    row.querySelector(".row-note").textContent = e.detail;
    row.querySelector(".pct").textContent = e.pct;
    list.appendChild(row);
  });
}

renderSaved();
renderEvergreen();

// ---------- settings link ----------
const settingsBtn = document.getElementById("openSettings");
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    if (api.runtime && api.runtime.openOptionsPage) {
      api.runtime.openOptionsPage();
    } else {
      window.open(api.runtime.getURL("options.html"));
    }
  });
}

// ---------- community (Supabase, via the background worker) ----------

function cloudSend(msg) {
  return new Promise((resolve) => {
    try {
      api.runtime.sendMessage(msg, (r) => resolve(r || { ok: false }));
    } catch (e) { resolve({ ok: false }); }
  });
}

function getActiveHost() {
  return new Promise((resolve) => {
    try {
      api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        try {
          const u = (tabs && tabs[0] && tabs[0].url) ? new URL(tabs[0].url) : null;
          resolve(u ? u.hostname.replace(/^www\./, "") : "");
        } catch (e) { resolve(""); }
      });
    } catch (e) { resolve(""); }
  });
}

// one vote per device per code, remembered locally
function getVoted() {
  return new Promise((resolve) => {
    api.storage.local.get(["cloverVoted"], (r) => resolve(r.cloverVoted || {}));
  });
}
function setVoted(v) {
  return new Promise((resolve) => api.storage.local.set({ cloverVoted: v }, resolve));
}

// ---- these mirror clover-site.html exactly, so the popup reads the same ----
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
}
function rate(up, down) {
  const t = up + down;
  return t === 0 ? null : Math.round((up / t) * 100);
}
// with only one or two reports a precise percentage overstates what we know
function rateLabel(up, down) {
  const pct = rate(up, down);
  if (pct === null) return "—";
  const reports = up + down;
  if (reports < 3) return pct >= 60 ? "high" : pct >= 40 ? "mixed" : "low";
  return pct + "%";
}
function ring(pct, label) {
  const R = 19, C = 2 * Math.PI * R;
  const off = pct === null ? C : C - (pct / 100) * C;
  const txt = label === undefined ? (pct === null ? "—" : pct + "%") : label;
  const small = txt.length > 3 ? ' style="font-size:.58rem"' : "";
  return `<div class="ring"><svg width="40" height="40" viewBox="0 0 44 44">` +
    `<circle class="track" cx="22" cy="22" r="${R}" fill="none" stroke-width="4"/>` +
    `<circle class="fill" cx="22" cy="22" r="${R}" fill="none" stroke-width="4" ` +
    `stroke-dasharray="${C}" stroke-dashoffset="${off}"/></svg>` +
    `<div class="num"${small}>${txt}</div></div>`;
}
// store marks are drawn here from the shop name — nothing is fetched
const MARK_INK = ["#16382a", "#2e7d5b", "#34b26c", "#3f6d8a", "#6b4d99",
                  "#8a6a05", "#a8552f", "#4a6b3a", "#7a4a5e", "#2f6d6d"];
function markColour(name) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n = (n * 31 + name.charCodeAt(i)) >>> 0;
  return MARK_INK[n % MARK_INK.length];
}
function favicon(store) {
  const clean = String(store || "?").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const letter = (clean.replace(/[^a-z0-9]/gi, "")[0] || "?").toUpperCase();
  const bg = markColour(clean);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<rect width="32" height="32" rx="8" fill="${bg}"/>` +
    `<text x="16" y="22" text-anchor="middle" fill="#ffffff" ` +
    `font-family="Avenir Next,Segoe UI,Arial,sans-serif" font-size="18" font-weight="700">${letter}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

let COMMUNITY = [];
let COMMUNITY_HOST = "";

async function renderCommunity() {
  const list = document.getElementById("community-list");
  if (!list) return;
  const search = (document.getElementById("c-search").value || "").trim().toLowerCase();
  const voted = await getVoted();

  let rows = COMMUNITY.slice();
  const filter = search || COMMUNITY_HOST;
  if (filter) {
    const matched = rows.filter((r) => {
      const s = String(r.store || "").toLowerCase();
      return s.includes(filter) || filter.includes(s);
    });
    rows = (matched.length === 0 && !search) ? rows : matched;
  }

  // Same three tiers as the site: worked first, untested next, failing last.
  const tier = (r) => { const pc = rate(r.works || 0, r.fails || 0); return pc === null ? 1 : (pc >= 50 ? 0 : 2); };
  rows.sort((a, b) => {
    const ta = tier(a), tb = tier(b);
    if (ta !== tb) return ta - tb;
    return (rate(b.works || 0, b.fails || 0) || 0) - (rate(a.works || 0, a.fails || 0) || 0);
  });

  list.innerHTML = "";
  if (rows.length === 0) {
    list.innerHTML = `<div class="empty">No community codes yet.<br>Add one on the Add tab to be the first.</div>`;
    return;
  }

  rows.slice(0, 40).forEach((r) => {
    const up = r.works || 0, down = r.fails || 0, reports = up + down;
    const pct = rate(up, down);
    const mine = voted[r.id];

    let okText = "";
    if (reports === 0) okText = `<span class="untested">nobody has tried it yet</span>`;
    else if (up > down) okText = `<span class="proof">people say it works</span>`;

    const el = document.createElement("div");
    el.className = "code";
    el.innerHTML = `
      <div class="score">${ring(pct, rateLabel(up, down))}<small>worked</small></div>
      <img class="favicon" src="${favicon(r.store)}" alt="">
      <div class="code-main">
        <div class="code-top">
          <span class="code-store">${esc(r.store)}</span>
          ${r.code
            ? `<span class="code-pill" title="Click to copy">${esc(r.code)}</span>`
            : `<span class="code-deal">deal / link</span>`}
        </div>
        <div class="code-note">${esc(r.label || r.detail || "")}</div>
        <div class="code-meta">
          ${okText}
          <span>${reports} ${reports === 1 ? "report" : "reports"}</span>
        </div>
      </div>
      <div class="votes">
        <button class="vote up${mine === "up" ? " chosen" : ""}" ${mine ? "disabled" : ""}
          title="${mine === "up" ? "You said this worked" : "This code worked for me"}">Worked</button>
        <button class="vote down${mine === "down" ? " chosen" : ""}" ${mine ? "disabled" : ""}
          title="${mine === "down" ? "You said this failed" : "This code did not work"}">Nope</button>
      </div>`;

    const pill = el.querySelector(".code-pill");
    if (pill) pill.onclick = () => {
      navigator.clipboard && navigator.clipboard.writeText(r.code);
      const old = pill.textContent;
      pill.classList.add("copied"); pill.textContent = "copied";
      setTimeout(() => { pill.textContent = old; pill.classList.remove("copied"); }, 1100);
    };

    el.querySelectorAll(".vote").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (voted[r.id]) return;
        const worked = btn.classList.contains("up");
        voted[r.id] = worked ? "up" : "down";
        await setVoted(voted);
        if (worked) r.works = up + 1; else r.fails = down + 1;
        cloudSend({ type: "clover_vote", id: r.id, worked });
        renderCommunity();
      });
    });

    list.appendChild(el);
  });
}

async function loadCommunity() {
  COMMUNITY_HOST = await getActiveHost();
  const r = await cloudSend({ type: "clover_codes" });
  COMMUNITY = (r && r.ok && Array.isArray(r.data)) ? r.data : [];
  renderCommunity();
}

document.getElementById("c-search").addEventListener("input", renderCommunity);
const commTab = document.querySelector('.tab[data-tab="community"]');
if (commTab) commTab.addEventListener("click", loadCommunity);
loadCommunity();
