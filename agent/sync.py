#!/usr/bin/env python3
"""Writes the checker's findings to the shared database.

  python3 agent/sync.py                 dry run: prints what it WOULD do
  python3 agent/sync.py --apply         does it

Reads agent/out/candidates.json (codes published on the stores' own sites) and
agent/out/cart_results.json (what happened in the carts).

- A candidate that is not in the shared list yet is ADDED (public key, the same
  insert anyone can do) with the label "Published on <store>'s own site" and the
  sentence it was found in. Pass --candidates-ok CODE,CODE to say which
  candidates the agent judged to be real codes; without it nothing is added.
- A cart result sets checker_at / checker_result / checker_note on the code.
  The public key may update exactly those three columns (agent/supabase.sql
  grants that column by column), so no secret key is needed. If a
  ~/.config/clover/service.env with CLOVER_SERVICE_KEY=... exists it is used
  instead, but nothing requires it.

The checker's result never turns a code green on the site: a person's vote is
the only thing that does. The site shows it as "Clover's checker ran this".
"""
import json, os, pathlib, sys, time, urllib.request, urllib.error

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"
SUPA = "https://zxsgxihknyexyzzpddmg.supabase.co/rest/v1"
ANON = "sb_publishable_wbAdbAS-TPcojUiQMNr-jg_Zv72DF7p"

def service_key():
    f = pathlib.Path.home() / ".config" / "clover" / "service.env"
    if not f.exists(): return None
    for line in f.read_text().splitlines():
        if line.startswith("CLOVER_SERVICE_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    return None

def req(method, path, body=None, key=ANON, prefer=None):
    h = {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    r = urllib.request.Request(SUPA + path, data=json.dumps(body).encode() if body is not None else None, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore")[:200]

def main():
    apply = "--apply" in sys.argv
    ok_list = set()
    for i, a in enumerate(sys.argv):
        if a == "--candidates-ok" and i + 1 < len(sys.argv):
            ok_list = {c.strip().upper() for c in sys.argv[i + 1].split(",") if c.strip()}
    status, rows = req("GET", "/code_stats?select=id,store,code,works,fails,checker_at,checker_result")
    columns = True
    if status == 400 and "checker_at" in str(rows):
        columns = False
        print("note: the checker columns are not in the database yet (run agent/supabase.sql in the Supabase SQL editor); results cannot be written")
        status, rows = req("GET", "/code_stats?select=id,store,code,works,fails")
    if status != 200:
        sys.exit(f"could not read the shared list: {status} {rows}")
    have = {(r["store"].lower(), (r["code"] or "").upper()): r for r in rows}
    today = time.strftime("%Y-%m-%d")

    # 1) new codes from the stores' own sites
    added = []
    try: cj = json.loads((OUT / "candidates.json").read_text())
    except Exception: cj = {"stores": {}}
    for store, entry in cj["stores"].items():
        for c in entry.get("candidates", []):
            code = c["code"]
            if code.upper() not in ok_list: continue
            if (store, code.upper()) in have: continue
            row = {"store": store, "code": code, "label": f"Published on {store}'s own site, {today}", "detail": c.get("context", "")[:180], "kind": "code"}
            if apply:
                st, body = req("POST", "/codes", row, prefer="return=representation")
                added.append((store, code, st))
                if st in (200, 201) and body: have[(store, code.upper())] = body[0]
            else:
                added.append((store, code, "would add"))
    for a in added: print("add:", a)

    # 2) cart results
    key = service_key()
    try: cr = json.loads((OUT / "cart_results.json").read_text())
    except Exception: cr = {"stores": []}
    writes = []
    for s in cr["stores"]:
        for r in s.get("results", []):
            if r["result"] not in ("ok", "fail"): continue
            row = have.get((s["store"].lower(), r["code"].upper()))
            if not row: continue
            note = f"{s['store']} cart with {s.get('product') or 'an item'} ({s.get('start_total')})" + (f": saved {r['saving']}" if r["result"] == "ok" else f": shop said {r.get('shop_said') or 'no'}; a code for other items would fail here too")
            patch = {"checker_at": cr.get("ran", today), "checker_result": r["result"], "checker_note": note[:200]}
            if apply and columns:
                st, body = req("PATCH", f"/codes?id=eq.{row['id']}", patch, key=key or ANON, prefer="return=minimal")
                writes.append((s["store"], r["code"], r["result"], st if st in (200, 204) else f"{st} {body}"))
            else:
                writes.append((s["store"], r["code"], r["result"], "would write" if columns else "no checker columns yet"))
    for w in writes: print("checker:", w)
    print(f"{'applied' if apply else 'dry run'}: {len(added)} to add, {len(writes)} checker results")

if __name__ == "__main__":
    main()
