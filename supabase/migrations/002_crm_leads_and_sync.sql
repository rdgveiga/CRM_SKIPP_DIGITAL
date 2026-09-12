-- =============================================================================
-- 002_crm_leads_and_sync.sql
-- Evolução Lab -> CRM: multi-conta, idempotência, cache de recursos
-- Preserva 001. Adiciona CRM, índices e Realtime
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensão meta_lead_data para CRM (preserva evento original, adiciona CRM)
-- ---------------------------------------------------------------------------

alter table public.meta_lead_data
  add column if not exists ad_account_id text,
  add column if not exists ad_account_name text,
  add column if not exists status text default 'novo' check (status in ('novo','contato_realizado','qualificado','agendamento','cliente','perdido')),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists notes text;

-- Índices para filtros do CRM
create index if not exists meta_lead_data_status_idx on public.meta_lead_data (status);
create index if not exists meta_lead_data_page_idx on public.meta_lead_data (page_id);
create index if not exists meta_lead_data_form_idx on public.meta_lead_data (form_id);
create index if not exists meta_lead_data_ad_account_idx on public.meta_lead_data (ad_account_id);
create index if not exists meta_lead_data_email_idx on public.meta_lead_data (email);
create index if not exists meta_lead_data_phone_idx on public.meta_lead_data (phone);
create index if not exists meta_lead_data_search_idx on public.meta_lead_data using gin (
  to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(phone,''))
);

-- Idempotência: mesmo lead_id não duplica (Meta pode reenviar webhook)
create unique index if not exists meta_lead_data_lead_id_unique on public.meta_lead_data (lead_id) where lead_id is not null;
create unique index if not exists meta_webhook_events_lead_id_unique on public.meta_webhook_events (lead_id) where lead_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Cache de recursos disponíveis (todas Páginas / Contas / Formulários)
--    Sincronizados via POST /api/meta/sync após OAuth, sem depender de seleção única
-- ---------------------------------------------------------------------------

create table if not exists public.meta_pages (
  id uuid primary key default gen_random_uuid(),
  page_id text unique not null,
  name text not null,
  category text,
  raw jsonb,
  synced_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists meta_pages_name_idx on public.meta_pages (name);

create table if not exists public.meta_ad_accounts (
  id uuid primary key default gen_random_uuid(),
  ad_account_id text unique not null,
  name text not null,
  account_status integer,
  currency text,
  raw jsonb,
  synced_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists meta_ad_accounts_name_idx on public.meta_ad_accounts (name);

create table if not exists public.meta_forms (
  id uuid primary key default gen_random_uuid(),
  form_id text unique not null,
  name text not null,
  page_id text,
  page_name text,
  ad_account_id text,
  raw jsonb,
  synced_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists meta_forms_page_idx on public.meta_forms (page_id);
create index if not exists meta_forms_ad_account_idx on public.meta_forms (ad_account_id);

-- ---------------------------------------------------------------------------
-- 3. Tabela crm_leads (estrutura preparada para pipeline futuro)
--    Espelha meta_lead_data mas com lifecycle comercial separado do evento bruto
--    Mantém meta_lead_data como fonte de verdade do evento original
-- ---------------------------------------------------------------------------
-- Para MVP, crm_leads é view materializável via meta_lead_data + status.
-- Criamos tabela dedicada para extensões futuras (score, pipeline, whatsapp, venda)
create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  lead_id text unique not null,
  meta_lead_id uuid references public.meta_lead_data(id) on delete set null,
  name text,
  phone text,
  email text,
  page_id text,
  page_name text,
  form_id text,
  form_name text,
  ad_account_id text,
  ad_account_name text,
  status text default 'novo' check (status in ('novo','contato_realizado','qualificado','agendamento','cliente','perdido')),
  source text default 'meta_lead_ads',
  received_at timestamptz default now(),
  updated_at timestamptz default now(),
  extra jsonb,
  raw jsonb,
  notes text
);
create index if not exists crm_leads_status_idx on public.crm_leads (status);
create index if not exists crm_leads_page_idx on public.crm_leads (page_id);
create index if not exists crm_leads_form_idx on public.crm_leads (form_id);
create index if not exists crm_leads_ad_account_idx on public.crm_leads (ad_account_id);
create index if not exists crm_leads_received_at_idx on public.crm_leads (received_at desc);
create index if not exists crm_leads_search_idx on public.crm_leads using gin (
  to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(phone,''))
);

-- ---------------------------------------------------------------------------
-- 4. RLS e Realtime
-- ---------------------------------------------------------------------------

alter table public.meta_pages enable row level security;
alter table public.meta_ad_accounts enable row level security;
alter table public.meta_forms enable row level security;
alter table public.crm_leads enable row level security;

-- Leitura liberada para o CRM (anon pode listar - lab). Escrita somente via service_key
do $$ begin
  if not exists (select 1 from pg_policies where policyname='anon_select_meta_pages' and tablename='meta_pages') then
    create policy anon_select_meta_pages on public.meta_pages for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='anon_select_meta_ad_accounts' and tablename='meta_ad_accounts') then
    create policy anon_select_meta_ad_accounts on public.meta_ad_accounts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='anon_select_meta_forms' and tablename='meta_forms') then
    create policy anon_select_meta_forms on public.meta_forms for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='anon_select_crm_leads' and tablename='crm_leads') then
    create policy anon_select_crm_leads on public.crm_leads for select using (true);
  end if;
end $$;

-- Realtime para atualizar Leads sem reload
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='meta_pages') then
    alter publication supabase_realtime add table public.meta_pages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='meta_ad_accounts') then
    alter publication supabase_realtime add table public.meta_ad_accounts;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='meta_forms') then
    alter publication supabase_realtime add table public.meta_forms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='crm_leads') then
    alter publication supabase_realtime add table public.crm_leads;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Função helper: upsert idempotente crm_leads a partir de meta_lead_data
--    Called pelo webhook após inserir meta_lead_data
-- ---------------------------------------------------------------------------
create or replace function public.sync_crm_lead_from_meta(p_lead_id text)
returns uuid language plpgsql security definer as $$
declare
  v_meta public.meta_lead_data%rowtype;
  v_crm_id uuid;
begin
  select * into v_meta from public.meta_lead_data where lead_id = p_lead_id limit 1;
  if not found then return null; end if;

  insert into public.crm_leads (lead_id, meta_lead_id, name, phone, email, page_id, page_name, form_id, form_name, ad_account_id, ad_account_name, received_at, extra, raw, status)
  values (v_meta.lead_id, v_meta.id, v_meta.name, v_meta.phone, v_meta.email, v_meta.page_id, v_meta.page_name, v_meta.form_id, v_meta.form_name, v_meta.ad_account_id, v_meta.ad_account_name, v_meta.received_at, v_meta.extra, v_meta.raw, coalesce(v_meta.status,'novo'))
  on conflict (lead_id) do update set
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    page_name = excluded.page_name,
    form_name = excluded.form_name,
    ad_account_name = excluded.ad_account_name,
    extra = excluded.extra,
    raw = excluded.raw,
    updated_at = now()
  returning id into v_crm_id;

  return v_crm_id;
end $$;
