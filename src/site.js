"use strict";
/* Clover, the page script. The list, the votes, the shared database, the
   stores, the story bits. Rebuilt November 2026 from the first site; the
   rules did not change (CLOVER-PROJECT.md): a person's test is the only thing
   that turns a code green, fewer than three reports show a word not a
   percentage, codes under 40% with four or more reports retire themselves. */

/* ---------- config ---------- */
const MINE_KEY = "clover-mine-v2";    // codes added in this browser, whole
const VOTED_KEY = "clover-voted-v2";  // {id: {dir, sent, at}} this browser's votes
const OLD_KEYS = { list:"clover-codes-v2", mine:"clover-mine", voted:"clover-voted" };
const REQ_KEY = "clover-requests-v1";
const REF_KEY = "clover-referrals-v1";
const THEME_KEY = "clover-theme";
const DEAD_LINE = 40;     // below this rate...
const MIN_VOTES = 4;      // ...with this many reports, a code retires
const CONFIDENT = 3;      // reports before a percentage is shown
const CONFIDENT_CODES = 5;// codes with that many before the headline shows one

/* ---------- storage: this browser only ----------
   The first site used a storage API that only existed where it was built,
   so on the real site nothing stuck. This one keeps the person's own things
   in localStorage: the codes they added, their votes, their requests, their
   referral links and the theme. Everything else (the seed list, the shared
   counts) is rebuilt on every load, so a fixed or removed seed code never
   lingers in anyone's browser. Shared things also go to the database below. */
const store = {
  get(k){ try{ const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); }catch(e){ return null; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ storageOK = false; return false; } },
  drop(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
let MEM = null;
let storageOK = true;
// one id per code, the same on every load: the store and the code
function codeId(storeName, code){ return String(storeName||"").toLowerCase()+"|"+String(code||"").toLowerCase(); }

let mine = store.get(MINE_KEY);
if(!Array.isArray(mine)) mine = [];
let voted = store.get(VOTED_KEY);
if(!voted || typeof voted !== "object" || Array.isArray(voted)) voted = {};

// The first version of this site kept the whole list and random ids. Carry
// over what was the person's own: their codes and which codes they voted on.
(function migrate(){
  const old = store.get(OLD_KEYS.list);
  if(!Array.isArray(old)) return;
  const oldMine = store.get(OLD_KEYS.mine) || [];
  const oldVoted = store.get(OLD_KEYS.voted) || {};
  const byOldId = {};
  old.forEach(c=>{ if(c && c.id) byOldId[c.id] = c; });
  oldMine.forEach(id=>{
    const c = byOldId[id];
    if(c && c.store && c.code && !mine.some(m=>codeId(m.store,m.code) === codeId(c.store,c.code))){
      mine.push({ store:c.store, code:c.code, note:c.note||"", limits:c.limits||"", by:c.by||"", exp:c.exp||null, country:c.country||"XX", cat:c.cat||"other", at:c.at||Date.now(), sid:c.sid||null });
    }
  });
  Object.keys(oldVoted).forEach(id=>{
    const c = byOldId[id];
    if(c && c.store && c.code && (oldVoted[id] === "up" || oldVoted[id] === "down")){
      voted[codeId(c.store,c.code)] = { dir:oldVoted[id], sent:!!c.sid, at:c.lastOk||Date.now() };
    }
  });
  store.set(MINE_KEY, mine); store.set(VOTED_KEY, voted);
  store.drop(OLD_KEYS.list); store.drop(OLD_KEYS.mine); store.drop(OLD_KEYS.voted);
})();

function getCodes(){
  if(MEM !== null) return MEM;
  const seen = new Set();
  const list = [];
  const now = Date.now();
  SEED.forEach((s,i)=>{
    const id = codeId(s.store, s.code);
    if(seen.has(id)) return;   // a code can appear twice in SEED by hand
    seen.add(id);
    list.push({
      id, store:s.store, code:s.code, note:s.note, limits:s.limits,
      cat:s.cat, country:s.country, by:"Clover",
      single:s.single,
      bot:s.bot || null,              // set only by Clover's own checker
      testedOn:s.testedOn || null,    // the day a person put it in a cart
      exp:null,
      up:s.verified ? 1 : 0,
      down:s.failedTwice ? 2 : (s.failed ? 1 : 0),
      at:now - (SEED.length-i)*1000,
      lastOk:s.verified && s.testedOn ? Date.parse(s.testedOn+"T00:00:00") : null,
      seed:true
    });
  });
  mine.forEach(m=>{
    const id = codeId(m.store, m.code);
    if(seen.has(id)) return;
    seen.add(id);
    list.push({ id, store:m.store, code:m.code, note:m.note||"", limits:m.limits||"", by:m.by||"", exp:m.exp||null,
      country:m.country||"XX", cat:m.cat||"other", up:0, down:0, at:m.at||now, lastOk:null, sid:m.sid||null, own:true });
  });
  MEM = list;
  applyLocalVotes(MEM);
  return MEM;
}
// A vote the shared database never got (no connection, or the code had no
// shared id yet) still counts here, on this device.
function applyLocalVotes(list){
  list.forEach(c=>{
    const v = voted[c.id];
    if(!v || v.sent) return;
    c[v.dir] = (c[v.dir]||0)+1;
    if(v.dir === "up" && !(c.lastOk > v.at)) c.lastOk = v.at;
  });
}
function saveMine(){ store.set(MINE_KEY, mine); }
function saveVoted(){ store.set(VOTED_KEY, voted); }

/* ---------- shared live database (Supabase) ----------
   The site works entirely on its own; this layers the shared database on
   top: live vote counts, community-added codes, and votes everyone sees.
   If it is unreachable, the site falls back to what this browser has. */
const SUPA_URL = "https://zxsgxihknyexyzzpddmg.supabase.co";
const SUPA_KEY = "sb_publishable_wbAdbAS-TPcojUiQMNr-jg_Zv72DF7p"; // public key, safe to ship
const SUPA_H = { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json" };
let cloudSynced = false;

async function cloudFetchCodes(){
  const r = await fetch(SUPA_URL + "/rest/v1/code_stats?select=*", { headers: SUPA_H });
  if(!r.ok) throw new Error("codes " + r.status);
  const rows = await r.json();
  // The day each code last worked comes from the votes themselves, never
  // from the moment the page loaded. The seed list was copied into the
  // database on 24 Aug 2026 with one vote per code a person had tested;
  // those repeat the test day in the seed, so they carry no date.
  try{
    const v = await fetch(SUPA_URL + "/rest/v1/votes?select=code_id,worked,created_at", { headers: SUPA_H });
    if(v.ok){
      const last = {}, IMPORT_DAY_END = Date.parse("2026-08-25T00:00:00Z");
      (await v.json()).forEach(x=>{
        if(!x.worked || !x.created_at) return;
        const t = Date.parse(x.created_at);
        if(t < IMPORT_DAY_END) return;
        if(!(last[x.code_id] > t)) last[x.code_id] = t;
      });
      rows.forEach(row=>{ row.last_ok = last[row.id] || null; });
    }
  }catch(e){}
  return rows;
}
function cloudVote(codeId, worked){
  fetch(SUPA_URL + "/rest/v1/votes", { method:"POST", headers:SUPA_H,
    body:JSON.stringify({ code_id:codeId, worked:!!worked }) }).catch(()=>{});
}
async function cloudAddCode(row){
  try{
    const r = await fetch(SUPA_URL + "/rest/v1/codes", { method:"POST",
      headers:Object.assign({}, SUPA_H, { "Prefer":"return=representation" }), body:JSON.stringify(row) });
    if(r.ok){ const d = await r.json(); return (d && d[0]) ? d[0].id : null; }
  }catch(e){}
  return null;
}
// Clover's own checker (agent/): the day it ran a code through a cart and
// what happened. Worth something, never green: that stays a person's call.
function checkerOnto(c, cc){
  if(!cc.checker_at) return;
  const t = Date.parse(cc.checker_at);
  if(isNaN(t)) return;
  c.bot = t; c.botResult = cc.checker_result || null; c.botNote = cc.checker_note || "";
}
async function cloudReconcile(list){
  let cloud;
  try{ cloud = await cloudFetchCodes(); }catch(e){ return false; }
  const byKey = new Map();
  cloud.forEach(cc=>byKey.set((cc.store||"")+"|"+(cc.code||""), cc));
  const localKeys = new Set();
  list.forEach(c=>{
    localKeys.add(c.store+"|"+c.code);
    const cc = byKey.get(c.store+"|"+c.code);
    if(cc){
      c.sid = cc.id; c.up = cc.works || 0; c.down = cc.fails || 0;
      if(c.own){ const m = mine.find(x=>codeId(x.store,x.code) === c.id); if(m && m.sid !== cc.id){ m.sid = cc.id; saveMine(); } }
      if(cc.last_ok && !(c.lastOk > cc.last_ok)) c.lastOk = cc.last_ok;
      checkerOnto(c, cc);
    }
  });
  cloud.forEach(cc=>{
    const key = (cc.store||"")+"|"+(cc.code||"");
    if(cc.code && !localKeys.has(key)){
      list.push({ id:codeId(cc.store, cc.code), sid:cc.id, store:cc.store, code:cc.code,
        note:cc.label || "", limits:cc.detail || "", cat:"other", country:"XX",
        by:"Clover", single:undefined, bot:null, testedOn:null, exp:null,
        up:cc.works || 0, down:cc.fails || 0, at:Date.now(), lastOk:cc.last_ok || null, cloud:true });
      checkerOnto(list[list.length-1], cc);
    }
  });
  cloudSynced = true;
  applyLocalVotes(list);
  return true;
}

/* ---------- helpers ---------- */
function esc(s){ const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }
function isSingleUse(c){
  if(c.single === true) return true;
  if(c.single === false) return false;
  const limits = (c.limits||"").toLowerCase();
  if(/single use|one use|referral|issued to one|one per account|first order only|new accounts|random string/.test(limits)) return true;
  const code = c.code || "";
  if(code.length < 6) return false;
  let flips = 0;
  for(let i=1;i<code.length;i++){ if(/\d/.test(code[i-1]) !== /\d/.test(code[i])) flips++; }
  const letters = code.replace(/[^A-Za-z]/g,"");
  const vowels = (letters.match(/[aeiouAEIOU]/g)||[]).length;
  const vowelRatio = letters.length ? vowels/letters.length : 1;
  if(!letters.length && code.length >= 6) return true;
  return flips >= 4 || (vowelRatio < 0.12 && letters.length >= 6);
}
function rate(c){ const t = (c.up||0)+(c.down||0); return t === 0 ? null : Math.round((c.up/t)*100); }
function rateWord(pct){ return pct >= 60 ? "high" : pct >= 40 ? "mixed" : "low"; }
function rateLabel(c){
  const pct = rate(c);
  if(pct === null) return "—";
  return ((c.up||0)+(c.down||0)) < CONFIDENT ? rateWord(pct) : pct+"%";
}
function isRetired(c){
  const r = rate(c), votes = (c.up||0)+(c.down||0);
  if(isSingleUse(c)) return (c.down||0) >= 2 && (c.up||0) === 0;
  return r !== null && r < DEAD_LINE && votes >= MIN_VOTES;
}
function isExpired(c){ return !!c.exp && new Date(c.exp) < new Date(new Date().toDateString()); }
function daysLeft(c){ return c.exp ? Math.round((new Date(c.exp) - new Date(new Date().toDateString()))/86400000) : null; }
function isLive(c){ return !isRetired(c) && !isExpired(c); }

// Store marks are drawn here, on your machine, from the shop name. Nothing
// is fetched: asking an icon service would tell it every shop you look at.
const MARK_INK = ["#0B2A1B","#1D6B3C","#15803D","#2563EB","#6D28D9","#8A6A05","#B45309","#3F6212","#9D174D","#0F766E"];
function markColour(name){ let n = 0; for(let i=0;i<name.length;i++) n = (n*31 + name.charCodeAt(i)) >>> 0; return MARK_INK[n % MARK_INK.length]; }
function favicon(storeName){
  const clean = String(storeName||"?").replace(/^https?:\/\//,"").replace(/^www\./,"").split("/")[0];
  const letter = (clean.replace(/[^a-z0-9]/gi,"")[0] || "?").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${markColour(clean)}"/>`+
    `<text x="16" y="22" text-anchor="middle" fill="#ffffff" font-family="Manrope,Avenir Next,Segoe UI,Arial,sans-serif" font-size="18" font-weight="800">${letter}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
}
function ring(pct, label){
  const R = 19, C = 2*Math.PI*R;
  const off = pct === null ? C : C-(pct/100)*C;
  const txt = label === undefined ? (pct === null ? "—" : pct+"%") : label;
  const small = txt.length > 3 ? ' style="font-size:.6rem"' : "";
  return `<div class="ring"><svg width="44" height="44" viewBox="0 0 44 44">
    <circle class="track" cx="22" cy="22" r="${R}" fill="none" stroke-width="4"/>
    <circle class="fill" cx="22" cy="22" r="${R}" fill="none" stroke-width="4" stroke-dasharray="${C}" stroke-dashoffset="${off}"/>
    </svg><div class="num"${small}>${txt}</div></div>`;
}
function copyText(t){ try{ navigator.clipboard && navigator.clipboard.writeText(t); }catch(e){} }

/* ---------- state ---------- */
let fStore = "all", fCountry = "all", fCat = "all", query = "", showDead = false;
let openStore = null, listOpen = false, chipsOpen = false, dirOpen = false, dirCat = "all";

/* ---------- filters ---------- */
function countWith(codes, over){
  const f = Object.assign({ store:fStore, country:fCountry, cat:fCat }, over);
  return codes.filter(c=>{
    if(isRetired(c) && !showDead) return false;
    if(isExpired(c)) return false;
    if(f.store !== "all" && c.store !== f.store) return false;
    if(f.country !== "all" && (c.country||"XX") !== f.country) return false;
    if(f.cat !== "all" && (c.cat||"other") !== f.cat) return false;
    return true;
  }).length;
}
function chipButton(txt, count, isOn, onPick, icon){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip"+(isOn ? " on" : "")+(count === 0 && !isOn ? " empty" : "");
  b.innerHTML = (icon ? `<img src="${icon}" alt="">` : "")+esc(txt)+(count !== null ? `<i class="chipcount">${count}</i>` : "");
  if(count === 0 && !isOn){ b.disabled = true; b.title = "No codes with the filters you have on"; }
  else b.onclick = onPick;
  return b;
}
function renderChips(codes){
  const box = document.getElementById("chips");
  const counts = {};
  codes.forEach(c=>{ if(isLive(c)) counts[c.store] = (counts[c.store]||0)+1; });
  const stores = Object.keys(counts).sort((a,b)=>counts[b]-counts[a] || a.localeCompare(b));
  box.innerHTML = "";
  if(stores.length < 2) return;
  const CPAGE = 7;
  let shown = chipsOpen ? stores : stores.slice(0, CPAGE);
  if(fStore !== "all" && !shown.includes(fStore) && stores.includes(fStore)) shown = shown.concat(fStore);
  box.innerHTML = `<span class="filterlabel">Store</span>`;
  box.appendChild(chipButton("All", countWith(codes,{store:"all"}), fStore === "all", ()=>{ fStore = "all"; openStore = null; draw(); }));
  shown.forEach(s=>box.appendChild(chipButton(s, countWith(codes,{store:s}), fStore === s, ()=>{ fStore = s; draw(); }, favicon(s))));
  if(stores.length > CPAGE){
    const more = document.createElement("button");
    more.type = "button"; more.className = "chip more";
    more.textContent = chipsOpen ? "Fewer" : `${stores.length-CPAGE} more`;
    more.onclick = ()=>{ chipsOpen = !chipsOpen; renderChips(codes); };
    box.appendChild(more);
  }
}
function renderCats(codes){
  const box = document.getElementById("cats");
  const list = [...new Set(codes.map(c=>c.cat||"other"))];
  box.innerHTML = "";
  if(list.length < 2) return;
  box.innerHTML = `<span class="filterlabel">Kind</span>`;
  box.appendChild(chipButton("All kinds", countWith(codes,{cat:"all"}), fCat === "all", ()=>{ fCat = "all"; draw(); }));
  list.sort().forEach(c=>box.appendChild(chipButton(CATS[c]||c, countWith(codes,{cat:c}), fCat === c, ()=>{ fCat = c; draw(); })));
}
function renderCountries(codes){
  const box = document.getElementById("countries");
  const list = [...new Set(codes.map(c=>c.country||"XX"))];
  box.innerHTML = "";
  if(list.length < 2) return;
  box.innerHTML = `<span class="filterlabel">Region</span>`;
  box.appendChild(chipButton("Everywhere", countWith(codes,{country:"all"}), fCountry === "all", ()=>{ fCountry = "all"; draw(); }));
  list.sort().forEach(c=>box.appendChild(chipButton(COUNTRIES[c]||c, countWith(codes,{country:c}), fCountry === c, ()=>{ fCountry = c; draw(); })));
}

/* ---------- the store card above the list ---------- */
function renderStorePage(codes){
  const box = document.getElementById("storepage");
  if(!openStore){ box.innerHTML = ""; return; }
  const all = codes.filter(c=>c.store === openStore);
  const live = all.filter(isLive);
  const reported = all.filter(c=>rate(c) !== null && !isSingleUse(c));
  const avg = reported.length ? Math.round(reported.map(rate).reduce((a,b)=>a+b,0)/reported.length) : null;
  const confident = reported.filter(c=>((c.up||0)+(c.down||0)) >= CONFIDENT).length;
  const rateTxt = avg === null ? "—" : confident ? avg+"%" : rateWord(avg);
  box.innerHTML = `<div class="panel storecard">
    <img class="favicon big" src="${favicon(openStore)}" alt="">
    <div class="storename"><b>${esc(openStore)}</b><span>${live.length} working now, ${all.length} tracked in total</span></div>
    <div class="storestats">
      <div><b>${rateTxt}</b><span>Working</span></div>
      <div><b>${reported.length}</b><span>Reported on</span></div>
      <div><b>${all.length-live.length}</b><span>Retired</span></div>
    </div>
    <button class="closebtn" id="close-store" aria-label="Close">&times;</button>
  </div>`;
  document.getElementById("close-store").onclick = ()=>{ openStore = null; fStore = "all"; draw(); };
}

/* ---------- the list ---------- */
function worth(c){
  const note = c.note || "";
  const pct = note.match(/(\d+)\s*(?:%|percent)/i);
  if(pct) return parseInt(pct[1],10);
  const amt = note.match(/(\d+)\s*(?:dollar|euro|off|credit)/i) || note.match(/(?:save|off|credit)\D{0,4}(\d+)/i);
  return amt ? parseInt(amt[1],10)*3 : 0;
}
function tier(c){ const r = rate(c); return r === null ? 1 : (r >= 50 ? 0 : 2); }
function sortCodes(list){
  return list.sort((a,b)=>{
    const ta = tier(a), tb = tier(b);
    if(ta !== tb) return ta-tb;
    if(ta === 0){
      const d = rate(b)-rate(a); if(d) return d;
      const w = worth(b)-worth(a); if(w) return w;
      return (b.lastOk||0)-(a.lastOk||0);
    }
    if(ta === 1){
      const bs = (c)=> c.botResult === "ok" ? 2 : c.bot && c.botResult === "fail" ? 0 : 1;
      if(bs(b) !== bs(a)) return bs(b)-bs(a);
      const w = worth(b)-worth(a); if(w) return w;
      return b.at-a.at;
    }
    return rate(b)-rate(a);
  });
}
function okLine(c){
  const reports = (c.up||0)+(c.down||0);
  // Two levels of checking, never blurred together: a person's test turns a
  // code green; Clover's own checker sits below it and never does.
  if(c.lastOk){
    const days = Math.max(0, Math.floor((Date.now()-c.lastOk)/86400000));
    const when = days === 0 ? "today" : days === 1 ? "yesterday" : days+" days ago";
    // the day in brackets is the seed's test day; once a newer vote has
    // come in, that day is history and would only contradict "today"
    const sameDay = c.testedOn && Math.abs(Date.parse(c.testedOn+"T12:00:00")-c.lastOk) < 36*3600000;
    const on = sameDay ? new Date(c.testedOn+"T12:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short"}) : null;
    let line = `<span class="proof${days>30?" stale":""}" title="${on ? "Tested on "+esc(on) : "Tested by a person"}">a person tested this, worked ${when}${on ? " ("+esc(on)+")" : ""}</span>`;
    if(c.bot && c.bot > c.lastOk){
      const bd = Math.max(0, Math.floor((Date.now()-c.bot)/86400000));
      const bw = bd === 0 ? "today" : bd === 1 ? "yesterday" : bd+" days ago";
      line += ` <span class="botcheck${c.botResult === "fail" ? " botfail" : ""}" title="${esc(c.botNote||"")}">checker ${bw}: ${c.botResult === "ok" ? "worked" : c.botResult === "fail" ? "the shop said no" : "no clear answer"}</span>`;
    }
    return line;
  }
  if(c.bot){
    const days = Math.max(0, Math.floor((Date.now()-c.bot)/86400000));
    const when = days === 0 ? "today" : days === 1 ? "yesterday" : days+" days ago";
    const what = c.botResult === "ok" ? "it worked" : c.botResult === "fail" ? "the shop said no" : "no clear answer";
    return `<span class="botcheck${c.botResult === "fail" ? " botfail" : ""}" title="Clover's own checker put this code through a real cart automatically${c.botNote ? ": "+esc(c.botNote) : ""}. Useful, but a machine can miss what a person would catch, so it does not turn green.">Clover's checker ran this ${when}, ${what}</span>`;
  }
  if(reports === 0) return `<span class="untested">nobody has tried it yet</span>`;
  return "";
}
function renderList(codes){
  const list = document.getElementById("list");
  list.innerHTML = "";
  const q = query.toLowerCase();
  let shown = codes.filter(c=>{
    if(!showDead && (isRetired(c) || isExpired(c))) return false;
    if(fStore !== "all" && c.store !== fStore) return false;
    if(fCountry !== "all" && (c.country||"XX") !== fCountry) return false;
    if(fCat !== "all" && (c.cat||"other") !== fCat) return false;
    if(!q) return true;
    return c.store.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || (c.note||"").toLowerCase().includes(q);
  });
  sortCodes(shown);
  if(shown.length === 0){
    const on = [];
    if(fStore !== "all") on.push(`shop <b>${esc(fStore)}</b>`);
    if(fCat !== "all") on.push(`kind <b>${esc(CATS[fCat]||fCat)}</b>`);
    if(fCountry !== "all") on.push(`region <b>${esc(COUNTRIES[fCountry]||fCountry)}</b>`);
    if(query) on.push(`search <b>${esc(query)}</b>`);
    list.innerHTML = `<div class="empty">${on.length ? `Nothing has all of these at once:<br>${on.join(" and ")}` : "Nothing matches that."}<br><button class="btn quiet" id="clearfilters">Clear the filters</button></div>`;
    document.getElementById("clearfilters").onclick = clearFilters;
    return;
  }
  const PAGE = 8;
  const visible = listOpen ? shown : shown.slice(0, PAGE);
  visible.forEach((c,i)=>{
    const pct = rate(c), retired = isRetired(c), expired = isExpired(c), dl = daysLeft(c);
    const el = document.createElement("div");
    el.className = "code"+(retired ? " dead" : "")+(expired ? " expired" : "");
    el.style.animationDelay = Math.min(i*0.035,.4)+"s";
    let expText = "";
    if(expired) expText = `<span class="expiry gone">expired</span>`;
    else if(dl !== null && dl <= 7) expText = `<span class="expiry soon">${dl === 0 ? "ends today" : dl+"d left"}</span>`;
    else if(dl !== null) expText = `<span class="expiry">${dl}d left</span>`;
    const reports = (c.up||0)+(c.down||0);
    const single = isSingleUse(c);
    el.innerHTML = `
      <div class="score">${ring(pct, single ? "1x" : rateLabel(c))}<small>${single ? "limited" : "worked"}</small></div>
      <img class="favicon" src="${favicon(c.store)}" alt="">
      <div class="code-main">
        <div class="code-top">
          <button type="button" class="code-store" title="See this store">${esc(c.store)}</button>
          <span class="code-pill" title="Click to copy">${esc(c.code)}</span>
        </div>
        <div class="code-note">${esc(c.note)}</div>
        ${c.limits ? `<div class="limits">${esc(c.limits)}</div>` : ""}
        <div class="code-meta">
          <span class="flag">${esc(COUNTRIES[c.country||"XX"]||c.country)}</span>
          <span class="flag">${esc(CATS[c.cat||"other"]||c.cat)}</span>
          ${single ? `<span class="oneuse" title="Issued to one person, one order, or new accounts only. Does not count towards any score, since failing for you is expected.">limited</span>` : ""}
          ${expText}
          ${okLine(c)}
          <span>${reports} ${reports === 1 ? "report" : "reports"}</span>
          ${c.by ? `<span>added by ${esc(c.by)}</span>` : ""}
        </div>
      </div>
      <div class="votes">
        <button type="button" class="vote up${myVote(c.id) === "up" ? " chosen" : ""}" title="${myVote(c.id) === "up" ? "You said this worked. Tap to undo." : "This code worked for me"}">Worked</button>
        <button type="button" class="vote down${myVote(c.id) === "down" ? " chosen" : ""}" title="${myVote(c.id) === "down" ? "You said this failed. Tap to undo." : "This code did not work"}">Nope</button>
        ${c.own ? `<div class="ownrow"><button type="button" class="own edit">Edit</button><button type="button" class="own del">Delete</button></div>` : ""}
      </div>`;
    el.querySelector(".code-pill").onclick = e=>{
      copyText(c.code);
      const t = e.target, old = t.textContent;
      t.classList.add("copied"); t.textContent = "copied";
      setTimeout(()=>{ t.textContent = old; t.classList.remove("copied"); }, 1100);
      showNudge(c);
    };
    el.querySelector(".code-store").onclick = ()=>{ openStore = c.store; fStore = c.store; draw(); scrollToList(); };
    const editBtn = el.querySelector(".edit"); if(editBtn) editBtn.onclick = ()=>startEdit(c.id);
    const delBtn = el.querySelector(".del"); if(delBtn) delBtn.onclick = ()=>confirmDelete(c.id, delBtn);
    el.querySelector(".up").onclick = ()=>vote(c.id,"up");
    el.querySelector(".down").onclick = ()=>vote(c.id,"down");
    list.appendChild(el);
  });
  if(shown.length > PAGE){
    const more = document.createElement("button");
    more.type = "button"; more.className = "showall";
    more.textContent = listOpen ? "Show fewer" : `Show all ${shown.length} codes`;
    more.onclick = ()=>{ listOpen = !listOpen; draw(); if(!listOpen) scrollToList(); };
    list.appendChild(more);
  }
}
function clearFilters(){
  fStore = "all"; fCat = "all"; fCountry = "all"; query = ""; openStore = null;
  document.getElementById("search").value = "";
  draw();
}
function scrollToList(){
  setTimeout(()=>document.getElementById("codes").scrollIntoView({ behavior:"smooth", block:"start" }), 60);
}
function showNudge(c){
  const slot = document.getElementById("nudge-slot");
  slot.innerHTML = `<div class="nudge"><div>You copied <b>${esc(c.code)}</b>. Did it work?</div>
    <div class="nudge-btns"><button type="button" class="yes">It worked</button><button type="button" class="no">It did not</button></div></div>`;
  slot.querySelector(".yes").onclick = ()=>{ slot.innerHTML = ""; vote(c.id,"up"); };
  slot.querySelector(".no").onclick = ()=>{ slot.innerHTML = ""; vote(c.id,"down"); };
}

/* ---------- votes: one per device, undo by tapping again ---------- */
function myVote(id){ const v = voted[id]; return v ? v.dir : undefined; }
function vote(id, dir){
  const codes = getCodes();
  const c = codes.find(x=>x.id === id);
  if(!c) return;
  const had = voted[id];
  if(had && had.dir === dir){
    // the same button again takes the vote back, here; the shared database
    // is append-only, so what was already sent stays sent
    c[dir] = Math.max(0,(c[dir]||0)-1);
    delete voted[id];
  }else if(had){
    // changing your mind moves the vote rather than adding another
    c[had.dir] = Math.max(0,(c[had.dir]||0)-1);
    c[dir] = (c[dir]||0)+1;
    voted[id] = { dir, sent:had.sent, at:Date.now() };
    if(dir === "up") c.lastOk = Date.now();
  }else{
    c[dir] = (c[dir]||0)+1;
    const sent = !!c.sid;
    voted[id] = { dir, sent, at:Date.now() };
    if(dir === "up") c.lastOk = Date.now();
    if(sent) cloudVote(c.sid, dir === "up");
  }
  saveVoted();
  draw();
}

/* ---------- stats ---------- */
function renderStats(codes){
  const live = codes.filter(isLive);
  document.getElementById("s-codes").textContent = live.length;
  document.getElementById("s-stores").textContent = new Set(live.map(c=>c.store)).size;
  const reported = live.filter(c=>((c.up||0)+(c.down||0)) > 0 && !isSingleUse(c));
  const confident = reported.filter(c=>((c.up||0)+(c.down||0)) >= CONFIDENT);
  const el = document.getElementById("s-rate"), lab = el.nextElementSibling;
  if(reported.length === 0){ el.textContent = "—"; lab.textContent = "Working"; lab.title = "No reports yet"; }
  else if(confident.length < CONFIDENT_CODES){
    // A headline percentage needs real evidence: without it a single vote
    // per code would read as "100% working", which nobody has shown.
    const avg = Math.round(reported.map(rate).reduce((a,b)=>a+b,0)/reported.length);
    el.textContent = rateWord(avg); lab.textContent = "Working, early";
    lab.title = reported.length+" code"+(reported.length === 1 ? "" : "s")+" reported on, "+confident.length+" with "+CONFIDENT+" or more reports. A percentage shows once "+CONFIDENT_CODES+" codes have that many.";
  }else{
    const avg = Math.round(confident.map(rate).reduce((a,b)=>a+b,0)/confident.length);
    el.textContent = avg+"%"; lab.textContent = "Working";
    lab.title = "Across "+confident.length+" codes with "+CONFIDENT+" or more reports each";
  }
  document.getElementById("s-people").textContent = new Set(codes.map(c=>c.by).filter(Boolean)).size;
  const sc = document.getElementById("story-count"), ss = document.getElementById("story-stores");
  if(sc) sc.textContent = live.length;
  if(ss) ss.textContent = new Set(live.map(c=>c.store)).size;
}

/* ---------- directory ---------- */
function renderDirectory(codes){
  const grid = document.getElementById("dirgrid"), bar = document.getElementById("dirbar");
  const stores = {};
  codes.forEach(c=>{
    const s = stores[c.store] || (stores[c.store] = { name:c.store, live:0, total:0, cats:{}, best:0 });
    s.total++;
    if(isLive(c)) s.live++;
    const cat = c.cat || "other";
    s.cats[cat] = (s.cats[cat]||0)+1;
    const m = (c.note||"").match(/(\d+)\s*%/);
    if(m && isLive(c)) s.best = Math.max(s.best, parseInt(m[1],10));
  });
  const all = Object.values(stores).map(s=>{ s.cat = Object.entries(s.cats).sort((a,b)=>b[1]-a[1])[0][0]; return s; });
  const cats = [...new Set(all.map(s=>s.cat))].sort();
  bar.innerHTML = `<span class="filterlabel">Show</span>`;
  bar.appendChild(chipButton("Everything", null, dirCat === "all", ()=>{ dirCat = "all"; renderDirectory(codes); }));
  cats.forEach(c=>bar.appendChild(chipButton(CATS[c]||c, null, dirCat === c, ()=>{ dirCat = c; renderDirectory(codes); })));
  const shown = all.filter(s=>dirCat === "all" || s.cat === dirCat).sort((a,b)=>b.live-a.live || a.name.localeCompare(b.name));
  grid.innerHTML = "";
  if(shown.length === 0){ grid.innerHTML = `<div class="empty" style="grid-column:1/-1">Nothing in this category yet.</div>`; return; }
  const DPAGE = 12;
  (dirOpen ? shown : shown.slice(0, DPAGE)).forEach((s,i)=>{
    const el = document.createElement("button");
    el.type = "button"; el.className = "dircard";
    el.style.animationDelay = Math.min(i*0.03,.4)+"s";
    el.innerHTML = `<img src="${favicon(s.name)}" alt=""><span class="dirname">${esc(s.name)}</span><span class="dircat">${esc(CATS[s.cat]||s.cat)}</span>
      <span class="dirstats"><b>${s.live}</b> live ${s.best ? `<span class="dirbest">up to ${s.best}%</span>` : ""}</span>`;
    el.onclick = ()=>{ openStore = s.name; fStore = s.name; fCat = "all"; fCountry = "all"; query = ""; document.getElementById("search").value = ""; draw(); scrollToList(); };
    grid.appendChild(el);
  });
  if(shown.length > DPAGE){
    const more = document.createElement("button");
    more.type = "button"; more.className = "showall";
    more.textContent = dirOpen ? "Show fewer" : `Show all ${shown.length} stores`;
    more.onclick = ()=>{ dirOpen = !dirOpen; renderDirectory(codes); };
    grid.appendChild(more);
  }
}

/* ---------- the wanted board (this browser only) ---------- */
function getRequests(){ const r = store.get(REQ_KEY); return Array.isArray(r) ? r : []; }
function renderRequests(codes){
  const box = document.getElementById("req-list");
  const reqs = getRequests();
  const haveStores = new Set(codes.map(c=>c.store));
  box.innerHTML = "";
  if(reqs.length === 0) return;
  reqs.sort((a,b)=>(b.want||0)-(a.want||0));
  reqs.forEach(r=>{
    const filled = haveStores.has(r.store);
    const el = document.createElement("div");
    el.className = "req";
    el.innerHTML = `<img class="favicon" src="${favicon(r.store)}" alt=""><div class="req-main"><b>${esc(r.store)}</b>
      ${filled ? `<span class="req-done">someone added one</span>` : `<span>${r.want||0} ${(r.want||0) === 1 ? "person wants" : "people want"} this</span>`}</div>
      ${filled ? `<button type="button" class="req-go">See codes</button>` : `<button type="button" class="req-up">Me too</button>`}`;
    if(filled) el.querySelector(".req-go").onclick = ()=>{ openStore = r.store; fStore = r.store; draw(); scrollToList(); };
    else el.querySelector(".req-up").onclick = ()=>{ const list = getRequests(); const t = list.find(x=>x.id === r.id); if(t){ t.want = (t.want||0)+1; store.set(REQ_KEY, list); renderRequests(codes); } };
    box.appendChild(el);
  });
}
document.getElementById("r-add").addEventListener("click", ()=>{
  const st = document.getElementById("r-status");
  const name = document.getElementById("r-store").value.trim().toLowerCase();
  if(!name){ st.textContent = "Type a store name first."; st.className = "status err"; return; }
  const reqs = getRequests();
  const exists = reqs.find(r=>r.store === name);
  if(exists){ exists.want = (exists.want||0)+1; st.textContent = "Already on the board. Added your vote to it."; }
  else { reqs.push({ id:Date.now().toString(36), store:name, want:1, at:Date.now() }); st.textContent = "On the board."; }
  store.set(REQ_KEY, reqs);
  st.className = "status ok";
  document.getElementById("r-store").value = "";
  renderRequests(getCodes());
  setTimeout(()=>{ st.textContent = ""; }, 2600);
});

/* ---------- referral links (this browser only) ---------- */
function getRefs(){ const r = store.get(REF_KEY); return Array.isArray(r) ? r : []; }
const refPick = {};
function renderRefs(){
  const box = document.getElementById("reflist");
  const refs = getRefs();
  box.innerHTML = "";
  if(refs.length === 0){ box.innerHTML = `<p class="fine" style="margin:8px 0 0">No referral links yet. Add one below and it appears here.</p>`; return; }
  const byStore = {};
  refs.forEach(r=>{ (byStore[r.store] || (byStore[r.store] = [])).push(r); });
  Object.keys(byStore).sort().forEach(s=>{
    const group = byStore[s];
    if(refPick[s] === undefined) refPick[s] = Math.floor(Math.random()*group.length);
    const r = group[Math.min(refPick[s], group.length-1)];
    const el = document.createElement("div");
    el.className = "ref";
    el.innerHTML = `<img class="favicon" src="${favicon(s)}" alt=""><div class="ref-main"><b>${esc(s)}</b>
      <span>You get ${esc(r.gets)}</span><span>${esc(r.by||"They")} get${r.by ? "s" : ""} ${esc(r.mine)}</span>
      ${group.length > 1 ? `<span class="ref-share">${group.length} people have a link for this shop, shown in turn</span>` : ""}</div>
      <a class="ref-go" href="${esc(r.link)}" target="_blank" rel="noopener">Open</a>`;
    box.appendChild(el);
  });
}
document.getElementById("rf-save").addEventListener("click", ()=>{
  const st = document.getElementById("rf-status");
  const v = id=>document.getElementById(id).value.trim();
  const s = v("rf-store").toLowerCase(), link = v("rf-link"), gets = v("rf-gets"), mineTxt = v("rf-mine"), by = v("rf-by");
  if(!s || !link){ st.textContent = "A shop and a link are both needed."; st.className = "status err"; return; }
  if(!/^https?:\/\//i.test(link)){ st.textContent = "The link needs to start with https."; st.className = "status err"; return; }
  if(!gets){ st.textContent = "Say what the person clicking gets, otherwise it is not listed."; st.className = "status err"; return; }
  const refs = getRefs();
  if(refs.some(r=>r.link === link)){ st.textContent = "That link is already here."; st.className = "status err"; return; }
  refs.push({ id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), store:s, link, gets, mine:mineTxt || "a referral credit", by, at:Date.now() });
  store.set(REF_KEY, refs);
  st.textContent = "Added. It goes into the rotation for that shop."; st.className = "status ok";
  ["rf-store","rf-link","rf-gets","rf-mine","rf-by"].forEach(id=>document.getElementById(id).value = "");
  renderRefs();
  setTimeout(()=>{ st.textContent = ""; }, 3000);
});

/* ---------- creator deals ---------- */
function renderDeals(){
  const box = document.getElementById("deals-list");
  box.innerHTML = "";
  DEALS.forEach(d=>{
    const el = document.createElement("div");
    el.className = "deal";
    el.innerHTML = `<img class="favicon" src="${favicon(d.store)}" alt=""><div class="deal-main"><b>${esc(d.creator)}</b><span>${esc(d.deal)} at ${esc(d.store)}</span>
      ${d.kind === "link" && d.code ? `<span class="deal-both">then use <code title="Click to copy">${esc(d.code)}</code> at checkout</span>` : ""}</div>
      ${d.kind === "code" ? `<span class="code-pill" title="Click to copy">${esc(d.value)}</span>` : `<a class="deal-link" href="${esc(d.value)}" target="_blank" rel="noopener">Open link</a>`}`;
    el.querySelectorAll(".code-pill, .deal-both code").forEach(pill=>{
      pill.style.cursor = "pointer";
      pill.onclick = ()=>{ copyText(pill.textContent); const old = pill.textContent; pill.textContent = "copied"; setTimeout(()=>{ pill.textContent = old; }, 1100); };
    });
    box.appendChild(el);
  });
}

/* ---------- comparison ---------- */
function renderCompare(){
  const head = document.getElementById("compare-head"), body = document.getElementById("compare-body");
  const cell = v=> v === "yes" ? `<td class="mark ok">✓</td>` : v === "partly" ? `<td class="mark half">~</td>` : `<td class="mark no">✕</td>`;
  head.innerHTML = `<th class="feat"></th><th class="us">Clover</th>`+RIVALS.map(r=>`<th>${r}</th>`).join("");
  body.innerHTML = "";
  COMPARE.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="feat"><b>${esc(r.feat)}</b><span>${esc(r.note)}</span></td>`+cell(r.us).replace('class="mark','class="mark us')+r.marks.map(cell).join("");
    body.appendChild(tr);
  });
}

/* ---------- always-on discounts ---------- */
function renderEver(){
  const box = document.getElementById("ever-list");
  box.innerHTML = "";
  let last = null;
  EVERGREEN.forEach(e=>{
    if(e.group !== last){ const h = document.createElement("p"); h.className = "groupline"; h.textContent = e.group; box.appendChild(h); last = e.group; }
    const el = document.createElement("div");
    el.className = "ever";
    el.innerHTML = `${EVER_NAMED.includes(e.store) ? `<img class="favicon" src="${favicon(e.store)}" alt="">` : ""}
      <div><b>${esc(e.store)} — ${esc(e.label)}</b><span>${esc(e.detail)}</span></div><span class="pct">${esc(e.pct)}</span>`;
    box.appendChild(el);
  });
}

/* ---------- the sync file for the extension ---------- */
function buildSync(codes){
  const table = {};
  codes.filter(isLive).forEach(c=>{ const k = c.store.replace(/^https?:\/\//,"").replace(/^www\./,""); (table[k] = table[k] || []).push(c.code); });
  return Object.keys(table).length ? "const CLOVER_CODES = "+JSON.stringify(table,null,2)+";" : "const CLOVER_CODES = {};";
}
function renderSync(codes){
  document.getElementById("sync-box").textContent = buildSync(codes);
  const live = codes.filter(isLive).length;
  document.getElementById("copy-sync").textContent = live ? `Copy ${live} codes` : "Nothing to copy yet";
}
document.getElementById("copy-sync").addEventListener("click", ()=>{
  const st = document.getElementById("sync-status");
  copyText(buildSync(getCodes()));
  st.textContent = "Copied. Paste it into recipes.js."; st.className = "status ok";
  setTimeout(()=>{ st.textContent = ""; }, 2600);
});

/* ---------- add, edit, delete your own codes ---------- */
let editingId = null, armedDelete = null;
function startEdit(id){
  const c = getCodes().find(x=>x.id === id);
  if(!c) return;
  editingId = id;
  const set = (i,v)=>{ document.getElementById(i).value = v || ""; };
  set("f-store", c.store); set("f-code", c.code); set("f-note", c.note); set("f-limits", c.limits); set("f-by", c.by); set("f-exp", c.exp);
  document.getElementById("f-country").value = c.country || "XX";
  document.getElementById("f-cat").value = c.cat || "other";
  document.getElementById("save").textContent = "Save changes";
  document.getElementById("cancel-edit").hidden = false;
  const st = document.getElementById("status"); st.textContent = "Editing "+c.code; st.className = "status";
  document.getElementById("add").scrollIntoView({ behavior:"smooth", block:"start" });
}
function stopEdit(){
  editingId = null;
  ["f-store","f-code","f-note","f-limits","f-by","f-exp"].forEach(id=>document.getElementById(id).value = "");
  document.getElementById("f-country").value = "XX";
  document.getElementById("f-cat").value = "other";
  document.getElementById("save").textContent = "Add code";
  document.getElementById("cancel-edit").hidden = true;
  document.getElementById("status").textContent = "";
}
function confirmDelete(id, btn){
  if(armedDelete !== id){
    armedDelete = id; btn.textContent = "Sure?"; btn.classList.add("armed");
    setTimeout(()=>{ if(armedDelete === id){ armedDelete = null; btn.textContent = "Delete"; btn.classList.remove("armed"); } }, 4000);
    return;
  }
  armedDelete = null;
  mine = mine.filter(m=>codeId(m.store,m.code) !== id); saveMine();
  MEM = getCodes().filter(x=>x.id !== id);
  if(editingId === id) stopEdit();
  draw();
}
document.getElementById("cancel-edit").addEventListener("click", stopEdit);
document.getElementById("save").addEventListener("click", async ()=>{
  const st = document.getElementById("status");
  const v = id=>document.getElementById(id).value.trim();
  const s = v("f-store").toLowerCase().replace(/^https?:\/\//,"").replace(/^www\./,"").split("/")[0];
  const code = v("f-code"), note = v("f-note"), limits = v("f-limits"), by = v("f-by");
  const exp = document.getElementById("f-exp").value, country = document.getElementById("f-country").value, cat = document.getElementById("f-cat").value;
  if(!s || !code){ st.textContent = "A store and a code are both needed."; st.className = "status err"; return; }
  st.textContent = "Saving..."; st.className = "status";
  const codes = getCodes();
  if(editingId){
    const c = codes.find(x=>x.id === editingId);
    const m = mine.find(x=>codeId(x.store,x.code) === editingId);
    if(c && m){
      // the id follows store and code, so editing those moves the card
      Object.assign(m, { store:s, code, note, limits, by, exp:exp || null, country, cat }); saveMine();
      Object.assign(c, { id:codeId(s, code), store:s, code, note, limits, by, exp:exp || null, country, cat });
    }
    stopEdit(); st.textContent = "Saved."; st.className = "status ok"; draw(); return;
  }
  const id = codeId(s, code);
  if(codes.some(c=>c.id === id)){
    st.textContent = "That code is already in the list for "+s+". Vote on it instead."; st.className = "status err"; return;
  }
  const m = { store:s, code, note, limits, by, exp:exp || null, country, cat, at:Date.now(), sid:null };
  mine.push(m); saveMine();
  const newCode = { id, store:s, code, note, limits, by, exp:exp || null, country, cat, up:0, down:0, at:m.at, lastOk:null, sid:null, own:true };
  codes.push(newCode);
  const sid = await cloudAddCode({ store:s, code, label:note || null, detail:limits || null, kind:"code" });
  if(sid){ newCode.sid = sid; m.sid = sid; saveMine(); st.textContent = "Added, and shared with everyone."; }
  else st.textContent = "Added here. The shared list could not be reached, so it stays in this browser for now.";
  st.className = "status ok";
  ["f-store","f-code","f-note","f-limits","f-by","f-exp"].forEach(x=>document.getElementById(x).value = "");
  document.getElementById("f-country").value = "XX"; document.getElementById("f-cat").value = "other";
  // show the person their code: the list jumps to that store
  fStore = s; openStore = s; fCountry = "all"; fCat = "all"; query = ""; showDead = false; listOpen = true;
  document.getElementById("search").value = ""; document.getElementById("showdead").checked = false;
  draw(); scrollToList();
});

/* ---------- download ----------
   The extension is a plain zip file next to this page (clover-extension.zip,
   built by build_site.py), so the buttons are ordinary links. */

/* ---------- small things ---------- */
document.getElementById("readmore").addEventListener("click", e=>{
  const open = document.getElementById("introrest").classList.toggle("open");
  e.target.textContent = open ? "Show less" : "Read more";
});
document.getElementById("search").addEventListener("input", e=>{ query = e.target.value.trim(); listOpen = false; draw(); });
document.getElementById("showdead").addEventListener("change", e=>{ showDead = e.target.checked; draw(); });

/* theme: follow the device until a choice is made */
function loadTheme(){
  let choice = store.get(THEME_KEY);
  if(choice !== "dark" && choice !== "light") choice = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  document.body.classList.toggle("dark", choice === "dark");
}
document.getElementById("themetoggle").addEventListener("click", ()=>{
  const dark = document.body.classList.toggle("dark");
  store.set(THEME_KEY, dark ? "dark" : "light");
});

/* the top bar goes light once the hero has scrolled past, in light mode */
const bar = document.getElementById("bar");
function barLook(){ bar.classList.toggle("light", window.scrollY > 300); }
window.addEventListener("scroll", barLook, { passive:true });

/* which section is on screen, for the bar */
const navLinks = [...document.querySelectorAll("#bar nav a")];
if("IntersectionObserver" in window){
  const io = new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(!en.isIntersecting) return;
      navLinks.forEach(a=>a.classList.toggle("on", a.getAttribute("href") === "#"+en.target.id));
    });
  }, { rootMargin:"-40% 0px -55% 0px" });
  ["codes","stores","why","always","get"].forEach(id=>{ const el = document.getElementById(id); if(el) io.observe(el); });
}

/* falling clovers in the hero */
(function(){
  const leaf = `<g fill="#86EFAC"><path d="M50 50 C50 34 40 24 30 28 C20 32 20 46 32 50 C40 53 46 53 50 50Z"/><path d="M50 50 C66 50 76 40 72 30 C68 20 54 20 50 32 C47 40 47 46 50 50Z"/><path d="M50 50 C50 66 60 76 70 72 C80 68 80 54 68 50 C60 47 54 47 50 50Z"/><path d="M50 50 C34 50 24 60 28 70 C32 80 46 80 50 68 C53 60 53 54 50 50Z"/></g>`;
  let html = "";
  for(let i=0;i<14;i++){
    const left = Math.random()*100, dur = 9+Math.random()*11, delay = -Math.random()*20, size = 13+Math.random()*20;
    html += `<svg class="drop" viewBox="0 0 100 100" style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s">${leaf}</svg>`;
  }
  document.getElementById("field").innerHTML = html;
})();

/* ---------- draw everything ---------- */
function draw(){
  const codes = getCodes();
  const safe = (fn,arg)=>{ try{ fn(arg); }catch(e){ console.warn(fn.name, e); } };
  safe(renderStats, codes); safe(renderChips, codes); safe(renderCats, codes); safe(renderCountries, codes);
  safe(renderStorePage, codes); safe(renderList, codes); safe(renderDirectory, codes);
  safe(renderRequests, codes); safe(renderSync, codes);
}
async function boot(){
  loadTheme(); barLook();
  renderEver(); renderCompare(); renderDeals(); renderRefs();
  draw();
  // then the shared database on top, and draw again with real counts
  await cloudReconcile(getCodes());
  draw();
  if(!storageOK){
    const slot = document.getElementById("nudge-slot");
    slot.innerHTML = `<div class="nudge"><div>This browser is not letting the page remember anything, so votes and new codes will not stick after a refresh.</div></div>`;
  }
}
boot();
