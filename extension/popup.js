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

// honest status wording: >=3 votes shows a %, fewer shows a word
function statusFor(works, fails) {
  const total = works + fails;
  if (total === 0) return { cls: "untested", text: "untested" };
  const rate = works / total;
  if (total >= 3) {
    const pct = Math.round(rate * 100);
    if (pct >= 60) return { cls: "worked", text: pct + "% work" };
    if (pct >= 40) return { cls: "mixed", text: pct + "% work" };
    return { cls: "low", text: pct + "% work" };
  }
  if (rate >= 0.6) return { cls: "high", text: "looks good" };
  if (rate >= 0.4) return { cls: "mixed", text: "mixed" };
  return { cls: "low", text: "iffy" };
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

  rows.sort((a, b) => ((b.works || 0) - (b.fails || 0)) - ((a.works || 0) - (a.fails || 0)));

  list.innerHTML = "";
  if (rows.length === 0) {
    list.innerHTML = `<div class="empty">No community codes yet.<br>Add one on the Add tab to be the first.</div>`;
    return;
  }

  rows.slice(0, 40).forEach((r) => {
    const st = statusFor(r.works || 0, r.fails || 0);
    const mine = voted[r.id];
    const row = document.createElement("div");
    row.className = "crow" + (st.cls === "worked" ? " is-worked" : "");
    row.innerHTML = `
      <div class="crow-top">
        <div>
          <div class="crow-store"></div>
          <div class="crow-note"></div>
        </div>
        <span class="cbadge ${st.cls}">${st.text}</span>
      </div>
      <div class="crow-mid">
        <span class="crow-code"></span>
        <div class="votes">
          <button class="vote up ${mine === "up" ? "on" : ""}" ${mine ? "disabled" : ""} title="It worked">&#128077; <span class="v-up"></span></button>
          <button class="vote down ${mine === "down" ? "on" : ""}" ${mine ? "disabled" : ""} title="Did not work">&#128078; <span class="v-down"></span></button>
        </div>
      </div>`;
    row.querySelector(".crow-store").textContent = r.store || "";
    row.querySelector(".crow-note").textContent = r.label || r.detail || "";
    const codeEl = row.querySelector(".crow-code");
    if (r.code) { codeEl.textContent = r.code; }
    else { codeEl.className = "crow-deal"; codeEl.textContent = "deal / link"; }
    row.querySelector(".v-up").textContent = r.works || 0;
    row.querySelector(".v-down").textContent = r.fails || 0;

    row.querySelectorAll(".vote").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (voted[r.id]) return;
        const worked = btn.classList.contains("up");
        voted[r.id] = worked ? "up" : "down";
        await setVoted(voted);
        if (worked) r.works = (r.works || 0) + 1; else r.fails = (r.fails || 0) + 1;
        cloudSend({ type: "clover_vote", id: r.id, worked });
        renderCommunity();
      });
    });

    list.appendChild(row);
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
