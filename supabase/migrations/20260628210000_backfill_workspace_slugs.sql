-- Backfill slugs for workspaces left with a null/empty slug by the
-- initiatives → workspaces migration (caused /workspaces/null in the sidebar).
--
-- Slugify the name; if that would collide with an existing slug or another
-- backfilled row in the same batch, append a short id suffix. The partial
-- unique index on slug (WHERE slug IS NOT NULL) stays satisfied. Idempotent:
-- only rows with a null/empty slug are touched.

with base as (
  select
    id,
    coalesce(
      nullif(
        regexp_replace(
          regexp_replace(lower(coalesce(name, 'workspace')), '[^a-z0-9]+', '-', 'g'),
          '(^-+|-+$)', '', 'g'
        ),
        ''
      ),
      'workspace'
    ) as s
  from public.workspaces
  where slug is null or slug = ''
),
resolved as (
  select
    b.id,
    case
      when count(*) over (partition by b.s) > 1
        or exists (select 1 from public.workspaces w where w.slug = b.s)
      then b.s || '-' || left(b.id::text, 4)
      else b.s
    end as final_slug
  from base b
)
update public.workspaces w
set slug = r.final_slug, updated_at = now()
from resolved r
where w.id = r.id and (w.slug is null or w.slug = '');
