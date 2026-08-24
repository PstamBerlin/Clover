// Drives the settings page. Every control writes straight to storage as soon
// as it changes, so there is no save button to forget about.

const FIELDS = {
  enabled:      { el: "enabled",      type: "check"  },
  showOrb:      { el: "showOrb",      type: "select" },
  position:     { el: "position",     type: "select" },
  autoTry:      { el: "autoTry",      type: "check"  },
  delay:        { el: "delay",        type: "range"  },
  blocked:      { el: "blocked",      type: "lines"  },
  onlyThese:    { el: "onlyThese",    type: "lines"  },
  theme:        { el: "theme",        type: "select" },
  mascot:       { el: "mascot",       type: "check"  },
  confetti:     { el: "confetti",     type: "check"  },
  creatorDeals: { el: "creatorDeals", type: "check"  }
};

let current = null;

// ---------- reading and writing controls ----------

function readControl(name) {
  const spec = FIELDS[name];
  const el = document.getElementById(spec.el);
  if (!el) return null;
  switch (spec.type) {
    case "check":  return el.checked;
    case "range":  return parseInt(el.value, 10);
    case "lines":  return el.value
                     .split("\n")
                     .map((s) => s.trim().toLowerCase())
                     .filter(Boolean);
    default:       return el.value;
  }
}

function writeControl(name, value) {
  const spec = FIELDS[name];
  const el = document.getElementById(spec.el);
  if (!el) return;
  switch (spec.type) {
    case "check": el.checked = !!value; break;
    case "range": el.value = value; break;
    case "lines": el.value = (value || []).join("\n"); break;
    default:      el.value = value;
  }
}

// ---------- feedback ----------

let savedTimer = null;
function flashSaved() {
  const tag = document.getElementById("saved");
  if (!tag) return;
  tag.classList.add("show");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => tag.classList.remove("show"), 1400);
}

function showDelay() {
  const out = document.getElementById("delayOut");
  const ms = parseInt(document.getElementById("delay").value, 10);
  if (out) out.textContent = (ms / 1000).toFixed(1) + "s";
}

// Grey out everything when the master switch is off, and grey out the
// blocked list when an only-these list is in use, since it wins anyway.
function reflectState() {
  const on = document.getElementById("enabled").checked;
  document.querySelectorAll("main .card").forEach((card, i) => {
    if (i === 0) return;
    card.classList.toggle("dimmed", !on);
  });

  const only = readControl("onlyThese");
  const blockedField = document.getElementById("blocked").closest(".field");
  if (blockedField) {
    blockedField.classList.toggle("dimmed", only.length > 0);
  }
}

function applyThemePreview() {
  const theme = document.getElementById("theme").value;
  const dark = theme === "dark" ||
    (theme === "auto" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.toggle("dark", dark);
}

// ---------- saving ----------

async function persist() {
  const next = Object.assign({}, current);
  Object.keys(FIELDS).forEach((name) => {
    const v = readControl(name);
    if (v !== null) next[name] = v;
  });
  current = next;
  await window.cloverSaveSettings(next);
  flashSaved();
  reflectState();
  applyThemePreview();
}

// ---------- start ----------

async function load() {
  current = await window.cloverGetSettings();
  Object.keys(FIELDS).forEach((name) => writeControl(name, current[name]));
  showDelay();
  reflectState();
  applyThemePreview();

  Object.keys(FIELDS).forEach((name) => {
    const el = document.getElementById(FIELDS[name].el);
    if (!el) return;
    const evt = FIELDS[name].type === "lines" ? "input" : "change";
    el.addEventListener(evt, persist);
    if (FIELDS[name].type === "range") {
      el.addEventListener("input", showDelay);
    }
  });

  const reset = document.getElementById("reset");
  if (reset) {
    reset.addEventListener("click", async () => {
      if (reset.dataset.armed !== "yes") {
        reset.dataset.armed = "yes";
        reset.textContent = "Tap again to confirm";
        setTimeout(() => {
          reset.dataset.armed = "";
          reset.textContent = "Reset settings";
        }, 4000);
        return;
      }
      current = Object.assign({}, window.CLOVER_DEFAULTS);
      await window.cloverSaveSettings(current);
      Object.keys(FIELDS).forEach((name) => writeControl(name, current[name]));
      reset.dataset.armed = "";
      reset.textContent = "Reset settings";
      showDelay();
      reflectState();
      applyThemePreview();
      flashSaved();
    });
  }

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", applyThemePreview);
  }
}

load();
