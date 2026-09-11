import { Card, Badge } from './ui';
import { type ConnectionStatus } from '../types';
import { ExternalLink, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const statusConfig: Record<string, { label: string; badge: 'success' | 'error' | 'warning' | 'neutral'; icon: typeof CheckCircle2 }> = {
  connected: { label: 'Conectado', badge: 'success', icon: CheckCircle2 },
  connecting: { label: 'Conectando…', badge: 'warning', icon: Loader2 },
  error: { label: 'Erro na conexão', badge: 'error', icon: AlertCircle },
  disconnected: { label: 'Não conectado', badge: 'neutral', icon: AlertCircle },
};

export function ConnectionCard({ status }: { status: ConnectionStatus | null }) {
  const s = statusConfig[status?.status ?? 'disconnected'] ?? statusConfig.disconnected;
  const Icon = s.icon;

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Icon
            size={20}
            className={`text-indigo-600 ${s.icon === Loader2 ? 'animate-spin' : ''}`}
          />
          <div>
            <p className="text-sm font-medium text-slate-500">Status da conexão</p>
            <Badge variant={s.badge}>{s.label}</Badge>
          </div>
        </div>
        {!status?.connected && (
          <a
            href="/api/meta/auth/start"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Conectar com Meta
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </Card>
  );
}