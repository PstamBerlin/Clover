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

  // Search the page AND any open shadow roots. Modern checkouts (web
  // components, some Shopify/headless carts) hide the promo box inside a
  // shadow root, where a plain document.querySelectorAll can't see it.
  function deepQueryAll(selector) {
    const out = [];
    const seen = new Set();
    const walk = (root) => {
      if (!root || seen.has(root)) return;
      seen.add(root);
      try { root.querySelectorAll(selector).forEach((el) => out.push(el)); } catch (e) { /* bad selector on this root */ }
      let nodes;
      try { nodes = root.querySelectorAll("*"); } catch (e) { nodes = []; }
      nodes.forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
    };
    walk(document);
    return out;
  }

  function isShown(el) {
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  // Strong promo words (safe to read from an input's own attributes/label).
  const PROMO_STRONG = /(promo|coupon|discount|voucher|gutschein|rabatt|aktionscode|kortingscode|cupon|cupón|sconto|réduction|reduction|kortings|code)/i;
  // Strict promo words (used when reading the surrounding box text, so a
  // stray "code" or "zip code" elsewhere does not get mistaken for it).
  const PROMO_STRICT = /(promo|coupon|discount|voucher|gutschein|rabatt|aktionscode|kortingscode|cupon|cupón|sconto)/i;

  function labelTextFor(el) {
    const bits = [];
    const lid = el.getAttribute("aria-labelledby");
    if (lid) lid.split(/\s+/).forEach((id) => { const l = document.getElementById(id); if (l) bits.push(l.textContent || ""); });
    if (el.id) {
      try { const lab = document.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id) + '"]'); if (lab) bits.push(lab.textContent || ""); } catch (e) {}
    }
    const wrap = el.closest("label"); if (wrap) bits.push(wrap.textContent || "");
    return bits.join(" ");
  }

  function findCodeBox(recipe) {
    // 1) the recipe's attribute selectors, searching shadow roots too
    let box = deepQueryAll(recipe.codeInput).find(isShown);
    if (box) return box;

    // 2) any visible text field whose own attributes or label say "promo"
    const fields = deepQueryAll(
      "input:not([type]), input[type='text'], input[type='search'], input[type='tel'], input[type='email']"
    ).filter(isShown).filter((el) => (el.type || "").toLowerCase() !== "email" || true);

    box = fields.find((el) => {
      const own = [el.getAttribute("placeholder"), el.getAttribute("aria-label"),
                   el.getAttribute("name"), el.id, labelTextFor(el)].join(" ");
      return PROMO_STRONG.test(own);
    });
    if (box) return box;

    // 3) a field whose small surrounding box reads like a promo field
    //    (covers floating labels where the text is a sibling, not the input)
    box = fields.find((el) => {
      const near = (el.parentElement && el.parentElement.textContent || "");
      return PROMO_STRICT.test(near);
    });
    return box || null;
  }

  // Many checkouts (Shopify etc.) hide the promo field behind an
  // "Add discount code" / "Rabatt hinzufügen" toggle. If no box is visible,
  // click that toggle first, then look again.
  const REVEAL_WORDS = /(add (a )?discount|discount code|add (a )?code|enter (a )?code|promo code|coupon code|have a code|gift ?card|rabatt|gutschein|rabattcode|aktionscode|code hinzufügen|kortingscode|coupon|voucher|cupón|cupon|sconto|réduction)/i;
  async function revealCodeBox(recipe) {
    let box = findCodeBox(recipe);
    if (box) return box;
    const toggle = deepQueryAll("button, a, [role='button'], summary").find((el) => {
      if (!isShown(el)) return false;
      const t = (el.textContent || el.getAttribute("aria-label") || "").trim();
      return t.length <= 40 && REVEAL_WORDS.test(t) && !PAY_WORDS.test(t);
    });
    if (toggle) {
      try { toggle.click(); } catch (e) {}
      await new Promise((r) => setTimeout(r, 450));
      box = findCodeBox(recipe);
    }
    return box;
  }

  // Parse a money string in either 1.234,56 (EU) or 1,234.56 (US) format.
  function parseMoney(s) {
    const m = (s || "").match(/\d[\d.,\s]*\d|\d/);
    if (!m) return null;
    let x = m[0].replace(/\s/g, "");
    const dec = Math.max(x.lastIndexOf(","), x.lastIndexOf("."));
    if (dec > -1 && x.length - dec - 1 === 2) {
      x = x.slice(0, dec).replace(/[.,]/g, "") + "." + x.slice(dec + 1);
    } else {
      x = x.replace(/[.,]/g, "");
    }
    const n = parseFloat(x);
    return isNaN(n) ? null : Math.abs(n);
  }

  const TOTAL_LABEL = /^(gesamt|total|zu zahlen|order total|grand total|amount due|to pay|à payer|итого|totaal|totale|合计|總計|합계|결제)\b/i;
  const NOT_TOTAL = /(erspar|rabatt|saving|discount|nachlass|reduction|zwischensumme|subtotal|versand|shipping|steuer|\btax\b|mwst|vat|trinkgeld|\btip\b)/i;

  // Read the GRAND total. Stores split the "Gesamt/Total" label and the price
  // into separate elements, so find the label, then the price in its row.
  function readTotal(recipe) {
    const labels = deepQueryAll("*").filter((el) => {
      if (!isShown(el)) return false;
      const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3)
        .map((n) => n.textContent).join(" ").trim();
      return own && own.length <= 24 && TOTAL_LABEL.test(own) && !NOT_TOTAL.test(own);
    });
    for (const lab of labels) {
      let row = lab;
      for (let k = 0; k < 5 && row; k++) {
        const t = row.textContent || "";
        if (/\d[.,]\d{2}/.test(t)) {
          const v = parseMoney(t.replace(/gesamtersparnis[^\d]*[\d.,]+/i, ""));
          if (v != null) return v;
        }
        row = row.parentElement;
      }
    }
    for (const el of deepQueryAll(recipe.total)) { const v = parseMoney(el.textContent); if (v != null) return v; }
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

  // ---- typing a code + pressing apply (works across languages) --------

  // Set a value the way React / Vue actually notice, and fire a full,
  // realistic event burst so frameworks that only enable the Apply button
  // after "typing" (keyup/input) unlock it.
  function setInputValue(el, value) {
    try { el.focus(); } catch (e) {}
    try {
      const proto = el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, value);
    } catch (e) { el.value = value; }
    const last = value.slice(-1) || "";
    el.dispatchEvent(new KeyboardEvent("keydown", { key: last, bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keypress", { key: last, bubbles: true }));
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
    el.dispatchEvent(new KeyboardEvent("keyup", { key: last, bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Words that mean "apply / redeem" in the languages Clover runs into.
  // Uses Unicode-letter boundaries (not \b) so German words that start/end
  // with ä/ö/ü/ß match too, and so it never fires on a partial word.
  // Kept specific so it never clicks "Pay", "Remove" or "Add to cart".
  // Words on a button that mean "apply the discount", across many languages.
  // Only promo/redeem meanings — never generic submit words.
  const APPLY_WORDS = /(?:^|[^\p{L}])(apply|redeem|activate|apply code|add code|use code|apply discount|apply coupon|einlösen|einlosen|anwenden|übernehmen|ubernehmen|einreichen|aktivieren|hinzufügen|hinzufugen|gutschein|appliquer|valider|utiliser|canjear|aplicar|aplicar cupón|resgatar|aplică|folosește|applica|riscatta|usa|toepassen|inwisselen|activeren|verzilver|tillämpa|lös in|løs inn|indløs|anvend|bruk|käytä|lunasta|uygula|kullan|zastosuj|wykorzystaj|uplatnit|použít|alkalmaz|beváltás|применить|использовать|активировать|застосувати|εφαρμογή|εξαργύρωση|תطبيق|החל|使用|应用|兑换|適用|適用する|적용|사용)(?:[^\p{L}]|$)/iu;

  // Words we must NEVER click as "apply" — pay / buy / place-order buttons.
  const PAY_WORDS = /(pay|buy|order|checkout|purchase|place order|complete|continue|proceed|kaufen|bezahlen|jetzt kaufen|zur kasse|bestellen|bestellung|weiter|payer|commander|payez|comprar|pagar|finalizar|realizar pedido|acquista|paga|ordina|betalen|afrekenen|bestellen|köp|betala|betal|kjøp|osta|maksa|ödeme|satın|sipariş|оплатить|купить|заказать|оформить|结账|付款|购买|支付|下单|結帳|決済|購入|支払|チェックアウト|결제|구매|주문)/iu;

  function findApplyButton(recipe, box) {
    // 1) the store recipe's own selector, if it points at something visible
    if (recipe && recipe.applyButton) {
      const el = document.querySelector(recipe.applyButton);
      if (el && el.offsetParent !== null) return el;
    }
    // 2) a button whose TEXT means "apply", in any language. Search the
    //    smallest ancestor of the code box that actually contains a button
    //    — never the box itself, since its own id may contain "promo".
    let scope = box && box.form;
    if (!scope && box) {
      let el = box.parentElement;
      for (let i = 0; i < 6 && el; i++) {
        if (el.querySelector("button, input[type='submit'], input[type='button'], [role='button']")) { scope = el; break; }
        el = el.parentElement;
      }
    }
    scope = scope || document;
    const cands = Array.from(scope.querySelectorAll(
      "button, input[type='submit'], input[type='button'], [role='button'], a"));
    const hit = cands.find((el) => {
      if (el === box || el.offsetParent === null) return false;
      const t = (el.textContent || el.value || el.getAttribute("aria-label") || "");
      // must read like "apply", and must NOT read like pay/buy/checkout
      return APPLY_WORDS.test(t) && !PAY_WORDS.test(t);
    });
    if (hit) return hit;
    // 3) a lone submit button inside the same little form — but never one
    //    that reads like pay / place order
    if (box && box.form) {
      const subs = Array.from(box.form.querySelectorAll(
        "button[type='submit'], input[type='submit'], button:not([type])"));
      const sub = subs.find((s) => s.offsetParent !== null &&
        !PAY_WORDS.test(s.textContent || s.value || s.getAttribute("aria-label") || ""));
      if (sub) return sub;
    }
    return null;
  }

  // Type the code and try hard to submit it: button → form submit → Enter,
  // and if the button looks disabled, still try the other routes then click
  // it anyway (some sites only grey it out with CSS).
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Taking an applied code back off, so the next one is measured from the full
  // price. We ONLY ever click a remove button that names the code we applied
  // (e.g. Shopify's "25Anycubic entfernen") — never a bare "Remove", so we can
  // never accidentally delete a product line from the cart.
  const REMOVE_WORDS = /(remove|entfernen|verwijder|supprimer|retirer|eliminar|quitar|rimuovi|rimuovere|togliere|löschen|delete|fjern|ta bort|poista|kaldır|удалить|убрать|删除|移除|削除|삭제)/i;
  function findRemoveButton(code) {
    if (!code) return null;
    const up = code.toUpperCase();
    return deepQueryAll("button, a, [role='button']").find((el) => {
      if (!isShown(el)) return false;
      if (el.closest && el.closest(".clover-badge")) return false;   // never our own UI
      const t = (el.getAttribute("aria-label") || el.textContent || "").trim();
      if (!t || t.length > 60 || PAY_WORDS.test(t)) return false;
      return REMOVE_WORDS.test(t) && t.toUpperCase().includes(up);
    });
  }
  async function removeCode(code) {
    const b = findRemoveButton(code);
    if (b) { try { b.click(); } catch (e) {} await sleep(650); return true; }
    return false;
  }
  async function removeCodes(codes) {
    for (const c of codes) await removeCode(c);
  }

  async function applyCode(box, recipe, code) {
    setInputValue(box, code);
    // Frameworks like Shopify/React only ENABLE the Apply button after the
    // input re-renders, so wait a beat before looking for a clickable button.
    await new Promise((r) => setTimeout(r, 350));

    const btn = findApplyButton(recipe, box);   // already excludes pay/buy buttons
    if (btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true") { btn.click(); return; }

    // SAFETY: never submit a form that contains a pay / place-order button —
    // pressing Enter or submitting there could place a real order. Only fall
    // back to Enter when the field sits in a dedicated discount form.
    const form = box.form;
    const formHasPay = form && Array.from(form.querySelectorAll("button, input[type='submit']"))
      .some((b) => PAY_WORDS.test(b.textContent || b.value || b.getAttribute("aria-label") || ""));
    if (!formHasPay) {
      ["keydown", "keyup"].forEach((type) =>
        box.dispatchEvent(new KeyboardEvent(type, {
          key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true
        })));
      if (btn) { try { btn.click(); } catch (e) {} }  // click even if only CSS-greyed
    }
  }

  // ---- badge ----------------------------------------------------------

  const badge = document.createElement("div");
  badge.className = "clover-badge";
  // The mascot drawing, used twice: small in the floating orb, and big in
  // the ring at the top of the open card.
  const MASCOT = `
      <svg viewBox="0 0 100 100" class="clover-mark">
        <g class="clover-figure">
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
      </svg>`;

  badge.innerHTML = `
    <button class="clover-orb" aria-label="Open Clover">${MASCOT}</button>
    <div class="clover-say" hidden><span class="clover-say-text"></span></div>
    <div class="clover-panel" hidden>
      <button class="clover-close" aria-label="Close">&times;</button>
      <div class="clover-hero">
        <div class="clover-ring">${MASCOT}</div>
        <canvas class="clover-confetti" width="260" height="260"></canvas>
        <span class="clover-wordmark">Clover</span>
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

    badge.querySelectorAll(".clover-mouth").forEach((mouth) => {
      mouth.setAttribute("d", m.mouth);
    });

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
          applyCode(box, recipe, btn.dataset.code);
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

  // Roll a number up from 0 to `to` over ~0.7s, so the saving lands with a
  // little flourish instead of just popping into place.
  function countUp(el, to) {
    if (!el) return;
    const reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { el.textContent = to.toFixed(2); return; }
    const dur = 700, t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);   // easeOutCubic — quick then settles
      el.textContent = (to * eased).toFixed(2);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = to.toFixed(2);
    };
    requestAnimationFrame(tick);
  }

  // ---- the actual code-trying ----------------------------------------

  async function runCodes() {
    const recipe = pickRecipe();
    let box = await revealCodeBox(recipe);

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

    // Wait for the store to recalculate — Shopify etc. update the total a beat
    // after a code is applied. Poll until it drops below `below`, or give up.
    const settle = async (below, tries) => {
      let now = readTotal(recipe);
      for (let w = 0; w < (tries || 8); w++) {
        await sleep(450);
        now = readTotal(recipe);
        if (below != null && now != null && now < below - 0.001) break;
      }
      return now;
    };

    // After taking a code off, the store also needs a beat to put the price
    // back UP. Wait for it, so the next code is not measured against a total
    // that is still showing the discount we just removed.
    const settleUp = async (target, tries) => {
      let now = readTotal(recipe);
      for (let w = 0; w < (tries || 8); w++) {
        if (now != null && target != null && now >= target - 0.001) break;
        await sleep(450);
        now = readTotal(recipe);
      }
      return now;
    };

    // ---- Phase 1: try every code on its own, note how much each saves -----
    const worked = [];   // { code, id, saved }
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      currentEl.textContent = `${item.code}  (${i + 1} of ${list.length})`;
      say(item.code, { kind: "code" });

      await applyCode(box, recipe, item.code);
      const now = await settle(startTotal, 8);

      if (startTotal && now != null && now < startTotal - 0.001) {
        const saved = startTotal - now;
        worked.push({ code: item.code, id: item.id, saved: saved });
        statusEl.textContent = `Found one — saved ${saved.toFixed(2)}. Checking the rest…`;
        say("Saved " + saved.toFixed(2), { kind: "win" });
        // take it back off so the next code is measured from the full price
        await removeCode(item.code);
        await settleUp(startTotal);            // wait for the price to revert
        box = (await revealCodeBox(recipe)) || box;
      }
    }

    if (worked.length === 0) {
      setMood("sad");
      say("None of them worked", { kind: "miss", hold: 4000 });
      body.innerHTML = `
        <p class="clover-line">No code worked this time.</p>
        <p class="clover-sub">Tried ${list.length}. That is normal, most public codes are dead.</p>`;
      setTimeout(() => setMood("idle"), 3000);
      return;
    }

    // ---- Phase 2: keep the biggest, then try to STACK the others on top ----
    worked.sort((a, b) => b.saved - a.saved);
    statusEl.textContent = "Combining the best codes…";
    currentEl.textContent = "";
    await removeCodes(worked.map((w) => w.code));   // clean slate
    await settleUp(startTotal);
    box = (await revealCodeBox(recipe)) || box;

    const stack = [];
    let stackTotal = startTotal;
    for (const w of worked) {
      await applyCode(box, recipe, w.code);
      const now = await settle(stackTotal, 8);
      if (now != null && now < stackTotal - 0.001) {
        // it lowered the price further → it stacks, keep it
        stack.push(w);
        stackTotal = now;
        if (stack.length > 1) say("Stacked " + w.code, { kind: "win" });
      } else {
        // no extra saving (store took only one, or rejected it) → undo it
        await removeCode(w.code);
        await settleUp(stackTotal);
        box = (await revealCodeBox(recipe)) || box;
        // if undoing it wiped the whole stack (store swapped codes), rebuild
        const check = readTotal(recipe);
        if (stack.length && (check == null || check > stackTotal + 0.001)) {
          await removeCodes(worked.map((x) => x.code));
          await settleUp(startTotal);
          box = (await revealCodeBox(recipe)) || box;
          stackTotal = startTotal;
          for (const s of stack) {
            await applyCode(box, recipe, s.code);
            const t = await settle(stackTotal, 8);
            if (t != null) stackTotal = t;
          }
        }
      }
    }

    // ---- make sure something good is REALLY on the order ----
    // If Phase 2 somehow ended with nothing applied (e.g. the store cleared
    // everything), fall back to just re-applying the single best code, so the
    // number we celebrate always matches what is actually on the order.
    let applied = stack.length ? stack.slice() : [];
    let finalNow = readTotal(recipe);
    if (!(startTotal && finalNow != null && finalNow < startTotal - 0.001)) {
      await removeCodes(worked.map((w) => w.code));
      await settleUp(startTotal);
      box = (await revealCodeBox(recipe)) || box;
      await applyCode(box, recipe, worked[0].code);
      finalNow = await settle(startTotal, 10);
      applied = [worked[0]];
    }

    const finalSaved = (startTotal && finalNow != null && finalNow < startTotal)
      ? startTotal - finalNow
      : worked[0].saved;

    setMood("happy");
    say("Saved " + finalSaved.toFixed(2), { kind: "win", hold: 5000 });
    burst(finalSaved);

    let sub;
    if (applied.length > 1) {
      sub = `Stacked ${applied.length} codes: ` +
        applied.map((a) => `<code>${a.code}</code>`).join(" + ") + ".";
    } else if (worked.length > 1) {
      sub = `Best of ${worked.length} that worked. <code>${applied[0].code}</code> is applied now.`;
    } else {
      sub = `<code>${applied[0].code}</code> is applied now.`;
    }
    body.innerHTML = `
      <p class="clover-savedlbl">You saved</p>
      <p class="clover-win"><span class="clover-amt">0.00</span></p>
      <p class="clover-sub">${sub}</p>`;
    body.classList.add("clover-celebrate");
    countUp(body.querySelector(".clover-amt"), finalSaved);

    // Tell the community which codes worked, so they turn green for everyone.
    applied.forEach((a) => { if (a.id) cloudSend({ type: "clover_vote", id: a.id, worked: true }); });
    setTimeout(() => setMood("idle"), 4000);
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
