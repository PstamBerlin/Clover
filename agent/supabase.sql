-- Clover's checker: three columns on codes, the code_stats view carries them,
-- and the PUBLIC key may update ONLY those three columns (column-level grant),
-- so the checker needs no secret key at all. Anyone with the public key could
-- write a checker result, the same way anyone can add a vote; the checker's
-- line never turns a code green, so the damage a prankster can do is small.
-- Paste this into the Supabase dashboard > SQL editor > Run.

alter table public.codes
  add column if not exists checker_at timestamptz,
  add column if not exists checker_result text,   -- 'ok', 'fail' or 'blocked'
  add column if not exists checker_note text;     -- e.g. 'anycubic.com cart with Kobra 3 Max (2229.79): saved 15.0'

create or replace view public.code_stats as
select c.id, c.store, c.code, c.label, c.detail, c.pct, c.kind, c.value, c.created_at,
       c.checker_at, c.checker_result, c.checker_note,
       count(*) filter (where v.worked is true)  as works,
       count(*) filter (where v.worked is false) as fails
from public.codes c
left join public.votes v on v.code_id = c.id
group by c.id;

grant select on public.code_stats to anon, authenticated;

-- the public key may update the checker columns and nothing else
revoke update on public.codes from anon;
grant update (checker_at, checker_result, checker_note) on public.codes to anon;
drop policy if exists "checker may write its columns" on public.codes;
create policy "checker may write its columns" on public.codes
  for update to anon using (true) with check (true);
