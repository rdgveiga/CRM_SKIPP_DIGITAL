import { Router } from 'express';
import { asyncHandler, ApiError } from '../lib/asyncHandler.js';
import { getConnection, getCachedAdAccounts, getCachedForms, getCachedPages } from '../services/repository.js';
import { syncAllResources } from '../services/sync.service.js';

export const syncRouter = Router();

async function requireToken(): Promise<string> {
  const conn = await getConnection();
  if (!conn?.access_token) throw new ApiError(401, 'Conecte-se à Meta primeiro.');
  return conn.access_token;
}

// Sincroniza todas Páginas / Contas / Formulários da Meta e persiste no Supabase
syncRouter.post(
  '/sync',
  asyncHandler(async (_req, res) => {
    const token = await requireToken();
    const result = await syncAllResources(token);
    res.json({ data: result });
  })
);

// Lista recursos já sincronizados (cache)
syncRouter.get(
  '/resources',
  asyncHandler(async (_req, res) => {
    await requireToken();
    const [pages, adAccounts, forms] = await Promise.all([getCachedPages(), getCachedAdAccounts(), getCachedForms()]);
    res.json({ data: { pages, adAccounts, forms } });
  })
);

syncRouter.get(
  '/resources/pages',
  asyncHandler(async (_req, res) => {
    await requireToken();
    res.json({ data: await getCachedPages() });
  })
);
syncRouter.get(
  '/resources/adaccounts',
  asyncHandler(async (_req, res) => {
    await requireToken();
    res.json({ data: await getCachedAdAccounts() });
  })
);
syncRouter.get(
  '/resources/forms',
  asyncHandler(async (_req, res) => {
    await requireToken();
    res.json({ data: await getCachedForms() });
  })
);
