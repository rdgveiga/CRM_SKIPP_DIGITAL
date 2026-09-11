import { Card, SectionTitle, Field } from './ui';
import type { LeadDataRow } from '../types';
import { formatDate, timeAgo } from '../lib/format';
import { User, Mail, Phone, Clock, Hash, FileText, Globe } from 'lucide-react';

export function LastLeadCard({ lead }: { lead: LeadDataRow | null }) {
  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30">
      <SectionTitle className="mb-4">Último lead recebido</SectionTitle>
      {!lead ? (
        <p className="py-4 text-sm text-slate-400 italic">Nenhum lead recebido ainda. Envie um lead de teste no formulário configurado.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-2">
            <User size={14} className="mt-0.5 text-emerald-600" />
            <Field label="Nome">{lead.name ?? '—'}</Field>
          </div>
          <div className="flex items-start gap-2">
            <Phone size={14} className="mt-0.5 text-emerald-600" />
            <Field label="Telefone">{lead.phone ?? '—'}</Field>
          </div>
          <div className="flex items-start gap-2">
            <Mail size={14} className="mt-0.5 text-emerald-600" />
            <Field label="Email">{lead.email ?? '—'}</Field>
          </div>
          <div className="flex items-start gap-2">
            <FileText size={14} className="mt-0.5 text-emerald-600" />
            <Field label="Formulário">{lead.form_name ?? lead.form_id ?? '—'}</Field>
          </div>
          <div className="flex items-start gap-2">
            <Globe size={14} className="mt-0.5 text-emerald-600" />
            <Field label="Página">{lead.page_name ?? lead.page_id ?? '—'}</Field>
          </div>
          <div className="flex items-start gap-2">
            <Clock size={14} className="mt-0.5 text-emerald-600" />
            <Field label="Recebido em">
              <div>{formatDate(lead.received_at)}</div>
              <div className="text-xs text-slate-400">{timeAgo(lead.received_at)}</div>
            </Field>
          </div>
          <div className="flex items-start gap-2">
            <Hash size={14} className="mt-0.5 text-emerald-600" />
            <Field label="ID do lead">
              <span className="font-mono text-xs break-all">{lead.lead_id}</span>
            </Field>
          </div>
          <Field label="ID do formulário">
            <span className="font-mono text-xs">{lead.form_id ?? '—'}</span>
          </Field>
          <Field label="ID da página">
            <span className="font-mono text-xs">{lead.page_id ?? '—'}</span>
          </Field>
          {lead.extra && Object.keys(lead.extra).length > 0 && (
            <div className="col-span-full mt-2">
              <SectionTitle className="mb-2">Outros dados</SectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(lead.extra).map(([k, v]) => (
                  <Field key={k} label={k}>{v}</Field>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}