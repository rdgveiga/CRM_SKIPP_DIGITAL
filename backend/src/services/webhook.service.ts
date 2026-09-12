import { env } from '../config/env.js';
import { error, info, warn } from '../lib/logger.js';
import { getLead, parseLeadFields } from './metaGraph.js';
import {
  findLeadByLeadId,
  findWebhookByLeadId,
  getConnection,
  insertLeadData,
  insertWebhookEvent,
  syncCrmLead,
  updateWebhookEvent,
} from './repository.js';
import type {
  LeadDataRow,
  WebhookChange,
  WebhookChangeValue,
  WebhookPayload,
} from '../types/meta.js';

// =============================================================================
// Verificação do webhook (handshake solicitado pela Meta ao configurar)
// Documentação: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
// A Meta faz GET na callback URL com ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// Devemos responder com o valor de hub.challenge se o verify_token bater.
// =============================================================================

export function verifyWebhook(params: Record<string, unknown>): { ok: true; challenge: string } | { ok: false; reason: string } {
  const mode = String(params['hub.mode'] ?? '');
  const verifyToken = String(params['hub.verify_token'] ?? '');
  const challenge = String(params['hub.challenge'] ?? '');

  if (mode === 'subscribe' && verifyToken === env.webhookVerifyToken && challenge) {
    return { ok: true, challenge };
  }
  if (mode !== 'subscribe') {
    return { ok: false, reason: `hub.mode inesperado: "${mode}"` };
  }
  return { ok: false, reason: 'hub.verify_token não confere' };
}

// =============================================================================
// Extrai eventos leadgen de um payload de webhook da Meta
// =============================================================================

export interface ExtractedEvent {
  leadId: string;
  pageId: string | null;
  formId: string | null;
  createdTime: number | null;
  changeValue: WebhookChangeValue;
  entryTime: number | null;
}

export function extractLeadgenEvents(payload: WebhookPayload): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];
  const entries = payload.entry ?? [];

  for (const entry of entries) {
    const pageId = entry.id ?? null;
    const changes: WebhookChange[] = entry.changes ?? [];
    for (const change of changes) {
      if (change.field !== 'leadgen' || !change.value) continue;
      const value = change.value;
      if (!value.leadgen_id) {
        warn('Evento leadgen sem leadgen_id (possível evento de teste/lock):', value);
        continue;
      }
      events.push({
        leadId: value.leadgen_id,
        pageId,
        formId: value.form_id ?? null,
        createdTime: value.created_time ?? null,
        changeValue: value,
        entryTime: entry.time ?? null,
      });
    }
  }
  return events;
}

// =============================================================================
// Processa um payload de webhook: grava o evento bruto, enriquece o lead e
// persiste os dados parseados. Nunca lança para o chamador: erros viram log
// e o evento fica marcado como 'error'.
// =============================================================================

export async function processWebhookPayload(payload: WebhookPayload): Promise<{ processed: number }> {
  const events = extractLeadgenEvents(payload);
  if (events.length === 0) {
    info('Webhook recebido sem eventos leadgen processáveis', { object: payload.object, entryCount: payload.entry?.length ?? 0 });
    return { processed: 0 };
  }

  const connection = await getConnection().catch((err) => {
    warn('Não foi possível ler a conexão no processamento do webhook', { err: String(err) });
    return null;
  });

  const token = connection?.access_token ?? null;
  const selections = {
    formName: connection?.form_name ?? null,
    pageName: connection?.page_name ?? null,
  };

  let processed = 0;
  for (const event of events) {
    let eventId: string | null = null;
    try {
      // Idempotência: se lead já existe, não reprocessa Graph API, só garante crm sync
      const existingLead = await findLeadByLeadId(event.leadId).catch(() => null);
      if (existingLead) {
        const existingEvent = await findWebhookByLeadId(event.leadId).catch(() => null);
        if (existingEvent) {
          info('Lead duplicado ignorado (idempotência)', { lead_id: event.leadId });
          await syncCrmLead(event.leadId).catch(() => undefined);
          processed += 1;
          continue;
        }
      }

      const row = await insertWebhookEvent({
        event_type: 'leadgen',
        lead_id: event.leadId,
        page_id: event.pageId,
        form_id: event.formId,
        payload: {
          ...event.changeValue,
          entry_time: event.entryTime,
          raw_object: payload.object,
        },
        status: 'received',
      });
      eventId = row.id;

      if (!token) {
        const msg = 'Webhook recebido mas não há token salvo (faça o login na Meta primeiro)';
        warn(msg, { lead_id: event.leadId });
        await updateWebhookEvent(eventId, {
          status: 'error',
          processed_at: new Date().toISOString(),
          payload: { ...(row.payload as object), error: msg },
        });
        continue;
      }

      info('Novo lead recebido via webhook - buscando detalhes', {
        lead_id: event.leadId,
        form_id: event.formId,
        page_id: event.pageId,
      });

      const lead = await getLead(token, event.leadId);
      const parsed = parseLeadFields(lead.field_data ?? []);

      const leadData: Partial<LeadDataRow> & { lead_id: string } = {
        event_id: eventId,
        lead_id: event.leadId,
        form_id: event.formId ?? lead.form_id ?? null,
        page_id: event.pageId ?? lead.page_id ?? null,
        form_name: selections.formName,
        page_name: selections.pageName,
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        extra: parsed.extra,
        raw: lead,
        status: 'novo',
        updated_at: new Date().toISOString(),
      } as unknown as Partial<LeadDataRow> & { lead_id: string };
      // ad_account da seleção atual (se houver) e do webhook value
      const webhookAdId = (event.changeValue as { ad_id?: string }).ad_id ?? null;
      if (webhookAdId) (leadData as Record<string, unknown>).ad_account_id = webhookAdId;
      if (connection?.ad_account_id) (leadData as Record<string, unknown>).ad_account_id = connection.ad_account_id;
      if (connection?.ad_account_name) (leadData as Record<string, unknown>).ad_account_name = connection.ad_account_name;

      await insertLeadData(leadData);
      await syncCrmLead(event.leadId).catch((e) => warn('Falha ao sync crm_leads', { lead_id: event.leadId, error: String(e) }));

      await updateWebhookEvent(eventId, {
        status: 'processed',
        processed_at: new Date().toISOString(),
      });

      info('Lead processado e salvo', {
        lead_id: event.leadId,
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
      });
      processed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      error('Falha ao processar evento de webhook', { lead_id: event.leadId, error: message });
      if (eventId) {
        await updateWebhookEvent(eventId, {
          status: 'error',
          processed_at: new Date().toISOString(),
        }).catch(() => undefined);
      }
    }
  }

  return { processed };
}
