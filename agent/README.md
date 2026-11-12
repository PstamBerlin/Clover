# Clover's checker

The agent that keeps the shared code list honest. Twice a week (Monday and
Thursday, 16:30) GLM runs inside OpenCode, follows `BRIEF.md`, and:

1. reads each store's **own** pages for published codes (`fetch_stores.py`),
2. judges which of those are real codes,
3. puts the shared list's codes and the new ones through a **real cart** on the
   Shopify shops (`cart_check.py`): the total drops or the shop says no,
4. writes the results to the shared database (`sync.py`): new codes, and the
   checker's date and result on each code,
5. leaves a short report in `logs/`.

On the site that shows as **"Clover's checker ran this N days ago"**: below a
person's test, never green. A person's vote is the only thing that turns a code
green, and that stays so.

## What it refuses to do

No coupon aggregators (they wall robots off, and Clover does not go around
walls). No buying: the cart check never enters an email, address or payment.
No guessing: a code that neither dropped the total nor got a "no" is written as
nothing at all.

## Setting it up (Peter)

1. Supabase > SQL editor: paste `supabase.sql` and run it (three columns, the
   view, and a column-level grant so the public key may write exactly those
   three columns; no secret key is needed anywhere).
2. `pip install playwright` once (Google Chrome is used, nothing else downloaded).
3. Turn the schedule on:

       cp agent/eu.clover.checker.plist ~/Library/LaunchAgents/
       launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/eu.clover.checker.plist

   Off again: `launchctl bootout gui/$(id -u)/eu.clover.checker`.

## Running it by hand

    bash agent/run.sh              a full run with GLM
    bash agent/run.sh --scripts    only the scripts, no GLM, dry-run sync
    python3 agent/cart_check.py anycubic.com ACSUN20     one store, one code

The model is `baseten/zai-org/GLM-5.3`; `CLOVER_MODEL=... bash agent/run.sh`
picks another. Logs and reports land in `agent/logs/`, script output in
`agent/out/` (both ignored by git).
