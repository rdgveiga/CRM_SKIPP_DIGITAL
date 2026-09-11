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

export const env = {
  nodeEnv: load('NODE_ENV', false, 'development'),
  port: Number(load('PORT', false, '4000')),
  frontendUrl: load('FRONTEND_URL', false, 'http://localhost:5173'),
  corsOrigin: load('CORS_ORIGIN', false, 'http://localhost:5173'),

  metaAppId: load('META_APP_ID', false, ''),
  metaAppSecret: load('META_APP_SECRET', false, ''),
  metaApiVersion: load('META_API_VERSION', false, 'v22.0'),
  metaRedirectUri: load('META_REDIRECT_URI', false, ''),
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