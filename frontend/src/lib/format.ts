export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return 'agora';
    if (ms < 60_000) return `${Math.floor(ms / 1000)}s atrás`;
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}min atrás`;
    if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h atrás`;
    return formatDate(iso);
  } catch {
    return formatDate(iso);
  }
}