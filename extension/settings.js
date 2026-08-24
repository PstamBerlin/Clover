// Settings shared by the popup, the options page and the on-page badge.
// Everything has a sensible default so nothing breaks if storage is empty.

const CLOVER_DEFAULTS = {
  enabled: true,          // master switch
  showOrb: "checkout",    // "checkout" = only on checkout pages, "always", "never"
  autoTry: false,         // try codes without being asked
  confetti: true,         // celebrate a saving
  mascot: true,           // face and moods, off means a plain clover
  creatorDeals: true,     // point out deals that belong to a creator
  theme: "auto",          // "auto", "light", "dark"
  delay: 1400,            // ms between code attempts
  position: "right",      // "right" or "left"
  blocked: [],            // never help on these stores
  onlyThese: []           // if filled, help on these and nothing else
};

const CLOVER_SETTINGS_KEY = "cloverSettings";

function cloverApi() {
  return (typeof browser !== "undefined" && browser.storage) ? browser : chrome;
}

function getSettings() {
  return new Promise((resolve) => {
    try {
      cloverApi().storage.local.get([CLOVER_SETTINGS_KEY], (res) => {
        resolve(Object.assign({}, CLOVER_DEFAULTS, res[CLOVER_SETTINGS_KEY] || {}));
      });
    } catch (e) {
      resolve(Object.assign({}, CLOVER_DEFAULTS));
    }
  });
}

function saveSettings(settings) {
  return new Promise((resolve) => {
    try {
      cloverApi().storage.local.set({ [CLOVER_SETTINGS_KEY]: settings }, resolve);
    } catch (e) {
      resolve();
    }
  });
}

// Decide whether Clover should do anything on a given host.
function allowedOn(host, settings) {
  if (!settings.enabled) return false;
  const clean = host.replace(/^www\./, "");
  const hits = (list) => list.some((s) => clean.includes(s.trim().toLowerCase()));
  if (settings.onlyThese.length > 0) return hits(settings.onlyThese);
  if (settings.blocked.length > 0 && hits(settings.blocked)) return false;
  return true;
}

if (typeof window !== "undefined") {
  window.CLOVER_DEFAULTS = CLOVER_DEFAULTS;
  window.cloverGetSettings = getSettings;
  window.cloverSaveSettings = saveSettings;
  window.cloverAllowedOn = allowedOn;
}
