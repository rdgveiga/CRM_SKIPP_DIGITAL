import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { ApiError } from './lib/asyncHandler.js';
import { error as logError } from './lib/logger.js';
import { authRouter } from './routes/auth.routes.js';
import { metaRouter } from './routes/meta.routes.js';
import { statusRouter } from './routes/status.routes.js';
import { webhookRouter } from './routes/webhook.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.corsOrigin.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '1mb' }));

// Health check (usado também como heartbeat do deploy)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), env: env.nodeEnv });
});

// Rotas do módulo de Integração Meta Ads
app.use('/api/meta', authRouter);
app.use('/api/meta', metaRouter);
app.use('/api/meta', webhookRouter);
app.use('/api', statusRouter);

// 404 para rotas /api desconhecidas
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada. Verifique a lista de endpoints no README.' });
});

// Tratamento de erro central
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const message = err instanceof Error ? err.message : 'Erro interno';
  const status = err instanceof ApiError ? err.statusCode : 500;
  logError('Erro não tratado', { path: req.path, method: req.method, message });
  res.status(status).json({ error: message });
};
app.use(errorHandler);
