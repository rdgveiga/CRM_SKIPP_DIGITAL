import { env, isMetaConfigured } from '../config/env.js';
import type {
  AdAccountNode,
  GraphListResponse,
  LeadField,
  LeadGenFormNode,
  LeadNode,
  MetaAccessTokenResponse,
  MetaErrorBody,
  PageNode,
} from '../types/meta.js';

const GRAPH_HOST = 'https://graph.facebook.com';

// =============================================================================
// Helpers de infra da Graph API (somente chamadas às APIs oficiais)
// =============================================================================

export function ensureMetaConfigured(): void {
  if (!isMetaConfigured()) {
    throw new Error(
      'Meta não configurada: defina META_APP_ID, META_APP_SECRET e META_REDIRECT_URI. Veja .env.example'
    );
  }
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${GRAPH_HOST}/${env.metaApiVersion}/${path}?${qs}`;

  const res = await fetch(url, { headers: { accept: 'application/json' } });
  const body = (await res.json()) as T & MetaErrorBody;

  if (!res.ok || body.error) {
    const message = body.error?.message ?? `Graph API respondeu com status ${res.status}`;
    const code = body.error?.code;
    throw new Error(message + (code ? ` (código ${code})` : ''));
  }
  return body;
}

async function graphGetAll<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const all: T[] = [];
  let after: string | undefined;
  let url: string | null = null;

  do {
    const pageParams: Record<string, string> = { ...params, limit: '100' };
    if (after) pageParams.after = after;

    const qs = new URLSearchParams(pageParams).toString();
    const fetchUrl = url ?? `${GRAPH_HOST}/${env.metaApiVersion}/${path}?${qs}`;

    const res = await fetch(fetchUrl, { headers: { accept: 'application/json' } });
    const body = (await res.json()) as GraphListResponse<T> & MetaErrorBody;

    if (!res.ok || body.error) {
      const message = body.error?.message ?? `Graph API respondeu com status ${res.status}`;
      const code = body.error?.code;
      throw new Error(message + (code ? ` (código ${code})` : ''));
    }

    if (body.data) all.push(...body.data);

    const next = (body as unknown as { paging?: { cursors?: { after?: string }; next?: string } }).paging?.next;
    const cursorAfter = (body as unknown as { paging?: { cursors?: { after?: string } } }).paging?.cursors?.after;

    if (next && cursorAfter && body.data?.length === 100) {
      after = cursorAfter;
      url = null;
    } else if (next) {
      url = next;
      after = undefined;
    } else {
      url = null;
      after = undefined;
    }

    if (all.length >= 500) break;
  } while (url || after);

  return all;
}

// =============================================================================
// OAuth (fluxo oficial de autenticação da Meta)
// =============================================================================

/**
 * Monta a URL do diálogo de login/autorização da Meta.
 * Documentação: https://developers.facebook.com/docs/facebook-login/guides/access-tokens
 */
export function buildOAuthDialogUrl(state: string): string {
  ensureMetaConfigured();
  const params = new URLSearchParams({
    client_id: env.metaAppId,
    redirect_uri: env.metaRedirectUri,
    state,
    response_type: 'code',
    scope: env.metaScopes,
  });
  return `https://www.facebook.com/${env.metaApiVersion}/dialog/oauth?${params.toString()}`;
}

/**
 * Troca o código de autorização por um token de curta duração.
 * O client_secret é usado SOMENTE aqui (backend) - nunca vai ao frontend.
 */
export function getAccessTokenFromCode(code: string): Promise<MetaAccessTokenResponse> {
  ensureMetaConfigured();
  return graphGet<MetaAccessTokenResponse>('oauth/access_token', {
    client_id: env.metaAppId,
    redirect_uri: env.metaRedirectUri,
    client_secret: env.metaAppSecret,
    code,
  });
}

/**
 * Converte o token de curta duração em token de longa duração (~60 dias),
 * via grant_type=fb_exchange_token (fluxo oficial).
 */
export function getLongLivedToken(shortLivedToken: string): Promise<MetaAccessTokenResponse> {
  ensureMetaConfigured();
  return graphGet<MetaAccessTokenResponse>('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: env.metaAppId,
    client_secret: env.metaAppSecret,
    fb_exchange_token: shortLivedToken,
  });
}

// =============================================================================
// Leitura de recursos autorizados
// =============================================================================

/** Páginas do Facebook do usuário autenticado: GET /me/accounts (paginado) */
export async function getPages(token: string): Promise<PageNode[]> {
  return graphGetAll<PageNode>('me/accounts', {
    access_token: token,
    fields: 'id,name,category',
  });
}

/** Contas de anúncio do usuário autenticado: GET /me/adaccounts (paginado) */
export async function getAdAccounts(token: string): Promise<AdAccountNode[]> {
  return graphGetAll<AdAccountNode>('me/adaccounts', {
    access_token: token,
    fields: 'id,name,account_status,currency',
  });
}

/** Formulários de Lead Ads de uma conta de anúncios: GET /act_{id}/leadgen_forms (paginado) */
export async function getLeadGenForms(token: string, adAccountId: string): Promise<LeadGenFormNode[]> {
  return graphGetAll<LeadGenFormNode>(`act_${sanitizeAdAccountId(adAccountId)}/leadgen_forms`, {
    access_token: token,
    fields: 'id,name,page_id,page{id,name}',
  });
}

/** Verificação leve de que o token ainda é válido: GET /me */
export async function checkToken(token: string): Promise<{ id: string; name: string }> {
  return graphGet<{ id: string; name: string }>('me', {
    access_token: token,
    fields: 'id,name',
  });
}

/**
 * Dados completos de um lead a partir do leadgen_id:
 * GET /{leadgen_id}?fields=id,created_time,field_data,form_id,page_id
 * Requer token com permissão leads_retrieval concedida pela página.
 */
export async function getLead(token: string, leadId: string): Promise<LeadNode> {
  return graphGet<LeadNode>(leadId, {
    access_token: token,
    fields: 'id,created_time,field_data,form_id,page_id',
  });
}

export function sanitizeAdAccountId(id: string): string {
  return id.replace(/^act_/, '');
}

export function formatGraphError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    const msg = (e.message as string) ?? (e.error_description as string) ?? (e.error as string) ?? (e.details as string) ?? (e.hint as string);
    const code = (e.code as string) ?? (e.status as string);
    if (msg) return code ? `${msg} (código ${code})` : String(msg);
    try { return JSON.stringify(err); } catch { /* fallback */ }
  }
  return String(err);
}

// =============================================================================
// Parse de field_data (nome/telefone/email em um objeto padronizado)
// =============================================================================

function firstValue(field?: LeadField): string | null {
  if (!field) return null;
  const value = field.values?.[0];
  return value && value.trim().length > 0 ? value.trim() : null;
}

const EMAIL_KEYS = ['email', 'e-mail', 'email_address'];
const PHONE_KEYS = ['phone_number', 'phone', 'telefone', 'tel', 'whatsapp', 'mobile'];
const NAME_KEYS = ['full_name', 'name', 'nome', 'nome_completo'];

export interface ParsedLead {
  name: string | null;
  phone: string | null;
  email: string | null;
  extra: Record<string, string>;
}

export function parseLeadFields(fieldData: LeadField[] = []): ParsedLead {
  const byName = new Map<string, LeadField>();
  for (const field of fieldData) byName.set(field.name.toLowerCase(), field);

  const pick = (keys: string[]): string | null => {
    for (const key of keys) {
      const value = firstValue(byName.get(key));
      if (value) return value;
    }
    return null;
  };

  const email = pick(EMAIL_KEYS);
  const phone = pick(PHONE_KEYS);
  const name = pick(NAME_KEYS);

  const ignored = new Set([...EMAIL_KEYS, ...PHONE_KEYS, ...NAME_KEYS].map((k) => k.toLowerCase()));
  const extra: Record<string, string> = {};
  for (const field of fieldData) {
    const value = firstValue(field);
    if (value && !ignored.has(field.name.toLowerCase())) {
      extra[field.name] = value;
    }
  }

  return { name: name ?? null, phone: phone ?? null, email: email ?? null, extra };
}
