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
  const { error } = await db().from('meta_lead_data').insert(lead);
  if (error) throw error;
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
