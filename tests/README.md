# Tests

All need Python 3, `pip install playwright`, and Google Chrome installed.

- `site_test.py` — the built site: stats, search, votes, adding a code, storage migration, download, phone width.
  `python3 tests/site_test.py`
- `extension_mechanics_test.py` — the extension on a fake checkout (`shop/checkout2.html`) that accepts two codes,
  rejects the rest, removes codes and updates the total: order of attempts, early rejects, the delay setting,
  the memory of what failed, votes for every code that lowered the total.
- `extension_look_test.py` — popup, settings page and the on-page card in light and dark, with screenshots.

The two extension tests serve `extension/` and `tests/shop/` on local ports and inject a stand-in for Chrome's
extension APIs, because Chrome no longer side-loads extensions from the command line. The stand-in reads the
shared database but never writes to it. Start the servers first:

    (cd tests/shop && python3 -m http.server 8765 &) ; (cd extension && python3 -m http.server 8766 &)
