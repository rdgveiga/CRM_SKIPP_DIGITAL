import { getAdAccounts, getLeadGenForms, getPages } from './metaGraph.js';
import { upsertAdAccounts, upsertForms, upsertPages } from './repository.js';
import { info, warn } from '../lib/logger.js';

export async function syncAllResources(token: string): Promise<{
  pages: number;
  adAccounts: number;
  forms: number;
}> {
  const pages = await getPages(token).catch((e) => {
    warn('Falha ao buscar páginas', { error: String(e) });
    return [];
  });
  await upsertPages(pages.map((p) => ({ page_id: p.id, name: p.name, category: p.category ?? null, raw: p })));

  const accounts = await getAdAccounts(token).catch((e) => {
    warn('Falha ao buscar contas', { error: String(e) });
    return [];
  });
  await upsertAdAccounts(accounts.map((a) => ({ ad_account_id: a.id.replace(/^act_/, ''), name: a.name, account_status: a.account_status, currency: a.currency ?? null, raw: a })));

  // Busca formulários por cada conta (paginado já) e dedup por form_id
  const formMap = new Map<string, { form_id: string; name: string; page_id?: string | null; page_name?: string | null; ad_account_id?: string | null; raw?: unknown }>();
  for (const acc of accounts) {
    const forms = await getLeadGenForms(token, acc.id).catch((e) => {
      warn('Falha ao buscar forms da conta', { adAccount: acc.id, error: String(e) });
      return [];
    });
    for (const f of forms) {
      const key = f.id;
      if (!formMap.has(key)) {
        formMap.set(key, {
          form_id: f.id,
          name: f.name,
          page_id: (f.page_id ?? f.page?.id) ?? null,
          page_name: f.page?.name ?? null,
          ad_account_id: acc.id.replace(/^act_/, ''),
          raw: f,
        });
      }
    }
  }

  await upsertForms(Array.from(formMap.values()));
  info('Sync de recursos concluído', { pages: pages.length, adAccounts: accounts.length, forms: formMap.size });
  return { pages: pages.length, adAccounts: accounts.length, forms: formMap.size };
}
