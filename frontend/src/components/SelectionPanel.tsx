import { useEffect, useState } from 'react';
import { Card, SectionTitle, Select } from './ui';
import { api } from '../lib/api';
import type { AdAccountNode, ConnectionStatus, LeadGenFormNode, PageNode } from '../types';

export function SelectionPanel({
  connection,
  onSaved,
}: {
  connection: ConnectionStatus | null;
  onSaved: (s: ConnectionStatus) => void;
}) {
  const [pages, setPages] = useState<PageNode[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccountNode[]>([]);
  const [forms, setForms] = useState<LeadGenFormNode[]>([]);

  const [selectedPage, setSelectedPage] = useState(connection?.selections.pageId ?? '');
  const [selectedAccount, setSelectedAccount] = useState(connection?.selections.adAccountId ?? '');
  const [selectedForm, setSelectedForm] = useState(connection?.selections.formId ?? '');

  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingForms, setLoadingForms] = useState(false);

  useEffect(() => {
    if (!connection?.connected) return;
    setLoadingPages(true);
    api.pages().then((r) => setPages(r.data)).catch((e) => console.error('pages:', e)).finally(() => setLoadingPages(false));
    setLoadingAccounts(true);
    api.adAccounts().then((r) => setAdAccounts(r.data)).catch((e) => console.error('adAccounts:', e)).finally(() => setLoadingAccounts(false));
  }, [connection?.connected]);

  useEffect(() => {
    if (!connection?.connected || !selectedAccount) { setForms([]); return; }
    setLoadingForms(true);
    api.forms(selectedAccount).then((r) => setForms(r.data)).catch(() => {}).finally(() => setLoadingForms(false));
  }, [connection?.connected, selectedAccount]);

  useEffect(() => {
    if (!connection) return;
    setSelectedPage(connection.selections.pageId ?? '');
    setSelectedAccount(connection.selections.adAccountId ?? '');
    setSelectedForm(connection.selections.formId ?? '');
  }, [connection?.tokenExpiresAt]);

  async function save(field: string, value: string, name: string | null) {
    const payload: Record<string, string | null> = {};
    payload[field] = value || null;
    if (field === 'pageId') payload.pageName = name;
    if (field === 'adAccountId') payload.adAccountName = name;
    if (field === 'formId') payload.formName = name;
    try {
      const s = await api.saveConfig(payload);
      onSaved(s);
    } catch (err) {
      console.error('Falha ao salvar seleção:', err);
    }
  }

  const disabled = !connection?.connected;

  return (
    <Card>
      <SectionTitle className="mb-4">Configuração dos recursos</SectionTitle>
      <p className="mb-5 text-sm text-slate-500">
        Selecione a página, a conta de anúncios e o formulário que deseja monitorar.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Página"
          value={selectedPage}
          loading={loadingPages}
          disabled={disabled}
          options={pages.map((p) => ({ value: p.id, label: `${p.name} (${p.category ?? 'página'})` }))}
          placeholder="Selecione a página"
          onChange={(v) => {
            setSelectedPage(v);
            const p = pages.find((x) => x.id === v);
            save('pageId', v, p?.name ?? null);
          }}
        />
        <Select
          label="Conta de anúncios"
          value={selectedAccount}
          loading={loadingAccounts}
          disabled={disabled}
          options={adAccounts.map((a) => ({ value: a.id.replace(/^act_/, ''), label: a.name }))}
          placeholder="Selecione a conta"
          onChange={(v) => {
            setSelectedAccount(v);
            setSelectedForm('');
            const a = adAccounts.find((x) => x.id === v || x.id.replace(/^act_/, '') === v);
            save('adAccountId', v, a?.name ?? null);
          }}
        />
        <Select
          label="Formulário"
          value={selectedForm}
          loading={loadingForms}
          disabled={disabled || !selectedAccount}
          options={forms.map((f) => ({ value: f.id, label: f.name }))}
          placeholder="Selecione o formulário"
          onChange={(v) => {
            setSelectedForm(v);
            const f = forms.find((x) => x.id === v);
            save('formId', v, f?.name ?? null);
          }}
        />
      </div>
    </Card>
  );
}