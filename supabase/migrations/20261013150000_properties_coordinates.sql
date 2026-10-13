-- Applied via MCP on 13 Oct 2026. Map positions for the portfolio map.
alter table public.properties
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geo_source text;
comment on column public.properties.latitude is 'Map position for the portfolio map. See geo_source for where it came from.';
comment on column public.properties.geo_source is 'census_geocoder (US Census onelineaddress), osm_nominatim, or transaction_place (the verified place on the agent desk transaction).';
