-- Applied via MCP on 12 Oct 2026 (PT). Additive and nullable.
alter table public.properties add column if not exists case_study jsonb;
comment on column public.properties.case_study is 'Components lifted from the agent''s own deal analysis for the public listing page: plan steps, headline numbers, comparable sales, supporting tables. Facts and agent statements only; no opinion of value for the subject.';
