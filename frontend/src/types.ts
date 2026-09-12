// Tipos compartilhados frontend<->backend

export type ConnectionStatus = {
  connected: boolean;
  status: string;
  tokenExpiresAt: string | null;
  selections: {
    pageId: string | null;
    pageName: string | null;
    adAccountId: string | null;
    adAccountName: string | null;
    formId: string | null;
    formName: string | null;
  };
};

export type PageNode = { id: string; name: string; category?: string };
export type AdAccountNode = { id: string; name: string; account_status?: number | string };
export type LeadGenFormNode = { id: string; name: string; page_id?: string; page?: { id: string; name: string } | null };

export type WebhookEventRow = {
  id: string;
  event_type: string | null;
  lead_id: string | null;
  page_id: string | null;
  form_id: string | null;
  payload: unknown;
  received_at: string;
  processed_at: string | null;
  status: string;
};

export type LeadDataRow = {
  id: string;
  event_id: string | null;
  lead_id: string | null;
  form_id: string | null;
  page_id: string | null;
  form_name: string | null;
  page_name: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  extra: Record<string, string> | null;
  raw: unknown;
  received_at: string;
  ad_account_id?: string | null;
  ad_account_name?: string | null;
  status?: string | null;
};

export type CrmLead = {
  id: string;
  lead_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  page_id: string | null;
  page_name: string | null;
  form_id: string | null;
  form_name: string | null;
  ad_account_id: string | null;
  ad_account_name: string | null;
  status: 'novo' | 'contato_realizado' | 'qualificado' | 'agendamento' | 'cliente' | 'perdido';
  received_at: string;
  updated_at: string | null;
  extra: Record<string, string> | null;
};

export type LogRow = {
  id: string;
  level: string;
  message: string;
  context: unknown;
  created_at: string;
};

export type Diagnostics = {
  metaApi: { status: 'connected' | 'disconnected'; detail: string };
  db: { status: 'connected' | 'disconnected' };
  webhook: { status: 'active' | 'inactive'; lastHitAt: string | null; lastEventType: string | null; lastEventStatus: string | null };
  connection: ConnectionStatus;
  lastEvent: { id: string; eventType: string | null; leadId: string | null; receivedAt: string; status: string } | null;
  lastLead: { id: string; leadId: string | null; name: string | null; email: string | null; phone: string | null; receivedAt: string } | null;
};