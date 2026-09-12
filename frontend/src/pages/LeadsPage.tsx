import { useCallback, useEffect, useState } from 'react';
import { Card, Badge } from '../components/ui';
import { api } from '../lib/api';
import { supabase, supabaseAvailable } from '../lib/supabase';
import { Search, ChevronDown } from 'lucide-react';

type Lead = Record<string, unknown> & {
  id: string; lead_id: string; name: string | null; phone: string | null; email: string | null;
  page_name: string | null; page_id: string | null; form_name: string | null; form_id: string | null;
  ad_account_id: string | null; ad_account_name: string | null;
  status: string; received_at: string; updated_at?: string | null; extra?: Record<string, string> | null; raw?: unknown;
};

const STATUS_LABEL: Record<string, { label: string; variant: 'success'|'warning'|'neutral'|'error' }> = {
  novo: { label: 'Novo', variant: 'neutral' },
  contato_realizado: { label: 'Contato realizado', variant: 'warning' },
  qualificado: { label: 'Qualificado', variant: 'success' },
  agendamento: { label: 'Agendamento', variant: 'warning' },
  cliente: { label: 'Cliente', variant: 'success' },
  perdido: { label: 'Perdido', variant: 'error' },
};

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pageId, setPageId] = useState('');
  const [formId, setFormId] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);

  const [pages, setPages] = useState<{ page_id: string; name: string }[]>([]);
  const [forms, setForms] = useState<{ form_id: string; name: string }[]>([]);
  const [accounts, setAccounts] = useState<{ ad_account_id: string; name: string }[]>([]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.leads({ status: status || undefined, pageId: pageId || undefined, formId: formId || undefined, adAccountId: adAccountId || undefined, search: search || undefined, from: from || undefined, to: to || undefined, limit: 50 });
      setLeads(r.data as Lead[]);
      setTotal(r.total);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [status, pageId, formId, adAccountId, search, from, to]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    api.resources().then((r) => {
      setPages(r.data.pages ?? []);
      setAccounts(r.data.adAccounts ?? []);
      setForms(r.data.forms ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!supabaseAvailable) return;
    const c = supabase();
    if (!c) return;
    const ch = c.channel('crm-leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_leads' }, () => fetchLeads())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crm_leads' }, () => fetchLeads())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meta_lead_data' }, () => fetchLeads())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [fetchLeads]);

  const updateStatus = async (lead: Lead, newStatus: string) => {
    await api.updateLeadStatus(lead.id, newStatus);
    fetchLeads();
    if (selected?.id === lead.id) setSelected({ ...lead, status: newStatus });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Leads</h2>
          <p className="text-sm text-slate-500">{total} leads • Realtime ativo {supabaseAvailable ? '✓' : '(polling)'}</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, telefone ou email" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:w-72" />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-6">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">Todos status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">Todas páginas</option>
            {pages.map((p) => <option key={p.page_id} value={p.page_id}>{p.name}</option>)}
          </select>
          <select value={formId} onChange={(e) => setFormId(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">Todos formulários</option>
            {forms.map((f) => <option key={f.form_id} value={f.form_id}>{f.name}</option>)}
          </select>
          <select value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">Todas contas</option>
            {accounts.map((a) => <option key={a.ad_account_id} value={a.ad_account_id}>{a.name}</option>)}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-left">Origem</th>
                <th className="px-4 py-3 text-left">Formulário</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhum lead encontrado. Conecte a Meta e gere um lead de teste.</td></tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id} onClick={() => setSelected(l)} className="cursor-pointer hover:bg-indigo-50/40">
                    <td className="px-4 py-3 font-medium text-slate-900">{String(l.name ?? '—')}</td>
                    <td className="px-4 py-3 text-slate-600">{String(l.phone ?? '—')}</td>
                    <td className="px-4 py-3 text-slate-600">{String(l.page_name ?? l.page_id ?? '—')}</td>
                    <td className="px-4 py-3 text-slate-600">{String(l.form_name ?? l.form_id ?? '—')}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(String(l.received_at)).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_LABEL[String(l.status)]?.variant ?? 'neutral'}>{STATUS_LABEL[String(l.status)]?.label ?? String(l.status)}</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">{String(selected.name ?? 'Lead sem nome')}</h3>
            <p className="text-xs text-slate-500">{String(selected.lead_id)} • {new Date(String(selected.received_at)).toLocaleString('pt-BR')}</p>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Telefone</span><span className="font-medium">{String(selected.phone ?? '—')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{String(selected.email ?? '—')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Página</span><span>{String(selected.page_name ?? selected.page_id ?? '—')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Formulário</span><span>{String(selected.form_name ?? selected.form_id ?? '—')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Conta</span><span>{String((selected as Record<string,unknown>).ad_account_name as string ?? (selected as Record<string,unknown>).ad_account_id as string ?? '—')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status CRM</span><span className="capitalize">{String(selected.status)}</span></div>
              {selected.extra && <pre className="rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(selected.extra, null, 2)}</pre>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <button key={k} onClick={() => updateStatus(selected, k)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${String(selected.status)===k ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{v.label}</button>
              ))}
            </div>
            <button onClick={() => setSelected(null)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-sm hover:bg-slate-50">Fechar <ChevronDown size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
