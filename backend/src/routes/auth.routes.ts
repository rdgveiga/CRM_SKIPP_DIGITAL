import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { error as logError, info, warn } from '../lib/logger.js';
import { buildOAuthDialogUrl, formatGraphError, getAccessTokenFromCode, getLongLivedToken, ensureMetaConfigured } from '../services/metaGraph.js';
import { saveToken, setConnectionStatus } from '../services/repository.js';

export const authRouter = Router();

const STATE_COOKIE = 'meta_oauth_state';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

// Inicia o fluxo OAuth: redireciona o navegador para o diálogo oficial da Meta.
authRouter.get('/auth/start', (_req, res) => {
  try {
    ensureMetaConfigured();
    const state = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.nodeEnv === 'production',
      maxAge: STATE_MAX_AGE_MS,
    });
    const url = buildOAuthDialogUrl(state);
    info('Iniciando fluxo OAuth da Meta', { redirectTo: 'facebook.com/dialog/oauth' });
    res.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    logError('Falha ao iniciar OAuth da Meta', { error: message });
    // Em vez de JSON branco (quebra na Vercel), redireciona ao frontend para exibir banner
    const reason = encodeURIComponent(message);
    // Se frontendUrl não estiver configurado corretamente, tenta fallback para referer/origin
    const frontend = env.frontendUrl || _req.headers.origin || '/';
    // Evita loop se frontend for localhost em prod
    if (frontend.startsWith('http')) {
      return res.redirect(`${frontend}/?meta=error&reason=${reason}`);
    }
    res.status(500).json({ error: message });
  }
});

// Callback da Meta: troca o código por token, gera token de longa duração e
// salva no banco. Redireciona o navegador de volta ao frontend.
authRouter.get('/auth/callback', async (req, res) => {
  const code = String(req.query.code ?? '');
  const state = String(req.query.state ?? '');
  const error = String(req.query.error ?? '');
  const errorDesc = String(req.query.error_description ?? '');
  const errorReason = String(req.query.error_reason ?? '');
  const expectedState = readCookie(req.headers.cookie, STATE_COOKIE);

  if (error) {
    const detail = errorDesc || errorReason || error;
    warn('Meta retornou erro no callback OAuth', { error, errorDesc, errorReason });
    return res.redirect(`${env.frontendUrl}/?meta=error&reason=${encodeURIComponent(`Meta: ${detail} (${error})`)}`);
  }
  if (!code) {
    const fullQuery = new URLSearchParams(req.query as Record<string, string>).toString() || 'vazio';
    warn('Callback sem code e sem error da Meta', { query: req.query, fullQuery });
    return res.redirect(`${env.frontendUrl}/?meta=error&reason=${encodeURIComponent(`no_code - query: ${fullQuery}`)}`);
  }
  if (expectedState && state !== expectedState) {
    warn('State do OAuth não confere (possível CSRF)', { received: state });
    return res.redirect(`${env.frontendUrl}/?meta=error&reason=invalid_state`);
  }

  try {
    info('Recebido callback OAuth da Meta - trocando code por token', {});

    await setConnectionStatus('connecting');

    const shortLived = await getAccessTokenFromCode(code);
    if (!shortLived.access_token) {
      throw new Error('A Meta não retornou access_token na troca do código');
    }

    const longLived = await getLongLivedToken(shortLived.access_token);
    const token = longLived.access_token ?? shortLived.access_token;
    const expiresIn = longLived.expires_in ?? shortLived.expires_in;

    await saveToken({
      access_token: token,
      token_expires_at: new Date(Date.now() + (expiresIn ?? 60 * 24 * 3600) * 1000),
      status: 'connected',
    });

    info('Conexão com a Meta estabelecida (token de longa duração salvo)', {
      expiresInSeconds: expiresIn ?? 'desconhecido',
    });
    res.redirect(`${env.frontendUrl}/?meta=connected`);
  } catch (err) {
    const message = formatGraphError(err);
    logError('Falha na autenticação com a Meta', { error: message });
    await setConnectionStatus('error').catch(() => undefined);
    res.redirect(`${env.frontendUrl}/?meta=error&reason=${encodeURIComponent(message)}`);
  }
});
