import asyncio, json, re
from playwright.async_api import async_playwright
SHIM = """
(() => {
  const store = { cloverSettings: {theme:'light', showOrb:'always', autoTry:false, confetti:false, mascot:true, creatorDeals:true, delay:700, position:'right', blocked:[], onlyThese:[], enabled:true},
                  cloverCodes: [{id:'a', store:'localhost', code:'SAVED20', note:'20 off'}] };
  const cloud = [
    {id:'id-test10', store:'localhost', code:'TEST10', works:3, fails:0},
    {id:'id-dead', store:'localhost', code:'DEAD1', works:0, fails:6},
    {id:'id-flat', store:'localhost', code:'FLAT5', works:1, fails:0},
    {id:'id-x', store:'localhost', code:'NOPE22', works:0, fails:1},
    {id:'id-tok', store:'localhost', code:'JB9MSKBZ', works:0, fails:0},
    {id:'id-other', store:'otherstore.com', code:'ELSEWHERE', works:5, fails:0}];
  window.__sent = [];
  window.chrome = {
    storage: { local: {
      get: (keys, cb) => { const out = {}; (Array.isArray(keys)?keys:[keys]).forEach(k => { if (k in store) out[k] = store[k]; }); setTimeout(() => cb(out), 0); },
      set: (obj, cb) => { Object.assign(store, obj); window.__store = store; cb && setTimeout(cb, 0); } } },
    runtime: { sendMessage: (msg, cb) => { window.__sent.push(msg); if (msg.type === 'clover_codes') setTimeout(() => cb({ok:true, data:cloud}), 50); else setTimeout(() => cb({ok:true}), 0); },
               openOptionsPage: () => {}, getURL: (p) => 'http://localhost:8766/' + p },
    tabs: { query: (q, cb) => cb([{url: location.href}]) }
  };
  window.__getStore = () => store;
})();"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        ctx = await b.new_context(viewport={"width":1100,"height":800})
        await ctx.add_init_script(SHIM)
        sh = await ctx.new_page()
        errs=[]; sh.on("pageerror", lambda e: errs.append(str(e)[:160]))
        await sh.goto("http://localhost:8765/checkout2.html")
        await sh.add_style_tag(url="http://localhost:8766/content.css")
        for f in ("settings.js","recipes.js","content.js"): await sh.add_script_tag(url=f"http://localhost:8766/{f}")
        await sh.wait_for_timeout(2500)
        r = {}
        r['badge'] = await sh.evaluate("(document.querySelector('.clover-badge')||{}).className")
        await sh.click(".clover-orb", force=True); await sh.wait_for_timeout(800)
        t0 = await sh.evaluate("Date.now()")
        await sh.click(".clover-go", force=True)
        for i in range(60):
            await sh.wait_for_timeout(500)
            txt = await sh.evaluate("document.querySelector('.clover-body').innerText")
            if 'You saved' in txt or 'No code worked' in txt: break
        t1 = await sh.evaluate("Date.now()")
        r['seconds'] = round((t1 - t0)/1000, 1)
        r['card'] = txt.replace("\n", " | ")
        log = await sh.evaluate("window.__log")
        tries = [l.split(':')[1] for l in log if l.startswith('try:')]
        r['tried_order'] = tries
        r['total_now'] = await sh.evaluate("document.getElementById('total').textContent")
        r['applied_now'] = await sh.evaluate("(document.querySelector('#applied')||{}).innerText")
        r['votes_sent'] = [m for m in await sh.evaluate("window.__sent") if m.get('type') == 'clover_vote']
        r['tried_memory'] = await sh.evaluate("(window.__getStore().cloverTried||{})")
        # gaps between first tries: must be >= delay 700ms
        stamps = [int(l.split(':')[2]) for l in log if l.startswith('try:')]
        gaps = [stamps[i+1]-stamps[i] for i in range(len(stamps)-1)]
        r['gaps_ms'] = gaps
        r['errors'] = errs
        print(json.dumps(r, indent=1, default=str))
        checks = {
            'saved_first': tries[:1] == ['SAVED20'],
            'dead_skipped': 'DEAD1' not in tries and 'ELSEWHERE' not in tries,
            'token_last': tries[4] == 'JB9MSKBZ',
            'best_applied': 'SAVED20' in r['applied_now'] and r['total_now'] == '€239.20',
            'saved_amount': '59.80' in r['card'],
            'vote_for_cloud_winners': sorted(v.get('id') for v in r['votes_sent']) == ['id-flat','id-test10'],
            'delay_honoured': all(g >= 650 for g in gaps),
            'fast_rejects': r['seconds'] < 40,
            'memory': bool(r['tried_memory'].get('localhost')),
            'no_errors': not errs,
        }
        for k, v in checks.items(): print(('PASS ' if v else 'FAIL ') + k)
        await b.close()
asyncio.run(main())
