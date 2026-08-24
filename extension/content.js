(function () {
  "use strict";

  if (window.__cloverLoaded) return;
  window.__cloverLoaded = true;

  const host = location.hostname.replace(/^www\./, "");

  // Settings are read once when the page loads. Everything below checks
  // them before doing anything, so turning Clover off really does mean off.
  let S = Object.assign({}, window.CLOVER_DEFAULTS || {});

  function pickRecipe() {
    const specific = window.CLOVER_RECIPES.find(
      (r) => r.matches.some((m) => m !== "*" && host.includes(m))
    );
    return specific || window.CLOVER_RECIPES.find((r) => r.matches.includes("*"));
  }

  function findCodeBox(recipe) {
    const inputs = Array.from(document.querySelectorAll(recipe.codeInput));
    return inputs.find((el) => el.offsetParent !== null) || null;
  }

  function readTotal(recipe) {
    const els = Array.from(document.querySelectorAll(recipe.total));
    for (const el of els) {
      const match = (el.textContent || "").match(/[\d]+[.,][\d]{2}/);
      if (match) return parseFloat(match[0].replace(",", "."));
    }
    return null;
  }

  function codesForStore() {
    const table = window.CLOVER_CODES || {};
    for (const key of Object.keys(table)) {
      if (host.includes(key)) return table[key];
    }
    return [];
  }

  // ---- community codes (Supabase, via the background worker) ----------
  // The background worker does the network calls so a store page's CSP
  // can't block them. Everything here fails soft: if the cloud is down,
  // Clover just uses its built-in codes.

  function cloudSend(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (r) => resolve(r || { ok: false }));
      } catch (e) { resolve({ ok: false }); }
    });
  }

  async function cloudCodesForStore() {
    const r = await cloudSend({ type: "clover_codes" });
    if (!r || !r.ok || !Array.isArray(r.data)) return [];
    return r.data.filter((row) => {
      const s = String(row.store || "").toLowerCase().replace(/^www\./, "");
      return s && (host.includes(s) || s.includes(host));
    });
  }

  // ---- badge ----------------------------------------------------------

  const badge = document.createElement("div");
  badge.className = "clover-badge";
  badge.innerHTML = `
    <button class="clover-orb" aria-label="Open Clover">
      <svg viewBox="0 0 100 100" class="clover-mark">
        <g class="clover-body">
          <path class="clover-stem" d="M50 63 Q47 79 39 91"
                fill="none" stroke-width="4.5" stroke-linecap="round"/>
          <g class="clover-leaves">
            <path d="M50 50 C50 32 39 21 28 26 C17 31 17 46 30 50 C39 53 46 53 50 50Z"/>
            <path d="M50 50 C68 50 79 39 74 28 C69 17 54 17 50 30 C47 39 47 46 50 50Z"/>
            <path d="M50 50 C50 68 61 79 72 74 C83 69 83 54 70 50 C61 47 54 47 50 50Z"/>
            <path d="M50 50 C32 50 21 61 26 72 C31 83 46 83 50 70 C53 61 53 54 50 50Z"/>
          </g>
          <g class="clover-veins">
            <path d="M50 50 Q40 44 30 36"/>
            <path d="M50 50 Q60 44 70 36"/>
            <path d="M50 50 Q60 56 70 64"/>
            <path d="M50 50 Q40 56 30 64"/>
          </g>
          <g class="clover-sheen">
            <ellipse cx="36" cy="33" rx="11" ry="7" transform="rotate(-32 36 33)"/>
            <ellipse cx="64" cy="33" rx="8" ry="5" transform="rotate(32 64 33)"/>
          </g>
          <g class="clover-face">
            <circle class="clover-eye left"  cx="42" cy="47" r="3.8"/>
            <circle class="clover-eye right" cx="58" cy="47" r="3.8"/>
            <circle class="clover-glint left"  cx="43.4" cy="45.6" r="1.3"/>
            <circle class="clover-glint right" cx="59.4" cy="45.6" r="1.3"/>
            <path class="clover-mouth" d="M45 56 Q50 60 55 56" fill="none"
                  stroke-width="2.4" stroke-linecap="round"/>
          </g>
        </g>
      </svg>
    </button>
    <div class="clover-say" hidden><span class="clover-say-text"></span></div>
    <canvas class="clover-confetti" width="260" height="260"></canvas>
    <div class="clover-panel" hidden>
      <div class="clover-panel-head">
        <span class="clover-wordmark">Clover</span>
        <button class="clover-close" aria-label="Close">&times;</button>
      </div>
      <div class="clover-body">
        <p class="clover-line">Looks like a checkout page.</p>
        <p class="clover-sub">Want me to try the codes I know for this store?</p>
        <button class="clover-go">Try codes</button>
      </div>
      <div class="clover-foot">Clover never touches your referral links.</div>
    </div>
  `;

  const orb = badge.querySelector(".clover-orb");
  const panel = badge.querySelector(".clover-panel");
  const body = badge.querySelector(".clover-body");
  const canvas = badge.querySelector(".clover-confetti");
  const sayBox = badge.querySelector(".clover-say");
  const sayText = badge.querySelector(".clover-say-text");

  // ---- the caption under the mascot ----------------------------------
  // Shows what it is doing right now, so you can watch it work without
  // having the panel open.

  let sayTimer = null;

  function say(text, opts) {
    const o = opts || {};
    clearTimeout(sayTimer);
    sayBox.hidden = false;
    sayBox.classList.remove("is-code", "is-win", "is-miss");
    if (o.kind) sayBox.classList.add("is-" + o.kind);
    sayText.textContent = text;
    // retrigger the pop animation
    sayBox.classList.remove("pop");
    void sayBox.offsetWidth;
    sayBox.classList.add("pop");
    if (o.hold) {
      sayTimer = setTimeout(hush, o.hold);
    }
  }

  function hush() {
    clearTimeout(sayTimer);
    sayBox.classList.add("going");
    sayTimer = setTimeout(() => {
      sayBox.hidden = true;
      sayBox.classList.remove("going");
    }, 220);
  }

  // ---- mascot moods --------------------------------------------------

  // Each mood is just the mouth shape and how open the eyes are. Without
  // eyebrows the face reads friendly rather than stern.
  const MOODS = {
    idle:    { mouth: "M45 56 Q50 60 55 56", eye: 3.8 },
    looking: { mouth: "M46 57 Q50 58 54 57", eye: 3.5 },
    happy:   { mouth: "M42 54 Q50 66 58 54", eye: 4.4 },
    sad:     { mouth: "M45 59 Q50 55 55 59", eye: 3.3 }
  };

  function setMood(mood) {
    badge.classList.remove(
      "mood-idle", "mood-looking", "mood-happy", "mood-sad"
    );
    badge.classList.add("mood-" + mood);

    const m = MOODS[mood];
    if (!m) return;

    const mouth = badge.querySelector(".clover-mouth");
    if (mouth) mouth.setAttribute("d", m.mouth);

    badge.querySelectorAll(".clover-eye").forEach((eye) => {
      eye.setAttribute("r", m.eye);
    });
    // the highlight sits just inside the eye, so it scales with it
    badge.querySelectorAll(".clover-glint").forEach((g) => {
      g.setAttribute("r", (m.eye * 0.34).toFixed(2));
    });
  }
  setMood("idle");

  // ---- confetti ------------------------------------------------------
  // The burst is sized to what was actually saved. A big win gets a big
  // celebration, a small one gets a small nod. It should never look like
  // more happened than really did.

  const CONFETTI_COLORS = ["#7fe3a0", "#34b26c", "#ffd24a", "#b6f5cd", "#fff"];

  function burst(amount) {
    if (!S.confetti) return;
    const reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // 14 pieces for a small saving, up to 70 for a large one
    const scale = Math.max(0, Math.min(1, (amount - 1) / 40));
    const count = Math.round(14 + scale * 56);
    const power = 3 + scale * 4;

    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const bits = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.4 + Math.random()) * power;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 3 + Math.random() * 4,
        spin: (Math.random() - 0.5) * 0.3,
        rot: Math.random() * Math.PI,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        life: 1
      };
    });

    canvas.classList.add("firing");
    let frame = 0;

    (function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      bits.forEach((b) => {
        if (b.life <= 0) return;
        alive = true;
        b.vy += 0.16;          // gravity
        b.vx *= 0.99;          // drag
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.spin;
        b.life -= 0.014;

        ctx.save();
        ctx.globalAlpha = Math.max(0, b.life);
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size * 0.6);
        ctx.restore();
      });

      frame++;
      if (alive && frame < 220) {
        requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.remove("firing");
      }
    })();
  }

  orb.addEventListener("click", () => {
    const open = !panel.hidden;
    panel.hidden = open;
    badge.classList.toggle("is-open", !open);
    if (!open) offerCreatorHint();
  });

  // When the panel opens, mention any creator deal before anything else.
  function offerCreatorHint() {
    const deals = creatorDealsHere();
    if (deals.length === 0) return;
    const names = deals.map((d) => d.creator).join(", ");
    const hint = document.createElement("div");
    hint.className = "clover-hint";
    hint.innerHTML = `
      <span>There ${deals.length === 1 ? "is a creator deal" : "are creator deals"} here from ${names}.</span>
      <button class="clover-hint-btn">See ${deals.length === 1 ? "it" : "them"}</button>`;
    hint.querySelector(".clover-hint-btn").addEventListener("click", showCreatorDeals);
    if (!body.querySelector(".clover-hint")) body.prepend(hint);
  }
  badge.querySelector(".clover-close").addEventListener("click", () => {
    panel.hidden = true;
    badge.classList.remove("is-open");
  });

  badge.querySelector(".clover-go").addEventListener("click", runCodes);

  // ---- creator deals -------------------------------------------------

  // If a referral parameter is already in the URL, somebody sent you here
  // and the credit is theirs. Clover says nothing in that case.
  function arrivedViaReferral() {
    const params = new URLSearchParams(location.search);
    return (window.REFERRAL_KEYS || []).some((k) => params.has(k));
  }

  function creatorDealsHere() {
    if (!S.creatorDeals) return [];
    if (arrivedViaReferral()) return [];
    return (window.CLOVER_CREATOR_DEALS || []).filter((d) =>
      host.includes(d.store)
    );
  }

  function showCreatorDeals() {
    const deals = creatorDealsHere();
    if (deals.length === 0) return false;

    body.innerHTML = `
      <p class="clover-line">Creator deals for this store</p>
      <p class="clover-sub">These come from creators the store sponsors. Using one sends them the credit.</p>
      <div class="clover-deals">
        ${deals
          .map(
            (d, i) => `
          <div class="clover-deal">
            <div class="clover-deal-who">${d.creator}</div>
            <div class="clover-deal-what">${d.deal}</div>
            ${
              d.kind === "code"
                ? `<button class="clover-deal-btn" data-code="${d.value}">Use ${d.value}</button>`
                : `<a class="clover-deal-btn" href="${d.value}" target="_blank" rel="noopener">Open link</a>
                   ${d.code ? `<button class="clover-deal-code" data-code="${d.code}">then use ${d.code}</button>` : ""}`
            }
          </div>`
          )
          .join("")}
      </div>
      <button class="clover-go clover-back">Back to trying codes</button>`;

    body
      .querySelectorAll(".clover-deal-btn[data-code], .clover-deal-code[data-code]")
      .forEach((btn) => {
      btn.addEventListener("click", () => {
        const recipe = pickRecipe();
        const box = findCodeBox(recipe);
        if (box) {
          box.focus();
          box.value = btn.dataset.code;
          box.dispatchEvent(new Event("input", { bubbles: true }));
          box.dispatchEvent(new Event("change", { bubbles: true }));
          const applyBtn = document.querySelector(recipe.applyButton);
          if (applyBtn) applyBtn.click();
          btn.textContent = "Applied";
        } else {
          navigator.clipboard?.writeText(btn.dataset.code);
          btn.textContent = "Copied";
        }
      });
    });

    body.querySelector(".clover-back").addEventListener("click", runCodes);
    return true;
  }

  // ---- the actual code-trying ----------------------------------------

  async function runCodes() {
    const recipe = pickRecipe();
    const box = findCodeBox(recipe);

    if (!box) {
      say("Cannot find the promo box", { kind: "miss", hold: 3000 });
      body.innerHTML = `
        <p class="clover-line">No promo box found.</p>
        <p class="clover-sub">This store hides it, or it opens behind a link. Try opening the promo field first, then click Clover again.</p>`;
      return;
    }

    // Merge built-in codes with community codes from Supabase.
    const list = [];
    const seen = new Set();
    codesForStore().forEach((c) => {
      if (c && !seen.has(c)) { seen.add(c); list.push({ code: c, id: null }); }
    });
    let cloud = [];
    try { cloud = await cloudCodesForStore(); } catch (e) { cloud = []; }
    cloud.forEach((row) => {
      if (row.code && !seen.has(row.code)) {
        seen.add(row.code);
        list.push({ code: row.code, id: row.id });
      }
    });

    if (list.length === 0) {
      say("No codes saved for this store", { kind: "miss", hold: 3000 });
      body.innerHTML = `
        <p class="clover-line">No codes saved for this store yet.</p>
        <p class="clover-sub">Add some in the Clover popup and they will show up here.</p>`;
      return;
    }

    setMood("looking");
    say("Trying " + list.length + " codes");
    body.innerHTML = `
      <div class="clover-spinner"><span></span><span></span><span></span><span></span></div>
      <p class="clover-line clover-status">Trying codes...</p>
      <p class="clover-sub clover-current"></p>`;

    const statusEl = body.querySelector(".clover-status");
    const currentEl = body.querySelector(".clover-current");

    const startTotal = readTotal(recipe);
    let best = null;

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      currentEl.textContent = `${item.code}  (${i + 1} of ${list.length})`;
      say(item.code, { kind: "code" });

      box.focus();
      box.value = item.code;
      box.dispatchEvent(new Event("input", { bubbles: true }));
      box.dispatchEvent(new Event("change", { bubbles: true }));

      const applyBtn = document.querySelector(recipe.applyButton);
      if (applyBtn) applyBtn.click();

      await new Promise((r) => setTimeout(r, S.delay || 1400));

      const now = readTotal(recipe);
      if (startTotal && now && now < startTotal) {
        const saved = startTotal - now;
        if (!best || saved > best.saved) best = { code: item.code, id: item.id, saved };
      }
    }

    if (best) {
      setMood("happy");
      say("Saved " + best.saved.toFixed(2), { kind: "win", hold: 5000 });
      burst(best.saved);
      body.innerHTML = `
        <p class="clover-line clover-win">Saved ${best.saved.toFixed(2)}</p>
        <p class="clover-sub">Best code was <code>${best.code}</code>. It is applied now.</p>`;
      body.classList.add("clover-celebrate");
      // Tell the community this code worked, so it turns green for everyone.
      if (best.id) cloudSend({ type: "clover_vote", id: best.id, worked: true });
      setTimeout(() => setMood("idle"), 4000);
    } else {
      setMood("sad");
      say("None of them worked", { kind: "miss", hold: 4000 });
      body.innerHTML = `
        <p class="clover-line">No code worked this time.</p>
        <p class="clover-sub">Tried ${list.length}. That is normal, most public codes are dead.</p>`;
      setTimeout(() => setMood("idle"), 3000);
    }
  }

  // ---- only show up when it looks like a checkout ----------------------

  function looksLikeCheckout() {
    const recipe = pickRecipe();
    if (findCodeBox(recipe)) return true;
    const url = location.href.toLowerCase();
    return /checkout|cart|basket|bag|payment/.test(url);
  }

  function shouldShow() {
    if (!window.cloverAllowedOn(host, S)) return false;
    if (S.showOrb === "never") return false;
    if (S.showOrb === "always") return true;
    return looksLikeCheckout();
  }

  // Settings that change how the badge looks are applied as classes.
  function applyLook() {
    badge.classList.toggle("clover-left", S.position === "left");
    badge.classList.toggle("clover-plain", !S.mascot);

    const dark = S.theme === "dark" ||
      (S.theme === "auto" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    badge.classList.toggle("clover-dark", dark);
  }

  function mount() {
    if (!document.body || document.body.contains(badge)) return;
    if (!shouldShow()) return;
    applyLook();
    document.body.appendChild(badge);
    requestAnimationFrame(() => badge.classList.add("clover-in"));

    // A quick hello so it is obvious what the clover is for.
    const known = codesForStore().length;
    if (known > 0) {
      setTimeout(() => {
        say(known + (known === 1 ? " code for this store" : " codes for this store"),
            { hold: 4500 });
      }, 700);
    }

    // If asked to, get on with it without waiting to be told.
    if (S.autoTry && looksLikeCheckout()) {
      panel.hidden = false;
      badge.classList.add("is-open");
      setTimeout(runCodes, 600);
    }
  }

  async function start() {
    try {
      if (window.cloverGetSettings) S = await window.cloverGetSettings();
    } catch (e) { /* defaults are already in place */ }

    if (!S.enabled) return;

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  start();
})();
