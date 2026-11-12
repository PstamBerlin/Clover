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
- `clover-extension.zip` is written by the same build from `extension/`; the download buttons point at it
- `fonts/` Manrope and Unbounded, shipped with the site (SIL Open Font License)

Tests (needs Python 3 and Playwright with Chrome): `python3 tests/site_test.py`.
They stub the database's write calls, so no test vote ever reaches the shared list.

The look: Clover's greens in the grammar of the Aurora look (mesh, frosted
glass, one butter-yellow accent, Unbounded + Manrope). Votes and added codes
go to the shared Supabase database. The browser keeps only what the person
did here (their own codes, votes, requests, referral links, the theme); the
list itself is rebuilt from the seed and the database on every load.
