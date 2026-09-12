import 'dotenv/config';

function load(name: string, required: boolean, fallback: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (required) {
      throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
    }
    return fallback;
  }
  return value.trim();
}

function vercelUrl(): string | null {
  const v = process.env.VERCEL_URL?.trim();
  if (v) return v.startsWith('http') ? v : `https://${v}`;
  return null;
}

const resolvedFrontendUrl = (() => {
  const explicit = load('FRONTEND_URL', false, '');
  if (explicit) return explicit;
  const v = vercelUrl();
  if (v) return v;
  return 'http://localhost:5173';
})();

const resolvedRedirectUri = (() => {
  const explicit = load('META_REDIRECT_URI', false, '');
  if (explicit) return explicit;
  const v = vercelUrl();
  if (v) return `${v}/api/meta/auth/callback`;
  return '';
})();

export const env = {
  nodeEnv: load('NODE_ENV', false, 'development'),
  port: Number(load('PORT', false, '4000')),
  frontendUrl: resolvedFrontendUrl,
  corsOrigin: load('CORS_ORIGIN', false, resolvedFrontendUrl),

  metaAppId: load('META_APP_ID', false, ''),
  metaAppSecret: load('META_APP_SECRET', false, ''),
  metaApiVersion: load('META_API_VERSION', false, 'v22.0'),
  metaRedirectUri: resolvedRedirectUri,
  metaScopes: load(
    'META_SCOPE',
    false,
    'pages_show_list,pages_read_engagement,ads_management,leads_retrieval'
  ),
  webhookVerifyToken: load('META_WEBHOOK_VERIFY_TOKEN', false, 'skipp-digital-meta-verify-token'),

  supabaseUrl: load('SUPABASE_URL', false, ''),
  supabaseServiceKey: load('SUPABASE_SERVICE_KEY', false, ''),
};

export function isMetaConfigured(): boolean {
  return Boolean(env.metaAppId && env.metaAppSecret && env.metaRedirectUri);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceKey);
}