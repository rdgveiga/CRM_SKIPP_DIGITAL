import { LayoutDashboard, Users, Megaphone, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';

export type NavKey = 'dashboard' | 'leads' | 'integracao' | 'config';

const items: { key: NavKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'integracao', label: 'Integração Meta Ads', icon: Megaphone },
  { key: 'config', label: 'Configurações', icon: Settings },
];

export function Layout({ active, onChange, children }: { active: NavKey; onChange: (k: NavKey) => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100">
      {/* Header mobile */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-bold text-slate-900">CRM Skipp Digital</span>
          <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        {/* Sidebar */}
        <aside className={`${open ? 'block' : 'hidden'} fixed inset-0 z-20 w-64 border-r border-slate-200 bg-white pt-14 lg:static lg:block lg:pt-0`}>
          <div className="hidden border-b border-slate-200 px-5 py-5 lg:block">
            <h1 className="text-lg font-bold text-slate-900">CRM Skipp Digital</h1>
            <p className="text-xs text-slate-500">Gestão de Leads Meta</p>
          </div>
          <nav className="space-y-1 p-3">
            {items.map((it) => {
              const Icon = it.icon;
              const isActive = active === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => { onChange(it.key); setOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Icon size={18} />
                  {it.label}
                </button>
              );
            })}
          </nav>
          <div className="absolute bottom-0 w-64 border-t border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
            Laboratório → CRM
            <div className="mt-1">
              <a href="/privacy" className="text-indigo-600 hover:underline">Privacidade</a>
            </div>
          </div>
        </aside>

        {open && <div className="fixed inset-0 z-10 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />}

        {/* Content */}
        <main className="min-h-[calc(100vh-56px)] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
