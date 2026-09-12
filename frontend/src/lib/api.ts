import type {
  AdAccountNode,
  ConnectionStatus,
  Diagnostics,
  LeadDataRow,
  LeadGenFormNode,
  LogRow,
  PageNode,
  WebhookEventRow,
} from '../types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  status: () => request<ConnectionStatus>('/api/meta/status'),
  pages: () => request<{ data: PageNode[] }>('/api/meta/pages'),
  adAccounts: () => request<{ data: AdAccountNode[] }>('/api/meta/adaccounts'),
  forms: (adAccountId: string) =>
    request<{ data: LeadGenFormNode[] }>(`/api/meta/forms?adAccountId=${encodeURIComponent(adAccountId)}`),
  saveConfig: (payload: Record<string, string | null>) =>
    request<ConnectionStatus>('/api/meta/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  lastEvent: () => request<{ data: WebhookEventRow | null }>('/api/meta/last-event'),
  lastLead: () => request<{ data: LeadDataRow | null }>('/api/meta/last-lead'),
  logs: (limit = 60) => request<{ data: LogRow[] }>(`/api/meta/logs?limit=${limit}`),
  diagnostics: () => request<Diagnostics>('/api/diagnostics'),
  sync: () => request<{ data: { pages: number; adAccounts: number; forms: number } }>('/api/meta/sync', { method: 'POST' }),
  resources: () =>
    request<{ data: { pages: { page_id: string; name: string }[]; adAccounts: { ad_account_id: string; name: string }[]; forms: { form_id: string; name: string; page_id: string | null }[] } }>('/api/meta/resources'),
  leads: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
    return request<{ data: Record<string, unknown>[]; total: number }>(`/api/leads${qs.toString() ? `?${qs}` : ''}`);
  },
  lead: (id: string) => request<{ data: Record<string, unknown> }>(`/api/leads/${id}`),
  updateLeadStatus: (id: string, status: string, notes?: string) =>
    request<{ data: Record<string, unknown> }>(`/api/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    }),
};