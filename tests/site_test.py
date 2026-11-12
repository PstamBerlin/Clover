"""Clover site check. Run from anywhere: python3 tests/site_test.py
Loads the built index.html in headless Chrome with the database's POST calls
stubbed (reads are real), exercises the main behaviours and prints a report.
Needs: pip install playwright, and Google Chrome installed."""
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = "file://" + str(ROOT / "index.html")
STUB = """
(() => { const orig = window.fetch.bind(window);
  window.__posts = [];
  window.fetch = (u, o) => { if (o && o.method === 'POST') { window.__posts.push(String(u)); return Promise.resolve(new Response('[{"id":"test-id"}]', {status:201, headers:{'Content-Type':'application/json'}})); } return orig(u, o); };
})();"""
OLD_LIST = """
(() => {
  // what the first version of the site left behind: the whole list with random ids
  const old = [{id:"seedabc1", store:"anycubic.com", code:"ACSUN20", up:1, down:0, seed:true, sid:"s1"},
               {id:"xyz9", store:"example.com", code:"OLDMINE5", note:"5 off", up:0, down:0, at:1}];
  localStorage.setItem("clover-codes-v2", JSON.stringify(old));
  localStorage.setItem("clover-mine", JSON.stringify(["xyz9"]));
  localStorage.setItem("clover-voted", JSON.stringify({seedabc1:"up"}));
})();"""
async def main():
    ok = True
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        ctx = await b.new_context(viewport={"width":1280,"height":820})
        await ctx.add_init_script(STUB)
        pg = await ctx.new_page()
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:160]))
        await pg.goto(PAGE, wait_until="networkidle"); await pg.wait_for_timeout(2500)
        r = {}
        r['stats'] = await pg.evaluate("[...document.querySelectorAll('.stat')].map(e=>e.querySelector('b').textContent+' '+e.querySelector('span').textContent)")
        r['codes_shown'] = await pg.evaluate("document.querySelectorAll('#list .code').length")
        r['first'] = await pg.evaluate("document.querySelector('#list .code .code-store').textContent+' '+document.querySelector('#list .code .code-pill').textContent")
        r['no_worked_today_on_load'] = await pg.evaluate("![...document.querySelectorAll('.proof')].some(e=>/worked today/.test(e.textContent))")
        await pg.fill("#search", "anycubic"); await pg.wait_for_timeout(400)
        r['search'] = await pg.evaluate("[...new Set([...document.querySelectorAll('#list .code .code-store')].map(e=>e.textContent))]")
        await pg.fill("#search", ""); await pg.wait_for_timeout(300)
        # vote, undo, and the one POST
        await pg.click("#list .code .vote.up"); await pg.wait_for_timeout(300)
        r['after_vote'] = await pg.evaluate("document.querySelector('#list .code .vote.up').className")
        await pg.click("#list .code .vote.up"); await pg.wait_for_timeout(300)
        r['after_undo'] = await pg.evaluate("document.querySelector('#list .code .vote.up').className")
        r['posts'] = await pg.evaluate("window.__posts")
        # add a code: jumps to the store, shows own buttons, persists, and ids are stable
        await pg.fill("#f-store", "example.com"); await pg.fill("#f-code", "TESTCODE10"); await pg.fill("#f-note", "10% off everything")
        await pg.click("#save"); await pg.wait_for_timeout(700)
        r['add_status'] = await pg.evaluate("document.getElementById('status').textContent")
        r['added_visible_with_own_buttons'] = await pg.evaluate("[...document.querySelectorAll('#list .code')].some(e=>e.textContent.includes('TESTCODE10') && e.querySelector('.own.edit'))")
        await pg.reload(wait_until="networkidle"); await pg.wait_for_timeout(2000)
        r['after_reload_has_added'] = await pg.evaluate("getCodes().some(c=>c.code==='TESTCODE10' && c.own)")
        r['stored_keys'] = await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('clover')).sort()")
        r['old_list_not_stored'] = await pg.evaluate("localStorage.getItem('clover-codes-v2')===null")
        # download is a real file
        r['download_href'] = await pg.evaluate("document.querySelector('a[download]').getAttribute('href')")
        r['zip_exists'] = (ROOT / "clover-extension.zip").exists()
        r['no_board'] = await pg.evaluate("!document.getElementById('board')")
        # mobile
        await pg.set_viewport_size({"width":390,"height":844}); await pg.wait_for_timeout(400)
        r['mobile_overflow'] = await pg.evaluate("document.documentElement.scrollWidth > window.innerWidth")
        r['errors'] = errs
        await ctx.close()
        # migration from the first version's storage
        ctx2 = await b.new_context(viewport={"width":1280,"height":820})
        await ctx2.add_init_script(STUB); await ctx2.add_init_script(OLD_LIST)
        pg2 = await ctx2.new_page()
        await pg2.goto(PAGE, wait_until="networkidle"); await pg2.wait_for_timeout(2500)
        r['migrated_mine'] = await pg2.evaluate("getCodes().some(c=>c.code==='OLDMINE5' && c.own)")
        r['migrated_vote'] = await pg2.evaluate("JSON.stringify(voted['anycubic.com|acsun20'])")
        r['old_keys_dropped'] = await pg2.evaluate("['clover-codes-v2','clover-mine','clover-voted'].every(k=>localStorage.getItem(k)===null)")
        await ctx2.close(); await b.close()
    checks = {
      'stats': r['stats'][2].startswith(('high','mixed','low')) and 'early' in r['stats'][2] or '%' in r['stats'][2],
      'list': r['codes_shown'] == 8, 'search': r['search'] == ['anycubic.com'], 'dates': r['no_worked_today_on_load'],
      'vote': 'chosen' in r['after_vote'] and 'chosen' not in r['after_undo'] and len(r['posts']) == 1,
      'add': r['added_visible_with_own_buttons'] and r['after_reload_has_added'] and r['old_list_not_stored'],
      'download': r['download_href'] == 'clover-extension.zip' and r['zip_exists'], 'board_gone': r['no_board'],
      'mobile': not r['mobile_overflow'], 'errors': not r['errors'],
      'migration': r['migrated_mine'] and r['migrated_vote'] is not None and r['old_keys_dropped'],
    }
    print(json.dumps(r, indent=1))
    for k, v in checks.items(): print(("PASS " if v else "FAIL ") + k)
    sys.exit(0 if all(checks.values()) else 1)
asyncio.run(main())
