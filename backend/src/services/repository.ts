import { db } from './supabase.js';
import type {
  ConnectionRow,
  ConnectionStatus,
  LeadDataRow,
  LogRow,
  WebhookEventRow,
} from '../types/meta.js';

export const CONNECTION_ID = '00000000-0000-0000-0000-000000000001';

// --- meta_connection ---------------------------------------------------------

export async function getConnection(): Promise<ConnectionRow | null> {
  const { data, error } = await db()
    .from('meta_connection')
    .select('*')
    .eq('id', CONNECTION_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as ConnectionRow;
}

export async function saveToken(partial: {
  access_token: string;
  token_expires_at: Date;
  status: string;
}): Promise<void> {
  const { error, data } = await db()
    .from('meta_connection')
    .upsert(
      {
        id: CONNECTION_ID,
        access_token: partial.access_token,
        token_expires_at: partial.token_expires_at.toISOString(),
        status: partial.status,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('id');

  if (error || !data) throw error;
}

export async function saveSelections(partial: Partial<ConnectionRow>): Promise<void> {
  const { error, data } = await db()
    .from('meta_connection')
    .upsert(
      {
        id: CONNECTION_ID,
        updated_at: new Date().toISOString(),
        ...partial,
      },
      { onConflict: 'id' }
    )
    .select('id');

  if (error || !data) throw error;
}

export async function setConnectionStatus(status: string): Promise<void> {
  const { error } = await db()
    .from('meta_connection')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', CONNECTION_ID);
  if (error) throw error;
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const row = await getConnection();
  if (!row) {
    return {
      connected: false,
      status: 'disconnected',
      tokenExpiresAt: null,
      selections: { pageId: null, pageName: null, adAccountId: null, adAccountName: null, formId: null, formName: null },
    };
  }
  return {
    connected: Boolean(row.access_token && row.status === 'connected'),
    status: row.status,
    tokenExpiresAt: row.token_expires_at,
    selections: {
      pageId: row.page_id,
      pageName: row.page_name,
      adAccountId: row.ad_account_id,
      adAccountName: row.ad_account_name,
      formId: row.form_id,
      formName: row.form_name,
    },
  };
}

// --- meta_webhook_events -----------------------------------------------------

export async function insertWebhookEvent(event: {
  event_type: string;
  lead_id: string | null;
  page_id: string | null;
  form_id: string | null;
  payload: unknown;
  status?: string;
}): Promise<WebhookEventRow> {
  const { data, error } = await db()
    .from('meta_webhook_events')
    .insert({
      event_type: event.event_type,
      lead_id: event.lead_id,
      page_id: event.page_id,
      form_id: event.form_id,
      payload: event.payload,
      status: event.status ?? 'received',
    })
    .select()
    .single();

  if (error || !data) throw error;
  return data as WebhookEventRow;
}

export async function updateWebhookEvent(
  id: string,
  patch: { status: string; processed_at?: string; payload?: unknown }
): Promise<void> {
  const fields: Record<string, unknown> = {
    status: patch.status,
    ...(patch.processed_at ? { processed_at: patch.processed_at } : {}),
    ...(patch.payload !== undefined ? { payload: patch.payload } : {}),
  };
  const { error } = await db().from('meta_webhook_events').update(fields).eq('id', id);
  if (error) throw error;
}

export async function getLastWebhookEvent(): Promise<WebhookEventRow | null> {
  const { data, error } = await db()
    .from('meta_webhook_events')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as WebhookEventRow;
}

export async function getRecentWebhookEvents(limit = 20): Promise<WebhookEventRow[]> {
  const { data, error } = await db()
    .from('meta_webhook_events')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as WebhookEventRow[];
}

// --- meta_lead_data ----------------------------------------------------------

export async function insertLeadData(lead: Partial<LeadDataRow> & { lead_id: string }): Promise<void> {
  // idempotente: se lead_id já existe, não duplica (PGRST116 unique)
  const { error } = await db()
    .from('meta_lead_data')
    .upsert(lead, { onConflict: 'lead_id', ignoreDuplicates: false });
  if (error) {
    // fallback para insert simples se upsert falhar por falta de índice
    if (String(error.message).includes('lead_id')) {
      const { error: dup } = await db().from('meta_lead_data').select('id').eq('lead_id', lead.lead_id).limit(1);
      if (!dup) return;
    }
    throw error;
  }
}

export async function getLastLead(): Promise<LeadDataRow | null> {
  const { data, error } = await db()
    .from('meta_lead_data')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as LeadDataRow;
}

// Idempotência webhook: verifica se lead_id já processado
export async function findWebhookByLeadId(leadId: string): Promise<WebhookEventRow | null> {
  const { data, error } = await db().from('meta_webhook_events').select('*').eq('lead_id', leadId).limit(1).maybeSingle();
  if (error) throw error;
  return (data as WebhookEventRow | null) ?? null;
}
export async function findLeadByLeadId(leadId: string): Promise<LeadDataRow | null> {
  const { data, error } = await db().from('meta_lead_data').select('*').eq('lead_id', leadId).limit(1).maybeSingle();
  if (error) throw error;
  return (data as LeadDataRow | null) ?? null;
}

// --- sync caches (todas páginas/contas/forms) --------------------------------

export async function upsertPages(pages: { page_id: string; name: string; category?: string | null; raw?: unknown }[]): Promise<void> {
  if (pages.length === 0) return;
  const rows = pages.map((p) => ({ page_id: p.page_id, name: p.name, category: p.category ?? null, raw: p.raw ?? null, synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
  const { error } = await db().from('meta_pages').upsert(rows, { onConflict: 'page_id' });
  if (error) throw error;
}
export async function upsertAdAccounts(accounts: { ad_account_id: string; name: string; account_status?: unknown; currency?: string | null; raw?: unknown }[]): Promise<void> {
  if (accounts.length === 0) return;
  const rows = accounts.map((a) => ({ ad_account_id: a.ad_account_id, name: a.name, account_status: a.account_status as number | null ?? null, currency: a.currency ?? null, raw: a.raw ?? null, synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
  const { error } = await db().from('meta_ad_accounts').upsert(rows, { onConflict: 'ad_account_id' });
  if (error) throw error;
}
export async function upsertForms(forms: { form_id: string; name: string; page_id?: string | null; page_name?: string | null; ad_account_id?: string | null; raw?: unknown }[]): Promise<void> {
  if (forms.length === 0) return;
  const rows = forms.map((f) => ({ form_id: f.form_id, name: f.name, page_id: f.page_id ?? null, page_name: f.page_name ?? null, ad_account_id: f.ad_account_id ?? null, raw: f.raw ?? null, synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
  const { error } = await db().from('meta_forms').upsert(rows, { onConflict: 'form_id' });
  if (error) throw error;
}
export async function getCachedPages(): Promise<{ page_id: string; name: string; category: string | null }[]> {
  const { data, error } = await db().from('meta_pages').select('page_id,name,category').order('name');
  if (error) throw error;
  return (data ?? []) as never;
}
export async function getCachedAdAccounts(): Promise<{ ad_account_id: string; name: string; account_status: unknown; currency: string | null }[]> {
  const { data, error } = await db().from('meta_ad_accounts').select('ad_account_id,name,account_status,currency').order('name');
  if (error) throw error;
  return (data ?? []) as never;
}
export async function getCachedForms(): Promise<{ form_id: string; name: string; page_id: string | null; page_name: string | null; ad_account_id: string | null }[]> {
  const { data, error } = await db().from('meta_forms').select('form_id,name,page_id,page_name,ad_account_id').order('name');
  if (error) throw error;
  return (data ?? []) as never;
}

// --- crm_leads (view CRM) ----------------------------------------------------

export type CrmLeadStatus = 'novo' | 'contato_realizado' | 'qualificado' | 'agendamento' | 'cliente' | 'perdido';

export async function syncCrmLead(p_lead_id: string): Promise<void> {
  const { error } = await db().rpc('sync_crm_lead_from_meta', { p_lead_id });
  if (error) {
    // fallback se função não existir (migration pendente): copia manual
    const lead = await findLeadByLeadId(p_lead_id);
    if (!lead) return;
    await db().from('crm_leads').upsert({
      lead_id: lead.lead_id,
      meta_lead_id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      page_id: lead.page_id,
      page_name: lead.page_name,
      form_id: lead.form_id,
      form_name: lead.form_name,
      ad_account_id: (lead as unknown as Record<string, unknown>).ad_account_id as string | null ?? null,
      ad_account_name: (lead as unknown as Record<string, unknown>).ad_account_name as string | null ?? null,
      received_at: lead.received_at,
      extra: lead.extra,
      raw: lead.raw,
      status: (lead as unknown as Record<string, unknown>).status as string | null ?? 'novo',
    }, { onConflict: 'lead_id' });
  }
}

export async function listCrmLeads(params: {
  status?: string;
  pageId?: string;
  formId?: string;
  adAccountId?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Record<string, unknown>[]; total: number }> {
  let query = db().from('crm_leads').select('*', { count: 'exact' }).order('received_at', { ascending: false });

  if (params.status) query = query.eq('status', params.status);
  if (params.pageId) query = query.eq('page_id', params.pageId);
  if (params.formId) query = query.eq('form_id', params.formId);
  if (params.adAccountId) query = query.eq('ad_account_id', params.adAccountId);
  if (params.from) query = query.gte('received_at', params.from);
  if (params.to) query = query.lte('received_at', params.to);
  if (params.search) {
    const s = `%${params.search}%`;
    query = query.or(`name.ilike.${s},phone.ilike.${s},email.ilike.${s}`);
  }
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as Record<string, unknown>[], total: count ?? 0 };
}

export async function getCrmLeadById(id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db().from('crm_leads').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Record<string, unknown> | null) ?? null;
}
export async function getCrmLeadByLeadId(leadId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db().from('crm_leads').select('*').eq('lead_id', leadId).maybeSingle();
  if (error) throw error;
  return (data as Record<string, unknown> | null) ?? null;
}
export async function updateCrmLeadStatus(id: string, status: CrmLeadStatus, notes?: string): Promise<Record<string, unknown>> {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (notes !== undefined) patch.notes = notes;
  // também atualiza meta_lead_data para manter consistência
  const crm = await getCrmLeadById(id);
  const leadId = crm ? (crm as { lead_id?: string }).lead_id : null;
  if (leadId) {
    await db().from('meta_lead_data').update({ status, updated_at: new Date().toISOString() }).eq('lead_id', leadId);
  }
  const { data, error } = await db().from('crm_leads').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Record<string, unknown>;
}

// --- meta_logs ---------------------------------------------------------------

export async function getRecentLogs(limit = 60): Promise<LogRow[]> {
  const { data, error } = await db()
    .from('meta_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as LogRow[];
}
