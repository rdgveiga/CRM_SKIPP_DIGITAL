import { useEffect, useState } from 'react';
import { Card } from '../components/ui';
import { api } from '../lib/api';
import type { Diagnostics } from '../types';
import { Users, Megaphone, Activity, AlertTriangle } from 'lucide-react';

export function DashboardPage() {
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [leadsTotal, setLeadsTotal] = useState<number | null>(null);

  useEffect(() => {
    api.diagnostics().then(setDiag).catch(() => {});
    api.leads({ limit: 1 }).then((r) => setLeadsTotal(r.total)).catch(() => setLeadsTotal(null));
  }, []);

  const stats = [
    { label: 'Leads totais', value: leadsTotal ?? '—', icon: Users, color: 'text-indigo-600' },
    { label: 'META API', value: diag?.metaApi.status ?? '—', icon: Megaphone, color: diag?.metaApi.status === 'connected' ? 'text-emerald-600' : 'text-amber-600' },
    { label: 'Banco', value: diag?.db.status ?? '—', icon: Activity, color: diag?.db.status === 'connected' ? 'text-emerald-600' : 'text-red-600' },
    { label: 'Último lead', value: diag?.lastLead ? new Date(diag.lastLead.receivedAt).toLocaleDateString('pt-BR') : '—', icon: AlertTriangle, color: 'text-slate-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500">Visão geral do CRM e da integração Meta.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="flex items-center gap-4">
              <div className={`rounded-xl bg-slate-100 p-3 ${s.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-lg font-semibold text-slate-900 capitalize">{String(s.value)}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <h3 className="mb-2 font-semibold text-slate-900">Próximos passos</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Conecte a Meta em <b>Integração Meta Ads</b> e clique <b>Sincronizar recursos</b> para carregar todas Páginas/Contas/Formulários.</li>
          <li>Configure webhook em <b>developers.facebook.com &gt; Webhooks &gt; leadgen</b> com <code className="rounded bg-slate-100 px-1">https://crm-skipp-digital-frontend.vercel.app/api/meta/webhook</code> e token <code className="rounded bg-slate-100 px-1">skipp-digital-meta-verify-token</code>.</li>
          <li>Leads cairão em <b>Leads</b> via webhook (sem reload, Realtime).</li>
          <li>Preparado para: WhatsApp, Cadência, Pipeline, Lead scoring, Conversões offline.</li>
        </ul>
      </Card>

      {diag && (
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">Diagnóstico</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">META API</span><span className={diag.metaApi.status==='connected'?'text-emerald-600':'text-red-600'}>{diag.metaApi.status} - {diag.metaApi.detail}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Banco</span><span>{diag.db.status}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Webhook</span><span>{diag.webhook.status} {diag.webhook.lastHitAt ? `• ${new Date(diag.webhook.lastHitAt).toLocaleString('pt-BR')}` : ''}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Conexão</span><span>{diag.connection.status}</span></div>
          </div>
        </Card>
      )}
    </div>
  );
}
