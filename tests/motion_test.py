"""Clover site motion check. Run: python3 tests/motion_test.py   (after python3 build_site.py)
Loads the built index.html in headless Chrome (database POSTs stubbed) and checks that the motion plays,
that nothing stays hidden, and that people who ask for less motion get a plain page."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = "file://" + str(ROOT / "index.html")
OUT = ROOT / "tests" / "shots"; OUT.mkdir(exist_ok=True)
STUB = """(() => { const orig = window.fetch.bind(window); window.fetch = (u, o) => (o && o.method === 'POST') ? Promise.resolve(new Response('[{"id":"test-id"}]', {status:201, headers:{'Content-Type':'application/json'}})) : orig(u, o); })();"""
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + ((" " + str(extra)) if extra != "" else ""))
    if not ok: fails.append(name)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        ctx = await b.new_context(viewport={"width": 1280, "height": 900}); await ctx.add_init_script(STUB)
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(PAGE, wait_until="commit"); await pg.wait_for_function("document.querySelector('.hero h1 .ch')")
        await pg.wait_for_timeout(450)
        early = await pg.evaluate("""(() => { const ch = [...document.querySelectorAll('.hero h1 .ch')]; return { letters: ch.length, label: document.querySelector('.hero h1').getAttribute('aria-label'),
          lastLetterOpacity: parseFloat(getComputedStyle(ch[ch.length - 1]).opacity), motion: document.documentElement.classList.contains('motion'), hidden: document.querySelectorAll('.rv').length,
          statsOpacity: parseFloat(getComputedStyle(document.querySelector('.stats')).opacity), codes: document.getElementById('s-codes').textContent }; })()""")
        check("hero word is six letters coming in one by one, still read as one word", early["letters"] == 6 and early["label"] == "clover" and early["lastLetterOpacity"] < 1, early)
        check("sections wait hidden, the stat strip has not arrived yet", early["motion"] and early["hidden"] > 20 and early["statsOpacity"] < 0.2 and early["codes"] == "0", early)
        await pg.screenshot(path=str(OUT / "m1-load-early.png"))
        try:
            await pg.wait_for_function("(() => { const n = parseInt(document.getElementById('s-codes').textContent), live = getCodes().filter(isLive).length; return n > 0 && n < live; })()", timeout=4000, polling=30)
            mid = await pg.evaluate("[parseInt(document.getElementById('s-codes').textContent), getCodes().filter(isLive).length, Math.round(performance.now())]")
        except Exception:
            mid = [None, None, None]
        check("the numbers count up, and only once the stat strip is arriving", mid[0] is not None and mid[2] >= 1200, mid)
        await pg.screenshot(path=str(OUT / "m2-load-mid.png"))
        await pg.wait_for_timeout(1900)
        done = await pg.evaluate("""(() => ({ codes: parseInt(document.getElementById('s-codes').textContent), live: getCodes().filter(isLive).length,
          stores: parseInt(document.getElementById('s-stores').textContent), liveStores: new Set(getCodes().filter(isLive).map(c => c.store)).size,
          aboutHidden: document.querySelectorAll('#about > .rv:not(.in)').length, getHidden: document.querySelectorAll('#get > .rv:not(.in)').length,
          letterOpacity: getComputedStyle(document.querySelector('.hero h1 .ch')).opacity }))()""")
        check("the numbers end on the real counts", done["codes"] == done["live"] and done["stores"] == done["liveStores"], done)
        check("the first section has come in, a far one still waits", done["aboutHidden"] == 0 and done["getHidden"] > 0, done)
        await pg.screenshot(path=str(OUT / "m3-load-done.png"))
        # scroll: the codes section, its cards, the bar's pill
        await pg.evaluate("document.getElementById('codes').scrollIntoView()"); await pg.wait_for_timeout(250)
        await pg.screenshot(path=str(OUT / "m4-codes-arriving.png"))
        await pg.wait_for_timeout(2200)
        sec = await pg.evaluate("""(() => { const a = document.querySelector('#bar nav a.on'), pill = document.querySelector('.navpill');
          return { rvLeft: document.querySelectorAll('#codes > .rv').length, on: a && a.getAttribute('href'), pillShow: pill.classList.contains('show'),
                   pill: [Math.round(parseFloat(pill.style.left)), Math.round(parseFloat(pill.style.width))], link: a ? [a.offsetLeft, a.offsetWidth] : null,
                   cardOpacity: getComputedStyle(document.querySelector('#list .code')).opacity }; })()""")
        check("the codes section is fully there and is an ordinary section again", sec["rvLeft"] == 0 and sec["cardOpacity"] == "1", sec)
        check("the bar's pill sits under Codes", sec["on"] == "#codes" and sec["pillShow"] and sec["pill"] == sec["link"], sec)
        await pg.evaluate("document.getElementById('stores').scrollIntoView()")
        await pg.wait_for_function("document.querySelector('.navpill').classList.contains('stretch')", timeout=3000)
        st = await pg.evaluate("(() => { const p = document.querySelector('.navpill'); return [p.className, Math.round(parseFloat(p.style.width))]; })()")
        await pg.wait_for_timeout(1100)
        sec2 = await pg.evaluate("(() => { const a = document.querySelector('#bar nav a.on'), p = document.querySelector('.navpill'); return { on: a.getAttribute('href'), pill: [Math.round(parseFloat(p.style.left)), Math.round(parseFloat(p.style.width))], link: [a.offsetLeft, a.offsetWidth], cls: p.className }; })()")
        check("the pill stretches across both links, then settles under Stores", "stretch" in st[0] and st[1] > sec["link"][1] + 20 and sec2["on"] == "#stores" and sec2["pill"] == sec2["link"] and "settle" in sec2["cls"], [st, sec2])
        # a vote: feedback on that card, no cascade for the others
        await pg.evaluate("document.getElementById('codes').scrollIntoView()"); await pg.wait_for_timeout(900)
        await pg.click("#list .code .vote.up"); await pg.wait_for_timeout(120)
        v = await pg.evaluate("""(() => { const cards = [...document.querySelectorAll('#list .code')]; const voted = cards.find(c => c.querySelector('.vote.up.pop'));
          return { pop: !!voted, floaty: voted ? (voted.querySelector('.floaty') || {}).textContent : null, still: cards.filter(c => c.classList.contains('still')).length, n: cards.length }; })()""")
        check("a vote pops its button and floats a +1", v["pop"] and v["floaty"] == "+1", v)
        await pg.screenshot(path=str(OUT / "m5-vote.png"))
        await pg.wait_for_timeout(1100)
        check("the +1 is gone again", await pg.evaluate("document.querySelectorAll('.floaty').length") == 0)
        await pg.fill("#search", "anycubic"); await pg.wait_for_timeout(150)
        fresh = await pg.evaluate("[...document.querySelectorAll('#list .code')].filter(c => !c.classList.contains('still')).length")
        check("a new list (a search) cascades in", fresh > 0, fresh)
        await pg.fill("#search", ""); await pg.wait_for_timeout(700)
        await pg.click("#list .code .vote.up"); await pg.wait_for_timeout(150)   # takes the vote back: the list is the same list
        again = await pg.evaluate("(() => { const c = [...document.querySelectorAll('#list .code')]; return [c.filter(x => x.classList.contains('still')).length, c.length]; })()")
        check("a redraw of the same list does not replay the cascade", again[0] == again[1] and again[1] > 0, again)
        # the introduction drawer
        await pg.evaluate("document.getElementById('about').scrollIntoView()"); await pg.wait_for_timeout(500)
        h0 = await pg.evaluate("document.getElementById('introrest').getBoundingClientRect().height")
        await pg.click("#readmore"); await pg.wait_for_timeout(800)
        h1 = await pg.evaluate("[document.getElementById('introrest').getBoundingClientRect().height, getComputedStyle(document.getElementById('introrest')).visibility]")
        await pg.click("#readmore"); await pg.wait_for_timeout(800)
        h2 = await pg.evaluate("[document.getElementById('introrest').getBoundingClientRect().height, getComputedStyle(document.getElementById('introrest')).visibility]")
        check("Read more opens the drawer and closes it again", h0 < 2 and h1[0] > 100 and h1[1] == "visible" and h2[0] < 2 and h2[1] == "hidden", [h0, h1, h2])
        # every section, top to bottom: nothing stays hidden
        for sid in ["add", "stores", "why", "always", "get"]:
            await pg.evaluate("(id) => document.getElementById(id).scrollIntoView()", sid); await pg.wait_for_timeout(350)
        await pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); await pg.wait_for_timeout(2300)
        left = await pg.evaluate("[document.querySelectorAll('.rv').length, [...document.querySelectorAll('main .block')].filter(b => getComputedStyle(b.firstElementChild).opacity !== '1').length]")
        check("after scrolling through, nothing is left hidden", left == [0, 0], left)
        # the look is untouched: Clover's green (--spring) is still a colour, and dark pills still have readable labels
        look = await pg.evaluate("""(() => { const cs = getComputedStyle(document.documentElement); const pill = document.querySelector('#list .code .code-pill'), chip = document.querySelector('.chip.on');
          return { spring: cs.getPropertyValue('--spring').trim(), bounce: cs.getPropertyValue('--bounce').trim().slice(0, 7), pill: getComputedStyle(pill).color, chip: getComputedStyle(chip).color }; })()""")
        check("the green is still a colour and the labels on dark pills are readable", look["spring"].upper() == "#86EFAC" and look["bounce"] == "linear(" and look["pill"] == "rgb(134, 239, 172)" and look["chip"] == "rgb(134, 239, 172)", look)
        check("no errors on the page", not errs, errs[:3])
        await ctx.close()
        # less motion asked for: a plain page, everything there at once
        ctx2 = await b.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce"); await ctx2.add_init_script(STUB)
        p2 = await ctx2.new_page(); await p2.goto(PAGE, wait_until="commit"); await p2.wait_for_function("document.getElementById('s-codes').textContent !== ''"); await p2.wait_for_timeout(300)
        calm = await p2.evaluate("""(() => ({ motion: document.documentElement.classList.contains('motion'), rv: document.querySelectorAll('.rv').length, letters: document.querySelectorAll('.hero h1 .ch').length,
          h1: document.querySelector('.hero h1').textContent, codes: parseInt(document.getElementById('s-codes').textContent), live: getCodes().filter(isLive).length,
          barAnim: getComputedStyle(document.getElementById('bar')).animationName, getOpacity: getComputedStyle(document.querySelector('#get').firstElementChild).opacity }))()""")
        check("less motion: nothing hidden, no letter spans, numbers there at once, no animation", not calm["motion"] and calm["rv"] == 0 and calm["letters"] == 0 and calm["h1"] == "clover" and calm["codes"] == calm["live"] and calm["barAnim"] == "none" and calm["getOpacity"] == "1", calm)
        await ctx2.close()
        # the guide and the 89 cents page: sections rise in as you reach them, nothing stays hidden, plain with less motion
        for name in ("clover-guide.html", "89-cents.html"):
            c4 = await b.new_context(viewport={"width": 1280, "height": 900}); p4 = await c4.new_page(); e4 = []
            p4.on("pageerror", lambda e: e4.append(str(e)))
            await p4.goto("file://" + str(ROOT / name)); await p4.wait_for_timeout(300)
            start = await p4.evaluate("[document.documentElement.classList.contains('motion'), document.querySelectorAll('main .rv').length, document.querySelectorAll('main > section').length]")
            steps = await p4.evaluate("Math.ceil(document.body.scrollHeight / 600)")
            for i in range(steps + 1):
                await p4.evaluate("(y) => window.scrollTo(0, y)", i * 600); await p4.wait_for_timeout(120)
            await p4.wait_for_timeout(2000)
            end = await p4.evaluate("[document.querySelectorAll('main .rv').length, [...document.querySelectorAll('main > section > *')].filter(e => getComputedStyle(e).opacity !== '1').length]")
            check(name + ": sections wait, then everything is shown", start[0] and start[1] > 5 and end == [0, 0] and not e4, [start, end, e4[:2]])
            await c4.close()
            c5 = await b.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce"); p5 = await c5.new_page()
            await p5.goto("file://" + str(ROOT / name)); await p5.wait_for_timeout(300)
            plain = await p5.evaluate("[document.documentElement.classList.contains('motion'), document.querySelectorAll('.rv').length]")
            check(name + ": plain with less motion", plain == [False, 0], plain)
            await c5.close()
        # a phone: no sideways scroll, and the pill follows in the scrolling bar
        ctx3 = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True); await ctx3.add_init_script(STUB)
        p3 = await ctx3.new_page(); await p3.goto(PAGE, wait_until="networkidle"); await p3.wait_for_timeout(2600)
        await p3.evaluate("document.getElementById('get').scrollIntoView()"); await p3.wait_for_timeout(1500)
        ph = await p3.evaluate("""(() => { const nav = document.querySelector('#bar nav'), a = nav.querySelector('a.on'), p = document.querySelector('.navpill'); const ar = a && a.getBoundingClientRect(), nr = nav.getBoundingClientRect();
          return { overflow: document.documentElement.scrollWidth > window.innerWidth, on: a && a.getAttribute('href'), linkInView: a ? ar.left >= nr.left - 1 && ar.right <= nr.right + 1 : false, pill: p.classList.contains('show') }; })()""")
        check("phone: no sideways scroll, the pill is on Get the extension and that link is in view", not ph["overflow"] and ph["on"] == "#get" and ph["linkInView"] and ph["pill"], ph)
        await p3.screenshot(path=str(OUT / "m6-phone.png"))
        await b.close()
    print("\n%d failures" % len(fails)); sys.exit(1 if fails else 0)
asyncio.run(main())
