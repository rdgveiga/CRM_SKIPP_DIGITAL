import { Router } from 'express';
import { asyncHandler, ApiError } from '../lib/asyncHandler.js';
import { getConnection } from '../services/repository.js';
import { listCrmLeads, getCrmLeadById, updateCrmLeadStatus, type CrmLeadStatus } from '../services/repository.js';

export const leadsRouter = Router();

const ALLOWED_STATUSES: CrmLeadStatus[] = ['novo','contato_realizado','qualificado','agendamento','cliente','perdido'];

async function requireAuth(): Promise<void> {
  const conn = await getConnection();
  if (!conn?.access_token) throw new ApiError(401, 'Conecte-se à Meta primeiro.');
}

// Lista leads com filtros e busca
leadsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    await requireAuth();
    const { status, pageId, formId, adAccountId, search, from, to, limit, offset } = req.query as Record<string, string>;
    if (status && !ALLOWED_STATUSES.includes(status as CrmLeadStatus)) {
      throw new ApiError(400, `Status inválido. Use: ${ALLOWED_STATUSES.join(', ')}`);
    }
    const result = await listCrmLeads({
      status,
      pageId,
      formId,
      adAccountId,
      search,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({ data: result.data, total: result.total });
  })
);

leadsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    await requireAuth();
    const lead = await getCrmLeadById(req.params.id);
    if (!lead) throw new ApiError(404, 'Lead não encontrado');
    res.json({ data: lead });
  })
);

leadsRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    await requireAuth();
    const { status, notes } = req.body as { status?: string; notes?: string };
    if (!status || !ALLOWED_STATUSES.includes(status as CrmLeadStatus)) {
      throw new ApiError(400, `Status obrigatório: ${ALLOWED_STATUSES.join(', ')}`);
    }
    const updated = await updateCrmLeadStatus(req.params.id, status as CrmLeadStatus, notes);
    res.json({ data: updated });
  })
);
