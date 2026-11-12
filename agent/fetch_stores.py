#!/usr/bin/env python3
"""Reads each store's OWN pages (agent/stores.json) and lists codes they publish.

Writes agent/out/candidates.json:
  {"fetched": "...", "stores": {"anycubic.com": {"pages": [{"url":..., "status":..., "blocked": false}],
                                                 "candidates": [{"code": "ACMCPS5", "context": "...use code ACMCPS5 at checkout..."}]}}}

Only the store's own site is read, with a plain, honest User-Agent. A bot wall
(403, Cloudflare, captcha) is recorded as blocked and left alone. Candidates are
rough: the agent (GLM) decides which are real coupon codes and which are SKUs.
"""
import json, re, sys, pathlib, time, urllib.request, urllib.error, html

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"
UA = "CloverChecker/0.1 (reads a shop's own published promotions; clover.peterstam.eu)"

# In the readable text: "use code X", "with code X", "promo code: X", "Code X at checkout",
# "Gutscheincode X". A promo word has to sit within a few words BEFORE the code,
# so "Code Freer" in a slogan does not count.
CODE_RX = re.compile(r"(?:use|using|with|enter|apply|promo|coupon|discount|voucher|sale|offer|deal|save|off|gutschein|rabatt|aktions|checkout)[^.!?\n]{0,40}?\bcode\s*[:\-]?\s*[\"'“”]?([A-Z][A-Za-z0-9]{3,15})\b", re.I)
# Inside the page's scripts and JSON: "code":"X", "discount_code":"X", "coupon":"X"
JSON_RX = re.compile(r"[\"'](?:code|discount_code|discountCode|coupon|coupon_code|promo_code|promoCode)[\"']\s*:\s*[\"']([A-Z][A-Z0-9]{3,15})[\"']")
SKU_RX = re.compile(r"^\d{8,}$|^[0-9]+$")
NOISE = {"CODE", "HTML", "JSON", "HTTP", "HTTPS", "UTF", "NULL", "TRUE", "FALSE", "YOUR", "THIS", "THAT", "WITH", "ENTER", "PROMO", "COUPON", "DISCOUNT", "CHECKOUT", "APPLY", "HERE", "BELOW", "ABOVE"}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            body = r.read(3_000_000).decode("utf-8", "ignore")
            return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:
        return "error", str(e)[:120]

def text_of(body):
    body = re.sub(r"<script.*?</script>|<style.*?</style>", " ", body, flags=re.S | re.I)
    body = re.sub(r"<[^>]+>", " ", body)
    return html.unescape(re.sub(r"\s+", " ", body))

def data_text(raw):
    """The page's scripts and JSON as readable text: Shopify keeps its banners
    and sale titles there, with \u003c-style escapes and \/ slashes."""
    t = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), raw)
    t = t.replace("\\/", "/").replace("\\n", " ")
    t = re.sub(r"<[^>]+>", " ", t)
    return html.unescape(re.sub(r"\s+", " ", t))

def candidates(text, raw=""):
    out = {}
    hits = [(m.group(1), text[max(0, m.start() - 90): m.end() + 90].strip()) for m in CODE_RX.finditer(text)]
    deep = data_text(raw) if raw else ""
    hits += [(m.group(1), "in the page's data: " + deep[max(0, m.start() - 90): m.end() + 60].strip()) for m in CODE_RX.finditer(deep)]
    hits += [(m.group(1), "in the page's script: " + raw[max(0, m.start() - 80): m.end() + 60].strip()) for m in JSON_RX.finditer(raw)]
    for code, ctx in hits:
        up = code.upper()
        if up in NOISE or SKU_RX.match(code) or len(code) < 4:
            continue
        # must contain at least one letter and look like a code, not a word in a sentence
        if not re.search(r"[A-Z]", code):
            continue
        if code.islower() or (code.isalpha() and code.istitle()):
            continue   # "Freer", "Checkout": a word, not a code
        if re.search(r"[a-z]", code) and not re.search(r"\d", code):
            continue   # "ButtonColor": a name from the page's code, not a coupon
        if up not in out:
            out[up] = {"code": code, "context": ctx}
    return list(out.values())

def main():
    stores = json.loads((HERE / "stores.json").read_text())["stores"]
    only = sys.argv[1:]   # optional: store names to limit the run
    result = {"fetched": time.strftime("%Y-%m-%d %H:%M"), "stores": {}}
    for name, info in stores.items():
        if only and name not in only:
            continue
        entry = {"pages": [], "candidates": []}
        seen = set()
        for url in info.get("pages", []):
            status, body = fetch(url)
            blocked = status in (403, 429, 503) or bool(re.search(r"cloudflare|attention required|just a moment|captcha", body[:5000], re.I))
            entry["pages"].append({"url": url, "status": status, "blocked": blocked, "chars": len(body) if isinstance(status, int) else 0})
            if status == 200 and not blocked:
                for c in candidates(text_of(body), body):
                    if c["code"].upper() not in seen:
                        seen.add(c["code"].upper())
                        c["found_on"] = url
                        entry["candidates"].append(c)
            time.sleep(1.5)   # polite
        result["stores"][name] = entry
        print(f"{name:18s} pages {len(entry['pages'])}  blocked {sum(p['blocked'] for p in entry['pages'])}  candidates {len(entry['candidates'])}")
    OUT.mkdir(exist_ok=True)
    (OUT / "candidates.json").write_text(json.dumps(result, indent=1))
    print("wrote", OUT / "candidates.json")

if __name__ == "__main__":
    main()
