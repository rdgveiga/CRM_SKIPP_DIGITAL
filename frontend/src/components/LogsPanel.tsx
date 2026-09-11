import { useEffect, useRef } from 'react';
import { Card, SectionTitle } from './ui';
import type { LogRow } from '../types';
import { formatDate } from '../lib/format';
import { Terminal } from 'lucide-react';

const levelColors: Record<string, string> = {
  info: 'text-blue-600',
  warn: 'text-amber-600',
  error: 'text-red-600',
};

export function LogsPanel({ logs }: { logs: LogRow[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Terminal size={16} className="text-slate-500" />
        <SectionTitle>Logs técnicos</SectionTitle>
        <span className="ml-auto text-xs text-slate-400">{logs.length} registros</span>
      </div>
      <div
        ref={scrollRef}
        className="max-h-64 overflow-y-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-300"
      >
        {logs.length === 0 ? (
          <p className="text-slate-500">Aguardando logs...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="mb-1 flex gap-2">
              <span className="shrink-0 text-slate-500">{formatDate(log.created_at)}</span>
              <span className={`shrink-0 font-semibold ${levelColors[log.level] ?? 'text-slate-400'}`}>
                [{log.level.toUpperCase()}]
              </span>
              <span className="flex-1 break-words">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}