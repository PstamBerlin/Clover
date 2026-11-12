#!/usr/bin/env python3
"""Builds index.html (the whole Clover site in one self-contained file) from src/.

  src/site.html   the page, with /*CSS*/ /*DATA*/ /*ZIP*/ /*JS*/ slots
  src/site.css    the look
  src/site.js     the behaviour
  src/data.js     the seed codes, deals, always-on discounts, comparison table

It also zips extension/ into clover-extension.zip, the file the download
buttons point at.

Run:  python3 build_site.py        (from the repo root)
"""
import pathlib, subprocess, sys, zipfile

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
    out = (page
           .replace("/*CSS*/", read("site.css").strip())
           .replace("/*DATA*/", read("data.js").strip())
           .replace("/*JS*/", read("site.js").strip()))
    (ROOT / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html written: {len(out)/1024:.0f} KB")
    ext = ROOT / "extension"
    zpath = ROOT / "clover-extension.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(ext.rglob("*")):
            if f.is_file() and f.name != ".DS_Store":
                z.write(f, f.relative_to(ext))
    print(f"clover-extension.zip written: {zpath.stat().st_size/1024:.0f} KB")

if __name__ == "__main__":
    main()
