-- Applied via MCP on 12 Oct 2026 (PT). Additive and nullable; nothing reads
-- these columns until the portfolio and listing pages select them.
alter table public.properties
  add column if not exists highlight text,
  add column if not exists represented_side text;
alter table public.properties
  drop constraint if exists properties_represented_side_check;
alter table public.properties
  add constraint properties_represented_side_check
  check (represented_side is null or represented_side in ('buyer','seller','both'));
comment on column public.properties.highlight is 'One-line result shown on portfolio cards and the listing page (e.g. the $/foot claim on a purchase). Agent-stated; never generated.';
comment on column public.properties.represented_side is 'Which side Tim represented: buyer, seller or both. Buyer-side sales read "Bought for" on the listing page.';
