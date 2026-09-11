// =============================================================================
// Tipos de resposta da Meta Graph API (somente campos oficiais usados) e
// estruturas de domínio do projeto.
// =============================================================================

// --- Meta Graph API ----------------------------------------------------------

export interface MetaErrorBody {
  error?: {
    message?: string;
    code?: number;
    type?: string;
    fbtrace_id?: string;
  };
}

export interface MetaAccessTokenResponse extends MetaErrorBody {
  access_token?: string;
  token_type?: 'bearer';
  expires_in?: number;
}

export interface PageNode {
  id: string;
  name: string;
  category?: string;
}

export interface AdAccountNode {
  id: string;
  name: string;
  account_status?: number | string;
  currency?: string;
}

export interface LeadGenFormNode {
  id: string;
  name: string;
  page_id?: string;
  page?: { id: string; name: string } | null;
  status?: string;
}

export interface LeadField {
  name: string;
  values: string[];
}

export interface LeadNode extends MetaErrorBody {
  id?: string;
  created_time?: string;
  field_data?: LeadField[];
  form_id?: string;
  page_id?: string;
}

export interface GraphListResponse<T> extends MetaErrorBody {
  data?: T[];
}

// --- Webhook (evento leadgen) ------------------------------------------------

export interface WebhookChangeValue {
  leadgen_id?: string;
  form_id?: string;
  created_time?: number;
  is_locked?: boolean;
}

export interface WebhookChange {
  field?: string;
  value?: WebhookChangeValue;
}

export interface WebhookEntry {
  id?: string;
  time?: number;
  changes?: WebhookChange[];
}

export interface WebhookPayload {
  object?: string;
  entry?: WebhookEntry[];
}

// --- Banco de dados ----------------------------------------------------------

export interface ConnectionRow {
  id: string;
  access_token: string | null;
  token_expires_at: string | null;
  status: string;
  page_id: string | null;
  page_name: string | null;
  ad_account_id: string | null;
  ad_account_name: string | null;
  form_id: string | null;
  form_name: string | null;
  connected_at: string | null;
  updated_at: string | null;
}

export interface WebhookEventRow {
  id: string;
  event_type: string | null;
  lead_id: string | null;
  page_id: string | null;
  form_id: string | null;
  payload: unknown;
  received_at: string;
  processed_at: string | null;
  status: string;
}

export interface LeadDataRow {
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
  extra: unknown;
  raw: unknown;
  received_at: string;
}

export interface LogRow {
  id: string;
  level: string;
  message: string;
  context: unknown;
  created_at: string;
}

// --- Seleções salvas (frontend) ----------------------------------------------

export interface MetaSelections {
  pageId: string | null;
  pageName: string | null;
  adAccountId: string | null;
  adAccountName: string | null;
  formId: string | null;
  formName: string | null;
}

export interface ConnectionStatus {
  connected: boolean;
  status: string;
  tokenExpiresAt: string | null;
  selections: MetaSelections;
}