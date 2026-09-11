import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { error as logError, info, warn } from '../lib/logger';
import { processWebhookPayload, verifyWebhook } from '../services/webhook.service';
import type { WebhookPayload } from '../types/meta';

export const webhookRouter = Router();

// Handshake de verificação do webhook: a Meta faz um GET na callback URL
// usando ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// e espera o challenge de volta com status 200.
webhookRouter.get('/webhook', (req, res) => {
  const result = verifyWebhook(req.query as Record<string, unknown>);
  if (result.ok) {
    info('Webhook verificado com sucesso pela Meta', { challenge: result.challenge });
    res.status(200).type('text/plain').send(result.challenge);
    return;
  }
  warn('Falha na verificação do webhook', { reason: result.reason });
  res.status(403).send('Verification token mismatch');
});

// Recepção de eventos: a Meta faz POST aqui com os eventos (object=page, field=leadgen).
// Meta exige resposta 200 o quanto antes.
webhookRouter.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const payload = (req.body ?? {}) as WebhookPayload;

    // Confirmação de recebimento imediata para a Meta
    res.status(200).json({ status: 'received' });

    try {
      const { processed } = await processWebhookPayload(payload);
      info('Payload de webhook processado', {
        object: payload.object,
        entries: payload.entry?.length ?? 0,
        processed,
      });
    } catch (err) {
      logError('Falha ao processar payload de webhook', { error: err instanceof Error ? err.message : String(err) });
    }
  })
);