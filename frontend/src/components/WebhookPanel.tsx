import { Card, SectionTitle, Badge, Field } from './ui';
import type { ConnectionStatus, WebhookEventRow } from '../types';
import { formatDate, timeAgo } from '../lib/format';
import { Webhook } from 'lucide-react';

export function WebhookPanel({
  connection,
  lastEvent,
}: {
  connection: ConnectionStatus | null;
  lastEvent: WebhookEventRow | null;
}) {
  const active = connection?.connected;

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Webhook size={18} className="text-indigo-600" />
        <SectionTitle>Teste de integração</SectionTitle>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Status do Webhook">
          <Badge variant={active ? 'success' : 'neutral'}>
            {active ? 'Ativo (conectado à Meta)' : 'Aguardando conexão'}
          </Badge>
        </Field>
        <Field label="Tipo do evento">
          {lastEvent?.event_type ?? '—'}
        </Field>
        <Field label="Último evento recebido">
          {lastEvent ? timeAgo(lastEvent.received_at) : 'Nenhum evento recebido ainda'}
        </Field>
        <Field label="Data e hora">
          {formatDate(lastEvent?.received_at)}
        </Field>
        <Field label="Status do processamento">
          <Badge variant={lastEvent?.status === 'processed' ? 'success' : lastEvent?.status === 'error' ? 'error' : 'neutral'}>
            {lastEvent?.status ?? '—'}
          </Badge>
        </Field>
        {lastEvent?.lead_id && (
          <Field label="Lead ID">
            <span className="font-mono text-xs">{lastEvent.lead_id}</span>
          </Field>
        )}
      </div>
    </Card>
  );
}