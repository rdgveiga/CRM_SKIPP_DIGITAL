export type LogLevel = 'info' | 'warn' | 'error';

/**
 * Grava logs técnicos no banco (meta_logs) e no console.
 * Nunca lança exceção: log de diagnóstico não pode derrubar o fluxo.
 */
export async function log(level: LogLevel, message: string, context?: unknown): Promise<void> {
  const entry = { level, message, context: context ?? null };

  try {
    const { db } = await import('../services/supabase');
    await db().from('meta_logs').insert(entry);
  } catch (err) {
    console.error('[meta_logs] falha ao gravar log no banco:', err);
  }

  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleFn(`[${level.toUpperCase()}] ${message}`, context ? JSON.stringify(context) : '');
}

export function info(message: string, context?: unknown): Promise<void> {
  return log('info', message, context);
}

export function warn(message: string, context?: unknown): Promise<void> {
  return log('warn', message, context);
}

export function error(message: string, context?: unknown): Promise<void> {
  return log('error', message, context);
}