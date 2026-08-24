// Clover background worker.
// All talking to the Supabase backend happens here, not in the content
// script, so a store page's security rules (CSP) can't block it.

const SUPA_URL = "https://zxsgxihknyexyzzpddmg.supabase.co";
// Public "anon" key — safe to ship. The database is protected by
// Row-Level Security: anyone can read codes and add a vote, nobody can
// change or delete other people's data.
const SUPA_KEY = "sb_publishable_wbAdbAS-TPcojUiQMNr-jg_Zv72DF7p";

const HEADERS = {
  "apikey": SUPA_KEY,
  "Authorization": "Bearer " + SUPA_KEY,
  "Content-Type": "application/json"
};

async function getCodes() {
  const r = await fetch(SUPA_URL + "/rest/v1/code_stats?select=*", { headers: HEADERS });
  if (!r.ok) throw new Error("codes " + r.status);
  return await r.json();
}

async function vote(codeId, worked) {
  const r = await fetch(SUPA_URL + "/rest/v1/votes", {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ code_id: codeId, worked: !!worked })
  });
  return r.ok;
}

async function submit(row) {
  const r = await fetch(SUPA_URL + "/rest/v1/codes", {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(row)
  });
  return r.ok;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg && msg.type === "clover_codes") {
        sendResponse({ ok: true, data: await getCodes() });
      } else if (msg && msg.type === "clover_vote") {
        sendResponse({ ok: await vote(msg.id, msg.worked) });
      } else if (msg && msg.type === "clover_submit") {
        sendResponse({ ok: await submit(msg.row) });
      } else {
        sendResponse({ ok: false, error: "unknown message" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true; // keep the message channel open for the async reply
});
