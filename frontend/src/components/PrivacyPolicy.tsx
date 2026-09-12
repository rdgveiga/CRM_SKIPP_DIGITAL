export function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-slate-700">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Política de Privacidade — CRM Skipp Digital</h1>
      <p className="mb-6 text-xs text-slate-500">Última atualização: 12 de setembro de 2026 — https://crm-skipp-digital-frontend.vercel.app/privacy</p>

      <div className="space-y-6">
        <section>
          <h2 className="mb-2 text-base font-semibold text-slate-900">1. Quem somos</h2>
          <p>CRM Skipp Digital é uma plataforma de gestão de relacionamento que integra anúncios da Meta (Facebook/Instagram Lead Ads) para captura e gestão de leads. Operado por Skipp Digital. Contato: contato@skippdigital.com.br</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-slate-900">2. Dados que coletamos via integração Meta</h2>
          <p>Ao conectar sua conta Meta e autorizar os escopos <code>pages_show_list, pages_read_engagement, ads_management, leads_retrieval</code>, coletamos apenas quando um lead envia um formulário Lead Ads na sua Página/Conta de anúncios vinculada:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Identificadores: leadgen_id, form_id, page_id, ad_account_id</li>
            <li>Campos do formulário: nome, telefone, e-mail e campos extras configurados no formulário</li>
            <li>Metadados: data de criação e evento de webhook</li>
          </ul>
          <p className="mt-2">Não coletamos senhas, não acessamos mensagens privadas e não publicamos em seu nome.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-slate-900">3. Como usamos os dados</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Armazenar o lead no banco Supabase (tabela meta_lead_data) vinculado à sua conta no CRM</li>
            <li>Exibir no painel do CRM, disparar automações internas e logs técnicos (meta_logs)</li>
            <li>Permitir que você gerencie o lead (status, follow-up) dentro do CRM</li>
          </ul>
          <p className="mt-2">Base legal: execução de contrato e legítimo interesse na gestão de leads gerados pelos seus anúncios, com consentimento do titular coletado no formulário da Meta.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-slate-900">4. Compartilhamento</h2>
          <p>Não vendemos dados. Compartilhamos apenas com processadores necessários: Supabase (banco de dados), Vercel (hospedagem) e Meta Graph API (para buscar dados do lead com seu token). Todos com obrigação de confidencialidade.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-slate-900">5. Retenção e exclusão</h2>
          <p>Leads ficam armazenados enquanto sua conta estiver ativa. Você pode excluir um lead ou revogar o acesso em <code>Configurações &gt; Integração Meta &gt; Desconectar</code>, o que apaga o token de acesso. Titulares podem solicitar exclusão via contato@skippdigital.com.br, atendido em até 15 dias. Tokens de longa duração (~60 dias) são renovados apenas com nova autorização.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-slate-900">6. Seus direitos (LGPD)</h2>
          <p>Titulares podem solicitar confirmação, acesso, correção, anonimização, portabilidade e eliminação via e-mail acima. Encarregado: contato@skippdigital.com.br</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-slate-900">7. Segurança</h2>
          <p>Tokens são armazenados criptografados no Supabase (service_role apenas no backend, nunca expostos ao navegador). Tráfego HTTPS, webhook verificado por META_WEBHOOK_VERIFY_TOKEN. Acesso ao CRM por autenticação.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-slate-900">8. Cookies</h2>
          <p>Usamos apenas cookie técnico meta_oauth_state (10 min) para proteger o fluxo OAuth contra CSRF. Não usamos cookies de rastreamento.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-slate-900">9. Alterações</h2>
          <p>Alterações serão publicadas nesta URL com nova data de atualização.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-slate-900">10. Contato e exclusão de dados</h2>
          <p>Skipp Digital — contato@skippdigital.com.br — Para solicitar exclusão de dados coletados via integração, envie e-mail com assunto "Exclusão de dados - Meta Lead" informando e-mail/telefone do titular. Instruções de exclusão também em https://crm-skipp-digital-frontend.vercel.app/privacy#exclusao</p>
        </section>
      </div>

      <p className="mt-10 text-xs text-slate-400">
        Hospedado em https://crm-skipp-digital-frontend.vercel.app — Esta política substitui qualquer link de Google Drive. Use esta URL no campo "URL da Política de Privacidade" em developers.facebook.com/apps/{"{ app_id }"} &gt; Configurações &gt; Básico.
      </p>
    </div>
  );
}
