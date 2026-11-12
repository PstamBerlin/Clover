#!/usr/bin/env python3
"""Puts codes through a real cart on the Shopify shops in agent/stores.json.

  python3 agent/cart_check.py                  every cart-capable store, codes from the shared list + candidates
  python3 agent/cart_check.py anycubic.com     one store
  python3 agent/cart_check.py anycubic.com ACSUN20 TESTME   one store, these codes

How: the shop's public products.json gives a cheap in-stock variant; /cart/add
puts one in a cart; /checkout shows the discount field on the first step. Each
code is typed, applied, and the grand total watched: it drops -> ok (with the
saving), the shop says invalid -> fail, nothing happens -> unknown. The code is
removed again before the next one. Nothing is ever bought: no email, address or
payment is ever entered, and the checker never goes past the first step.

Writes agent/out/cart_results.json. Honest by design: a result of "blocked"
(bot wall, no discount field) is recorded as such, never guessed.
"""
import asyncio, json, pathlib, re, sys, time, urllib.request
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"
SUPA = "https://zxsgxihknyexyzzpddmg.supabase.co/rest/v1"
ANON = "sb_publishable_wbAdbAS-TPcojUiQMNr-jg_Zv72DF7p"   # public key
MAX_CODES = 12
GAP = 2.5           # seconds between codes, gentle on the shop
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 CloverChecker/0.1"
FIELD = 'input[name="reductions"], input[name="discount"], input[id^="ReductionsInput"], input[placeholder*="iscount" i], input[placeholder*="abatt" i], input[placeholder*="gift card" i]'
ERR = re.compile(r"(enter a valid|invalid|not valid|isn.t valid|unrecognised|unrecognized|incorrect|expired|no longer valid|can.t be applied|cannot be applied|not applicable|doesn.t apply|does not apply|ungültig|gib einen gültigen|abgelaufen|ongeldig|invalide|inválido|scaduto)", re.I)
SHOP_TROUBLE = re.compile(r"(problem with our checkout|try again in a few minutes|too many requests|rate limit)", re.I)

def shared_codes():
    req = urllib.request.Request(SUPA + "/code_stats?select=id,store,code,works,fails", headers={"apikey": ANON, "Authorization": "Bearer " + ANON})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def money(s):
    m = re.search(r"\d[\d.,\s]*\d|\d", s or "")
    if not m: return None
    x = m.group(0).replace(" ", "")
    dec = max(x.rfind(","), x.rfind("."))
    x = (x[:dec].replace(".", "").replace(",", "") + "." + x[dec + 1:]) if dec > -1 and len(x) - dec - 1 == 2 else x.replace(".", "").replace(",", "")
    try: return abs(float(x))
    except ValueError: return None

async def read_total(pg):
    return await pg.evaluate("""() => {
      const labels = [...document.querySelectorAll('*')].filter(el => {
        const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim();
        return own && own.length <= 20 && /^(total|gesamt|totaal|totale)\\b/i.test(own) && !/sub|zwischen|shipping|versand|tax|steuer|discount|rabatt|saving/i.test(own);
      });
      for (const lab of labels) { let row = lab; for (let k = 0; k < 5 && row; k++) { const t = row.textContent || ''; if (/\\d[.,]\\d{2}/.test(t)) return t.slice(0, 80); row = row.parentElement; } }
      return null; }""")

async def total_value(pg):
    t = await read_total(pg)
    if not t: return None
    # the row text is "Total USD $459.00": take the last money-looking number
    nums = re.findall(r"\d[\d.,]*\d", t)
    return money(nums[-1]) if nums else None

async def check_store(ctx, name, base, codes):
    res = {"store": name, "base": base, "results": [], "note": ""}
    pg = await ctx.new_page()
    try:
        r = await pg.goto(base + "/products.json?limit=30", wait_until="domcontentloaded", timeout=40000)
        if r.status != 200:
            res["note"] = f"products.json {r.status}"; return res
        data = json.loads(await pg.evaluate("document.body.innerText"))
        variants = [v for p in data.get("products", []) for v in p.get("variants", []) if v.get("available")]
        if not variants:
            res["note"] = "no available product"; return res
        # a dear item, not a cheap one: most codes only touch printers and
        # bigger things, and nothing is bought either way
        v = sorted(variants, key=lambda v: -float(v.get("price") or 0))[0]
        await pg.goto(base + f"/cart/add?id={v['id']}&quantity=1", wait_until="domcontentloaded", timeout=40000)
        await pg.goto(base + "/checkout", wait_until="domcontentloaded", timeout=60000)
        await pg.wait_for_timeout(5000)
        body = await pg.evaluate("document.body.innerText")
        if re.search(r"cloudflare|attention required|just a moment|captcha", body, re.I):
            res["note"] = "blocked"; return res
        field = await pg.query_selector(FIELD)
        if not field:
            toggle = pg.get_by_text(re.compile(r"(add discount|discount code|gift card|rabatt)", re.I)).first
            try:
                await toggle.click(timeout=3000); await pg.wait_for_timeout(1200)
            except Exception: pass
            field = await pg.query_selector(FIELD)
        if not field:
            res["note"] = "no discount field"; return res
        start = await total_value(pg)
        res["start_total"] = start
        if start is None:
            res["note"] = "no total found"; return res
        for code in codes[:MAX_CODES]:
            field = await pg.query_selector(FIELD)
            if not field: break
            await field.fill(""); await field.type(code, delay=30)
            await pg.wait_for_timeout(400)
            pressed = False
            for btn in await pg.query_selector_all("button"):
                try:
                    t = (await btn.inner_text()).strip()
                    if re.fullmatch(r"(apply|anwenden|einlösen|toepassen|appliquer|aplicar|applica)", t, re.I) and await btn.is_visible():
                        await btn.click(); pressed = True; break
                except Exception: pass
            if not pressed:
                await field.press("Enter")
            outcome, saving, seen = "unknown", 0.0, ""
            for _ in range(14):
                await pg.wait_for_timeout(500)
                now = await total_value(pg)
                if now is not None and now < start - 0.001:
                    outcome, saving = "ok", round(start - now, 2); break
                near = await pg.evaluate("""() => { const f = document.querySelector('input[name="reductions"], input[name="discount"], input[id^="ReductionsInput"]'); let el = f && f.parentElement; let t=''; for (let i=0;i<4 && el;i++){ t += ' ' + (el.innerText||''); el = el.parentElement; } return t.slice(0, 600); }""")
                if ERR.search(near or ""):
                    outcome, seen = "fail", (ERR.search(near).group(0)); break
                if SHOP_TROUBLE.search(await pg.evaluate("document.body.innerText.slice(0, 4000)")):
                    outcome, seen = "unknown", "the shop had a problem with its checkout"; break
            res["results"].append({"code": code, "result": outcome, "saving": saving, "shop_said": seen})
            print(f"  {name:16s} {code:18s} {outcome:8s} {saving if saving else ''} {seen}")
            if seen == "the shop had a problem with its checkout":
                res["note"] = "stopped: the shop reported a checkout problem"; break
            if outcome == "ok":
                # take it off again: the remove button names the code
                for btn in await pg.query_selector_all("button, a"):
                    try:
                        label = ((await btn.get_attribute("aria-label")) or (await btn.inner_text()) or "").strip()
                        if code.lower() in label.lower() and re.search(r"remove|entfernen|verwijder|supprimer", label, re.I) and await btn.is_visible():
                            await btn.click(); break
                    except Exception: pass
                for _ in range(12):
                    await pg.wait_for_timeout(500)
                    now = await total_value(pg)
                    if now is not None and now >= start - 0.001: break
            await pg.wait_for_timeout(int(GAP * 1000))
    except Exception as e:
        res["note"] = ("error: " + str(e)[:160])
    finally:
        await pg.close()
    return res

async def main():
    args = sys.argv[1:]
    stores = json.loads((HERE / "stores.json").read_text())["stores"]
    cart_stores = {n: i["cart"] for n, i in stores.items() if i.get("cart")}
    if args and args[0] in cart_stores:
        cart_stores = {args[0]: cart_stores[args[0]]}
    given = args[1:] if len(args) > 1 else []
    shared = shared_codes() if not given else []
    cands = {}
    try:
        cj = json.loads((OUT / "candidates.json").read_text())
        for n, e in cj["stores"].items(): cands[n] = [c["code"] for c in e.get("candidates", [])]
    except Exception: pass
    out = {"ran": time.strftime("%Y-%m-%d %H:%M"), "stores": []}
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        ctx = await b.new_context(viewport={"width": 1280, "height": 900}, locale="en-US", user_agent=UA)
        for name, base in cart_stores.items():
            if given:
                codes = given
            else:
                rows = [r for r in shared if (r["store"] or "").lower() == name]
                # best first, retired ones left out, then this run's candidates
                rows.sort(key=lambda r: -(r.get("works") or 0) * 10 + (r.get("fails") or 0) * 3)
                codes = [r["code"] for r in rows if r["code"] and not ((r.get("works") or 0) + (r.get("fails") or 0) >= 4 and (r.get("works") or 0) / max(1, (r.get("works") or 0) + (r.get("fails") or 0)) < 0.4)]
                for c in cands.get(name, []):
                    if c.upper() not in {x.upper() for x in codes}: codes.append(c)
            print(f"{name}: {len(codes)} codes to try (max {MAX_CODES})")
            out["stores"].append(await check_store(ctx, name, base, codes))
        await b.close()
    OUT.mkdir(exist_ok=True)
    (OUT / "cart_results.json").write_text(json.dumps(out, indent=1))
    print("wrote", OUT / "cart_results.json")

if __name__ == "__main__":
    asyncio.run(main())
