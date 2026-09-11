import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { isMetaConfigured, isSupabaseConfigured } from '../config/env';
import { checkToken } from '../services/metaGraph';
import {
  getConnectionStatus,
  getLastLead,
  getLastWebhookEvent,
} from '../services/repository';

export const statusRouter = Router();

let cachedMetaApiCheck: { status: 'connected' | 'disconnected'; detail: string; at: number } | null = null;
const META_CHECK_TTL_MS = 30_000;

async function checkMetaApi(): Promise<{ status: 'connected' | 'disconnected'; detail: string }> {
  if (!isMetaConfigured()) {
    return { status: 'disconnected', detail: 'META_APP_ID/APP_SECRET não configurados' };
  }
  if (cachedMetaApiCheck && Date.now() - cachedMetaApiCheck.at < META_CHECK_TTL_MS) {
    return { status: cachedMetaApiCheck.status, detail: cachedMetaApiCheck.detail };
  }

  try {
    const connection = await getConnectionStatus();
    if (!connection.connected || !connection.tokenExpiresAt) {
      const result = { status: 'disconnected' as const, detail: 'Sem token de acesso conectado' };
      cachedMetaApiCheck = { ...result, at: Date.now() };
      return result;
    }
    const token = await getActiveToken();
    if (!token) {
      const result = { status: 'disconnected' as const, detail: 'Token expirado ou ausente' };
      cachedMetaApiCheck = { ...result, at: Date.now() };
      return result;
    }
    const me = await checkToken(token);
    const result = { status: 'connected' as const, detail: `Conectado como ${me.name}` };
    cachedMetaApiCheck = { ...result, at: Date.now() };
    return result;
  } catch (err) {
    const result = {
      status: 'disconnected' as const,
      detail: err instanceof Error ? err.message : String(err),
    };
    cachedMetaApiCheck = { ...result, at: Date.now() };
    return result;
  }
}

async function getActiveToken(): Promise<string | null> {
  const connection = await getConnectionStatus();
  if (!connection.connected) return null;
  if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt).getTime() < Date.now()) {
    return null;
  }
  // O token em si é lido apenas quando preciso (no checkToken)
  const { getConnection } = await import('../services/repository');
  const row = await getConnection();
  return row?.access_token ?? null;
}

async function checkDb(): Promise<'connected' | 'disconnected'> {
  if (!isSupabaseConfigured()) return 'disconnected';
  try {
    const { db } = await import('../services/supabase');
    const { error } = await db().from('meta_webhook_events').select('id').limit(1);
    return error ? 'disconnected' : 'connected';
  } catch {
    return 'disconnected';
  }
}

// Diagnóstico geral da integração (painel de diagnóstico do frontend)
statusRouter.get(
  '/diagnostics',
  asyncHandler(async (_req, res) => {
    const [metaApi, dbStatus, connection, lastEvent, lastLead] = await Promise.all([
      checkMetaApi().catch(() => ({ status: 'disconnected' as const, detail: '' })),
      checkDb().catch(() => 'disconnected'),
      (async () => {
        try {
          return await getConnectionStatus();
        } catch {
          return {
            connected: false,
            status: 'disconnected',
            tokenExpiresAt: null,
            selections: { pageId: null, pageName: null, adAccountId: null, adAccountName: null, formId: null, formName: null },
          };
        }
      })(),
      getLastWebhookEvent().catch(() => null),
      getLastLead().catch(() => null),
    ]);
    res.json({
      metaApi,
      db: { status: dbStatus },
      webhook: {
        status: connection.connected ? 'active' : 'inactive',
        lastHitAt: lastEvent?.received_at ?? null,
        lastEventType: lastEvent?.event_type ?? null,
        lastEventStatus: lastEvent?.status ?? null,
      },
      connection,
      lastEvent: lastEvent
        ? {
            id: lastEvent.id,
            eventType: lastEvent.event_type,
            leadId: lastEvent.lead_id,
            receivedAt: lastEvent.received_at,
            status: lastEvent.status,
          }
        : null,
      lastLead: lastLead
        ? {
            id: lastLead.id,
            leadId: lastLead.lead_id,
            name: lastLead.name,
            email: lastLead.email,
            phone: lastLead.phone,
            receivedAt: lastLead.received_at,
          }
        : null,
    });
  })
);

// Health check simples do backend
statusRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    res.json({
      ok: true,
      time: new Date().toISOString(),
      metaConfigured: isMetaConfigured(),
      dbConfigured: isSupabaseConfigured(),
    });
  })
);