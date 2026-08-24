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

  status.textContent = "Saved. Clover will try it at checkout.";
  status.className = "status ok";
  document.getElementById("f-store").value = "";
  document.getElementById("f-code").value = "";
  document.getElementById("f-note").value = "";
  renderSaved();
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
