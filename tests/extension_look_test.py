import asyncio, json
from playwright.async_api import async_playwright
SHIM = """
(() => {
  const SUPA = 'https://zxsgxihknyexyzzpddmg.supabase.co/rest/v1/code_stats?select=*';
  const H = {apikey:'sb_publishable_wbAdbAS-TPcojUiQMNr-jg_Zv72DF7p', Authorization:'Bearer sb_publishable_wbAdbAS-TPcojUiQMNr-jg_Zv72DF7p'};
  const store = { cloverSettings: window.__settings || {theme:'light', showOrb:'always'} };
  window.__sent = [];
  window.chrome = {
    storage: { local: {
      get: (keys, cb) => { const out = {}; (Array.isArray(keys)?keys:[keys]).forEach(k => { if (k in store) out[k] = store[k]; }); setTimeout(() => cb(out), 0); },
      set: (obj, cb) => { Object.assign(store, obj); cb && setTimeout(cb, 0); } } },
    runtime: {
      sendMessage: (msg, cb) => { window.__sent.push(msg.type);
        if (msg.type === 'clover_codes') fetch(SUPA, {headers: H}).then(r => r.json()).then(d => cb({ok:true, data:d})).catch(() => cb({ok:false}));
        else setTimeout(() => cb({ok:true}), 0); },
      openOptionsPage: () => {}, getURL: (p) => 'http://localhost:8766/' + p },
    tabs: { query: (q, cb) => setTimeout(() => cb([{url:'https://www.anycubic.com/checkouts/cn/abc'}]), 0) }
  };
})();"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        r = {}
        for theme in ("light", "dark"):
            ctx = await b.new_context(viewport={"width":360,"height":640})
            await ctx.add_init_script(f"window.__settings = {{theme:'{theme}', showOrb:'always', autoTry:false, confetti:true, mascot:true, creatorDeals:true, delay:600, position:'right', blocked:[], onlyThese:[], enabled:true}};")
            await ctx.add_init_script(SHIM)
            pg = await ctx.new_page()
            errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:120]))
            await pg.goto("http://localhost:8766/popup.html"); await pg.wait_for_timeout(2500)
            r[f'popup_{theme}_dark_class'] = await pg.evaluate("document.body.classList.contains('dark')")
            r[f'popup_{theme}_fonts'] = await pg.evaluate("[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight)")
            await pg.screenshot(path=f"ext-popup-{theme}-saved.png")
            await pg.click('.tab[data-tab="community"]'); await pg.wait_for_timeout(3500)
            r[f'popup_{theme}_community'] = await pg.evaluate("document.querySelectorAll('#community-list .code').length + ' cards in ' + document.querySelectorAll('#community-list .cstore').length + ' stores; first open: ' + (document.querySelector('.cstore:not(.collapsed) .cstore-name')||{}).textContent")
            await pg.screenshot(path=f"ext-popup-{theme}-community.png")
            await pg.click('.tab[data-tab="add"]'); await pg.wait_for_timeout(400)
            await pg.screenshot(path=f"ext-popup-{theme}-add.png")
            r[f'popup_{theme}_errors'] = errs
            # options
            op = await ctx.new_page(); await op.set_viewport_size({"width":900,"height":900})
            await op.goto("http://localhost:8766/options.html"); await op.wait_for_timeout(1500)
            r[f'options_{theme}_dark_class'] = await op.evaluate("document.body.classList.contains('dark')")
            await op.screenshot(path=f"ext-options-{theme}.png")
            # the card on the fake checkout
            sh = await ctx.new_page(); await sh.set_viewport_size({"width":1100,"height":800})
            sherr=[]; sh.on("pageerror", lambda e: sherr.append(str(e)[:140]))
            await sh.goto("http://localhost:8765/checkout.html")
            await sh.add_style_tag(url="http://localhost:8766/content.css")
            for f in ("settings.js","recipes.js","content.js"): await sh.add_script_tag(url=f"http://localhost:8766/{f}")
            await sh.wait_for_timeout(3000)
            r[f'card_{theme}_badge'] = await sh.evaluate("(document.querySelector('.clover-badge')||{}).className")
            if await sh.evaluate("!!document.querySelector('.clover-badge')"):
                await sh.click(".clover-orb", force=True); await sh.wait_for_timeout(1200)
                await sh.screenshot(path=f"ext-card-{theme}-open.png", clip={"x":700,"y":200,"width":400,"height":600})
                r[f'card_{theme}_text'] = await sh.evaluate("document.querySelector('.clover-body').innerText.replace(/\\n/g,' | ')")
                await sh.click(".clover-go", force=True); await sh.wait_for_timeout(2200)
                await sh.screenshot(path=f"ext-card-{theme}-trying.png", clip={"x":700,"y":200,"width":400,"height":600})
                r[f'card_{theme}_trying'] = await sh.evaluate("document.querySelector('.clover-body').innerText.replace(/\\n/g,' | ').slice(0,140)")
                await sh.wait_for_timeout(9000)
                await sh.screenshot(path=f"ext-card-{theme}-done.png", clip={"x":700,"y":200,"width":400,"height":600})
                r[f'card_{theme}_done'] = await sh.evaluate("document.querySelector('.clover-body').innerText.replace(/\\n/g,' | ').slice(0,200)")
            r[f'card_{theme}_sent'] = await sh.evaluate("window.__sent")
            r[f'card_{theme}_errors'] = sherr
            await ctx.close()
        print(json.dumps(r, indent=1))
        await b.close()
asyncio.run(main())
