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
};