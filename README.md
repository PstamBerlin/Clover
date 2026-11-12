# Clover 🍀
A browser extension that tries coupon codes at checkout — and a code only turns green when a **real person** confirms it worked. No affiliate-link swapping, no cashback skimming, no tricks.

Made by Peter (11), Berlin.

- `extension/` — the browser extension (Chrome / Firefox / Android)
- `index.html` — the Clover website

Community coupon codes are served from a Supabase backend.

## Building the site

`index.html` is generated. Edit the parts in `src/` and run:

    python3 build_site.py

- `src/site.html` the page, `src/site.css` the look, `src/site.js` the behaviour
- `src/data.js` the starter codes, creator deals, always-on discounts and the comparison table
- `src/zip.b64.txt` the extension zip as base64 (refresh after changing `extension/`:
  `cd extension && zip -r - . | base64 > ../src/zip.b64.txt`)
- `fonts/` Manrope and Unbounded, shipped with the site (SIL Open Font License)

The look: Clover's greens in the grammar of the Aurora look (mesh, frosted
glass, one butter-yellow accent, Unbounded + Manrope). Votes and added codes
go to the shared Supabase database; what this browser did (its own votes,
its own codes, requests, referral links, the theme) stays in localStorage.
