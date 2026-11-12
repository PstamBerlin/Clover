#!/usr/bin/env python3
"""Builds index.html (the whole Clover site in one self-contained file) from src/.

  src/site.html   the page, with /*CSS*/ /*DATA*/ /*ZIP*/ /*JS*/ slots
  src/site.css    the look
  src/site.js     the behaviour
  src/data.js     the seed codes, deals, always-on discounts, comparison table
  src/zip.b64.txt the extension zip, base64, so the download button needs no server
                  (refresh it with: zip -r - extension | base64 > src/zip.b64.txt)

Run:  python3 build_site.py        (from the repo root)
"""
import pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"

def read(name):
    return (SRC / name).read_text(encoding="utf-8")

def main():
    for f in ("site.js", "data.js"):
        r = subprocess.run(["node", "--check", str(SRC / f)], capture_output=True, text=True)
        if r.returncode:
            sys.exit(f"{f} does not parse:\n{r.stderr}")
    page = read("site.html")
    zip_b64 = read("zip.b64.txt").strip()
    if not re.fullmatch(r"[A-Za-z0-9+/=]+", zip_b64):
        sys.exit("src/zip.b64.txt is not base64")
    out = (page
           .replace("/*CSS*/", read("site.css").strip())
           .replace("/*DATA*/", read("data.js").strip())
           .replace("/*ZIP*/", 'const CLOVER_ZIP = "' + zip_b64 + '";')
           .replace("/*JS*/", read("site.js").strip()))
    (ROOT / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html written: {len(out)/1024:.0f} KB")

if __name__ == "__main__":
    main()
