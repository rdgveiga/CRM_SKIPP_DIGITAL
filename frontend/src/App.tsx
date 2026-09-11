import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './lib/api';
import { supabase, supabaseAvailable } from './lib/supabase';
import type {
  ConnectionStatus,
  Diagnostics,
  LeadDataRow,
  LogRow,
  WebhookEventRow,
} from './types';
import { ConnectionCard } from './components/ConnectionCard';
import { SelectionPanel } from './components/SelectionPanel';
import { WebhookPanel } from './components/WebhookPanel';
import { LastLeadCard } from './components/LastLeadCard';
import { LogsPanel } from './components/LogsPanel';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [lastEvent, setLastEvent] = useState<WebhookEventRow | null>(null);
  const [lastLead, setLastLead] = useState<LeadDataRow | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const bannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await api.status();
      setConnection(s);
      return s;
    } catch {
      return null;
    }
  }, []);

  const fetchAll = useCallback(async () => {
    const [ev, ld, lg, d] = await Promise.allSettled([
      api.lastEvent(),
      api.lastLead(),
      api.logs(80),
      api.diagnostics(),
    ]);
    if (ev.status === 'fulfilled') setLastEvent(ev.value.data);
    if (ld.status === 'fulfilled') setLastLead(ld.value.data);
    if (lg.status === 'fulfilled') setLogs(lg.value.data);
    if (d.status === 'fulfilled') setDiag(d.value);
  }, []);

  const refresh = useCallback(async () => {
    await fetchStatus();
    await fetchAll();
  }, [fetchStatus, fetchAll]);

  // Verifica parâmetros da URL (após redirect do OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const meta = params.get('meta');
    const reason = params.get('reason');
    if (meta) {
      window.history.replaceState({}, '', '/');
      if (meta === 'connected') {
        setBanner({ type: 'success', message: 'Conexão com a Meta estabelecida com sucesso!' });
      } else {
        setBanner({ type: 'error', message: `Falha na conexão: ${reason ?? 'verificar configuração do app.'}` });
      }
    }
  }, []);

  // Carrega dados iniciais
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Polling periódico (5s) como fallback ao Realtime
  useEffect(() => {
    const id = setInterval(fetchAll, 5_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // Supabase Realtime — escuta inserts nas tabelas relevantes
  useEffect(() => {
    if (!supabaseAvailable) return;
    const client = supabase();
    if (!client) return;

    const channel = client
      .channel('meta-integration')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meta_webhook_events' },
        () => fetchAll(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meta_lead_data' },
        () => fetchAll(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meta_logs' },
        () => fetchAll(),
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [fetchAll]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!banner) return;
    if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    bannerTimeout.current = setTimeout(() => setBanner(null), 8000);
    return () => { if (bannerTimeout.current) clearTimeout(bannerTimeout.current); };
  }, [banner]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-slate-900">Integração Meta Ads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Conecte sua conta Meta para sincronizar seus leads diretamente com seu CRM.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Banner de feedback */}
        {banner && (
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
              banner.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {banner.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="text-red-600" />
            )}
            {banner.message}
          </div>
        )}

        <ConnectionCard status={connection} />
        <SelectionPanel connection={connection} onSaved={setConnection} />

        <div className="grid gap-6 lg:grid-cols-2">
          <WebhookPanel connection={connection} lastEvent={lastEvent} />
          <LastLeadCard lead={lastLead} />
        </div>

        <DiagnosticsPanel diag={diag} />
        <LogsPanel logs={logs} />

        {!supabaseAvailable && (
          <p className="rounded-lg bg-amber-50 p-3 text-center text-xs text-amber-700">
            Supabase Realtime desativado: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para logs ao vivo.
          </p>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white/50 py-4 text-center text-xs text-slate-400">
        CRM Skipp Digital — Laboratório de Integração Meta Ads
      </footer>
    </div>
  );
}