import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { supabase, supabaseAvailable } from '../lib/supabase';
import type { ConnectionStatus, Diagnostics, LeadDataRow, LogRow, WebhookEventRow } from '../types';
import { ConnectionCard } from '../components/ConnectionCard';
import { WebhookPanel } from '../components/WebhookPanel';
import { LastLeadCard } from '../components/LastLeadCard';
import { LogsPanel } from '../components/LogsPanel';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui';

export function IntegrationPage() {
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [lastEvent, setLastEvent] = useState<WebhookEventRow | null>(null);
  const [lastLead, setLastLead] = useState<LeadDataRow | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resources, setResources] = useState<{ pages: { page_id: string; name: string }[]; adAccounts: { ad_account_id: string; name: string }[]; forms: { form_id: string; name: string; page_id: string | null }[] } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const bannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async () => {
    try { const s = await api.status(); setConnection(s); return s; } catch { return null; }
  }, []);

  const fetchAll = useCallback(async () => {
    const [ev, ld, lg, d, rs] = await Promise.allSettled([api.lastEvent(), api.lastLead(), api.logs(80), api.diagnostics(), api.resources().catch(() => ({ data: { pages: [], adAccounts: [], forms: [] } }))]);
    if (ev.status === 'fulfilled') setLastEvent(ev.value.data);
    if (ld.status === 'fulfilled') setLastLead(ld.value.data);
    if (lg.status === 'fulfilled') setLogs(lg.value.data);
    if (d.status === 'fulfilled') setDiag(d.value);
    if (rs.status === 'fulfilled') setResources((rs.value as { data: typeof resources }).data as typeof resources);
  }, []);

  const refresh = useCallback(async () => { await fetchStatus(); await fetchAll(); }, [fetchStatus, fetchAll]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const meta = params.get('meta');
    const reason = params.get('reason');
    if (meta) {
      window.history.replaceState({}, '', window.location.pathname);
      if (meta === 'connected') setBanner({ type: 'success', message: 'Conexão com a Meta estabelecida com sucesso!' });
      else setBanner({ type: 'error', message: `Falha na conexão: ${reason ?? 'verificar configuração do app.'}` });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const id = setInterval(fetchAll, 5000); return () => clearInterval(id); }, [fetchAll]);
  useEffect(() => {
    if (!supabaseAvailable) return;
    const c = supabase(); if (!c) return;
    const ch = c.channel('meta-integration')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meta_webhook_events' }, () => fetchAll())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meta_lead_data' }, () => fetchAll())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meta_logs' }, () => fetchAll())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [fetchAll]);
  useEffect(() => {
    if (!banner) return;
    if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    bannerTimeout.current = setTimeout(() => setBanner(null), 8000);
    return () => { if (bannerTimeout.current) clearTimeout(bannerTimeout.current); };
  }, [banner]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await api.sync();
      setBanner({ type: 'success', message: `Sincronizado: ${r.data.pages} páginas, ${r.data.adAccounts} contas, ${r.data.forms} formulários` });
      await fetchAll();
    } catch (e) { setBanner({ type: 'error', message: e instanceof Error ? e.message : String(e) }); }
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Integração Meta Ads</h2>
        <p className="text-sm text-slate-500">Conecte sua conta Meta para sincronizar seus leads. Hierarquia: Usuário → Páginas → Formulários → Contas → Leads</p>
      </div>

      {banner && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${banner.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {banner.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-red-600" />}
          {banner.message}
        </div>
      )}

      <ConnectionCard status={connection} />

      {connection?.connected && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Recursos disponíveis</h3>
              <p className="text-sm text-slate-500">
                {resources ? `${resources.pages.length} páginas • ${resources.adAccounts.length} contas • ${resources.forms.length} formulários` : 'Carregando...'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Armazenados em Supabase (meta_pages, meta_ad_accounts, meta_forms) sem depender de seleção única.</p>
            </div>
            <button onClick={handleSync} disabled={syncing} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar recursos'}
            </button>
          </div>
          {resources && resources.pages.length > 0 && (
            <div className="mt-4 grid gap-2 text-xs">
              <div><span className="font-medium">Páginas:</span> {resources.pages.map((p) => p.name).join(', ')}</div>
              <div><span className="font-medium">Contas:</span> {resources.adAccounts.map((a) => `${a.name} (${a.ad_account_id})`).join(', ')}</div>
              <div><span className="font-medium">Formulários:</span> {resources.forms.map((f) => f.name).join(', ') || '—'}</div>
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <WebhookPanel connection={connection} lastEvent={lastEvent} />
        <LastLeadCard lead={lastLead} />
      </div>

      {resources && (
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">Estrutura monitorada</h3>
          <div className="overflow-x-auto text-sm">
            <table className="w-full">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="px-2 py-2 text-left">Página</th><th className="px-2 py-2 text-left">Formulários</th><th className="px-2 py-2 text-left">Conta</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {resources.pages.map((p) => {
                  const forms = resources.forms.filter((f) => f.page_id === p.page_id);
                  return (
                    <tr key={p.page_id}>
                      <td className="px-2 py-2">{p.name} <span className="text-xs text-slate-400">({p.page_id})</span></td>
                      <td className="px-2 py-2">{forms.length ? forms.map((f) => f.name).join(', ') : <span className="text-slate-400">—</span>}</td>
                      <td className="px-2 py-2 text-slate-500">{forms[0]?.page_id ? 'via página' : '—'}</td>
                    </tr>
                  );
                })}
                {resources.pages.length === 0 && <tr><td colSpan={3} className="px-2 py-4 text-center text-slate-400">Nenhuma página sincronizada. Clique Sincronizar.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-400">Leads: evento bruto em meta_webhook_events → lead tratado em meta_lead_data → CRM status em crm_leads. Idempotência por lead_id.</p>
        </Card>
      )}

      <DiagnosticsPanel diag={diag} />
      <LogsPanel logs={logs} />

      {!supabaseAvailable && <p className="rounded-lg bg-amber-50 p-3 text-center text-xs text-amber-700">Supabase Realtime desativado: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para logs ao vivo.</p>}
    </div>
  );
}
