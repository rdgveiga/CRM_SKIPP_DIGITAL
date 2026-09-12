import { Card } from '../components/ui';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Configurações</h2>
        <p className="text-sm text-slate-500">Preparação para próximas etapas.</p>
      </div>

      <Card>
        <h3 className="font-semibold text-slate-900">Webhook Meta</h3>
        <p className="mt-1 text-sm text-slate-600">URL: <code className="rounded bg-slate-100 px-1">https://crm-skipp-digital-frontend.vercel.app/api/meta/webhook</code></p>
        <p className="text-sm text-slate-600">Verify Token: <code className="rounded bg-slate-100 px-1">skipp-digital-meta-verify-token</code> (META_WEBHOOK_VERIFY_TOKEN)</p>
        <p className="mt-2 text-xs text-slate-500">Configure em developers.facebook.com → Webhooks → leadgen → Subscribe. O webhook registra payload bruto em meta_webhook_events, busca lead via Graph API, salva em meta_lead_data + crm_leads com idempotência por lead_id e loga em meta_logs.</p>
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-900">Arquitetura preparada para</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>WhatsApp (campo phone já normalizado via parseLeadFields)</li>
          <li>Cadência / Pipeline comercial (status já com 6 estágios)</li>
          <li>Lead scoring (extra + raw preservados)</li>
          <li>Qualificação (lead recebido ≠ lead qualificado)</li>
          <li>Registro de venda e conversões offline/CRM para Meta (lead_id preservado)</li>
          <li>Dashboard de performance (agregações por page_id/form_id/ad_account_id)</li>
        </ul>
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-900">Segurança</h3>
        <p className="text-sm text-slate-600">Tokens nunca expostos ao frontend. Apenas backend com SUPABASE_SERVICE_KEY acessa meta_connection. Frontend usa VITE_SUPABASE_ANON_KEY somente para Realtime/leitura.</p>
      </Card>
    </div>
  );
}
