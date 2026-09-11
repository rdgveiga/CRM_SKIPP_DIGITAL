import { Card, SectionTitle, Badge } from './ui';
import type { Diagnostics } from '../types';
import { formatDate, timeAgo } from '../lib/format';
import { Database, Webhook, Shield, Clock, Activity } from 'lucide-react';

export function DiagnosticsPanel({ diag }: { diag: Diagnostics | null }) {
  if (!diag) {
    return (
      <Card>
        <SectionTitle>Diagnóstico</SectionTitle>
        <p className="py-2 text-sm text-slate-400">Carregando diagnóstico…</p>
      </Card>
    );
  }

  const items = [
    {
      icon: Shield,
      label: 'META API',
      detail: diag.metaApi.detail,
      ok: diag.metaApi.status === 'connected',
    },
    {
      icon: Webhook,
      label: 'WEBHOOK',
      detail: diag.webhook.status === 'active' ? 'Ativo' : 'Inativo',
      ok: diag.webhook.status === 'active',
    },
    {
      icon: Database,
      label: 'BANCO DE DADOS',
      detail: diag.db.status === 'connected' ? 'Conectado' : 'Desconectado',
      ok: diag.db.status === 'connected',
    },
    {
      icon: Clock,
      label: 'ÚLTIMO EVENTO',
      detail: diag.lastEvent
        ? `${formatDate(diag.lastEvent.receivedAt)} — ${diag.lastEvent.eventType ?? '?'}`
        : 'Nenhum',
      ok: !!diag.lastEvent,
    },
    {
      icon: Activity,
      label: 'ÚLTIMO LEAD',
      detail: diag.lastLead
        ? `${diag.lastLead.name ?? diag.lastLead.leadId} (${timeAgo(diag.lastLead.receivedAt)})`
        : 'Nenhum',
      ok: !!diag.lastLead,
    },
  ];

  return (
    <Card>
      <SectionTitle className="mb-4">Diagnóstico</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, label, detail, ok }) => (
          <div key={label} className="flex items-start gap-2">
            <Icon size={14} className="mt-0.5 text-slate-400" />
            <div>
              <span className="mb-0.5 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
              <Badge variant={ok ? 'success' : 'neutral'}>{detail}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}