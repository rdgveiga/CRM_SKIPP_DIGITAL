import { Router } from 'express';
import { ApiError, asyncHandler } from '../lib/asyncHandler';
import { error as logError } from '../lib/logger';
import {
  getAdAccounts,
  getLeadGenForms,
  getPages,
  sanitizeAdAccountId,
} from '../services/metaGraph';
import {
  getConnection,
  getConnectionStatus,
  getLastLead,
  getLastWebhookEvent,
  getRecentLogs,
  saveSelections,
} from '../services/repository';
import type { ConnectionRow, MetaSelections } from '../types/meta';

export const metaRouter = Router();

async function requireToken(): Promise<string> {
  const connection = await getConnection();
  if (!connection?.access_token) {
    throw new ApiError(401, 'Conecte-se à Meta primeiro (botão "Conectar com Meta").');
  }
  return connection.access_token;
}

// Status da conexão + seleções salvas
metaRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    res.json(await getConnectionStatus());
  })
);

// Lista as Páginas do Facebook do usuário
metaRouter.get(
  '/pages',
  asyncHandler(async (_req, res) => {
    const token = await requireToken();
    const pages = await getPages(token);
    res.json({ data: pages });
  })
);

// Lista as contas de anúncio do usuário
metaRouter.get(
  '/adaccounts',
  asyncHandler(async (_req, res) => {
    const token = await requireToken();
    const accounts = await getAdAccounts(token);
    res.json({ data: accounts });
  })
);

// Lista os formulários de Lead Ads de uma conta de anúncios
metaRouter.get(
  '/forms',
  asyncHandler(async (req, res) => {
    const token = await requireToken();
    const adAccountId = String(req.query.adAccountId ?? '');
    if (!adAccountId) {
      res.status(400).json({ error: 'Informe adAccountId para listar os formulários.' });
      return;
    }
    const forms = await getLeadGenForms(token, sanitizeAdAccountId(adAccountId));
    res.json({ data: forms });
  })
);

// Salva as seleções (página, conta de anúncios e formulário)
metaRouter.post(
  '/config',
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Partial<MetaSelections> & Partial<ConnectionRow>;

    const patch: Partial<ConnectionRow> = {};
    if (body.pageId !== undefined) patch.page_id = body.pageId as string;
    if (body.pageName !== undefined) patch.page_name = body.pageName as string;
    if (body.adAccountId !== undefined) patch.ad_account_id = body.adAccountId as string;
    if (body.adAccountName !== undefined) patch.ad_account_name = body.adAccountName as string;
    if (body.formId !== undefined) patch.form_id = body.formId as string;
    if (body.formName !== undefined) patch.form_name = body.formName as string;

    await saveSelections(patch);
    res.json(await getConnectionStatus());
  })
);

// Último evento recebido via webhook
metaRouter.get(
  '/last-event',
  asyncHandler(async (_req, res) => {
    res.json({ data: await getLastWebhookEvent() });
  })
);

// Último lead recebido
metaRouter.get(
  '/last-lead',
  asyncHandler(async (_req, res) => {
    res.json({ data: await getLastLead() });
  })
);

// Logs técnicos recentes
metaRouter.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 60), 1), 200);
    res.json({ data: await getRecentLogs(limit) });
  })
);

// Expõe helpers para diagnóstico
export { logError };