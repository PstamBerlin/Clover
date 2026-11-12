-- Clover's checker: two columns on codes, and the code_stats view carries them.
-- Paste this into the Supabase dashboard > SQL editor > Run.
-- The checker writes these with the service key (it bypasses row security), so
-- no new policy is needed. The public key can still only read and insert.

alter table public.codes
  add column if not exists checker_at timestamptz,
  add column if not exists checker_result text,   -- 'ok', 'fail' or 'blocked'
  add column if not exists checker_note text;     -- e.g. 'anycubic.com cart, total 299.00 -> 279.00'

create or replace view public.code_stats as
select c.id, c.store, c.code, c.label, c.detail, c.pct, c.kind, c.value, c.created_at,
       c.checker_at, c.checker_result, c.checker_note,
       count(*) filter (where v.worked is true)  as works,
       count(*) filter (where v.worked is false) as fails
from public.codes c
left join public.votes v on v.code_id = c.id
group by c.id;

grant select on public.code_stats to anon, authenticated;
