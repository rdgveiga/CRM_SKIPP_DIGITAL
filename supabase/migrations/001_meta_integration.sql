-- =============================================================================
-- 001_meta_integration.sql
-- CRM Skipp Digital - Laboratório de Integração Meta Ads
-- Estrutura mínima: conexão, eventos do webhook, leads parseados e logs.
-- Execute este arquivo no SQL Editor do Supabase (ou via supabase db push).
-- =============================================================================

-- Tabela de conexão OAuth + seleções ativas (linha única - singleton)
-- Guarda o token de longa duração. Só o backend (service key) tem acesso.
create table if not exists public.meta_connection (
  id                uuid primary key default gen_random_uuid(),
  access_token      text,
  token_expires_at  timestamptz,
  status            text default 'disconnected', -- disconnected | connecting | connected | error
  page_id           text,
  page_name         text,
  ad_account_id     text,
  ad_account_name   text,
  form_id           text,
  form_name         text,
  connected_at      timestamptz,
  updated_at        timestamptz default now()
);

-- Eventos brutos recebidos pelo webhook da Meta (verificação + recepção)
create table if not exists public.meta_webhook_events (
  id            uuid primary key default gen_random_uuid(),
  event_type    text,
  lead_id       text,
  page_id       text,
  form_id       text,
  payload       jsonb,
  received_at   timestamptz default now(),
  processed_at  timestamptz,
  status        text default 'received' -- received | processed | error
);
create index if not exists meta_webhook_events_received_at_idx
  on public.meta_webhook_events (received_at desc);

-- Leads enriquecidos (dados parseados de field_data) - origem da seção
-- "Último lead recebido" da interface.
create table if not exists public.meta_lead_data (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid references public.meta_webhook_events (id) on delete set null,
  lead_id       text,
  form_id       text,
  page_id       text,
  form_name     text,
  page_name     text,
  email         text,
  phone         text,
  name          text,
  extra         jsonb,
  raw           jsonb,
  received_at   timestamptz default now()
);
create index if not exists meta_lead_data_received_at_idx
  on public.meta_lead_data (received_at desc);

-- Logs técnicos para diagnóstico
create table if not exists public.meta_logs (
  id          uuid primary key default gen_random_uuid(),
  level       text default 'info', -- info | warn | error
  message     text,
  context     jsonb,
  created_at  timestamptz default now()
);
create index if not exists meta_logs_created_at_idx
  on public.meta_logs (created_at desc);

-- =============================================================================
-- Row Level Security
-- * meta_connection: SEM acesso anônimo (guarda o token).
-- * demais tabelas: leitura liberada (lab) para alimentar o Realtime/diagnóstico.
--   Inserts/updates somente via backend (service key) - não há policy de escrita.
-- =============================================================================
alter table public.meta_connection enable row level security;

alter table public.meta_webhook_events enable row level security;
alter table public.meta_lead_data enable row level security;
alter table public.meta_logs enable row level security;

create policy anon_select_meta_webhook_events on public.meta_webhook_events
  for select using (true);
create policy anon_select_meta_lead_data on public.meta_lead_data
  for select using (true);
create policy anon_select_meta_logs on public.meta_logs
  for select using (true);

-- =============================================================================
-- Realtime (exibição ao vivo do webhook/log na interface)
-- =============================================================================
alter publication supabase_realtime add table public.meta_webhook_events;
alter publication supabase_realtime add table public.meta_lead_data;
alter publication supabase_realtime add table public.meta_logs;