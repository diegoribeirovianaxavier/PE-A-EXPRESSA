import { createClient, SupabaseClient } from '@supabase/supabase-js';

const LOCAL_STORAGE_URL_KEY = 'peca_expressa_supabase_url';
const LOCAL_STORAGE_KEY_KEY = 'peca_expressa_supabase_anon_key';

/**
 * Limpa e normaliza strings de configuração (remove aspas, espaços e barras finais)
 */
function cleanConfigString(val: string | undefined | null): string {
  if (!val) return '';
  let cleaned = val.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

/**
 * Obtém as credenciais ativas do Supabase (Env Vars da Vercel ou LocalStorage)
 */
export function getSupabaseConfig(): {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'localStorage' | 'none';
} {
  const envUrl = cleanConfigString(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const envKey = cleanConfigString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (
    envUrl &&
    envKey &&
    envUrl.startsWith('https://') &&
    envUrl !== 'https://your-project-id.supabase.co' &&
    envKey !== 'your-supabase-anon-key-here'
  ) {
    return {
      url: envUrl.replace(/\/+$/, ''),
      anonKey: envKey,
      isConfigured: true,
      source: 'env',
    };
  }

  // Fallback para configuração salva na interface
  if (typeof window !== 'undefined') {
    const localUrl = cleanConfigString(localStorage.getItem(LOCAL_STORAGE_URL_KEY));
    const localKey = cleanConfigString(localStorage.getItem(LOCAL_STORAGE_KEY_KEY));

    if (
      localUrl &&
      localKey &&
      localUrl.startsWith('https://') &&
      localUrl !== 'https://your-project-id.supabase.co'
    ) {
      return {
        url: localUrl.replace(/\/+$/, ''),
        anonKey: localKey,
        isConfigured: true,
        source: 'localStorage',
      };
    }
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
    source: 'none',
  };
}

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
};

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

/**
 * Retorna uma instância do cliente oficial do Supabase (@supabase/supabase-js)
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (
    cachedClient &&
    lastUsedUrl === config.url &&
    lastUsedKey === config.anonKey
  ) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    lastUsedUrl = config.url;
    lastUsedKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Erro ao inicializar @supabase/supabase-js:', err);
    return null;
  }
}

/**
 * Salva credenciais do Supabase no LocalStorage para override em tempo de execução
 */
export function saveLocalSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  const cleanUrl = cleanConfigString(url).replace(/\/+$/, '');
  const cleanKey = cleanConfigString(anonKey);
  localStorage.setItem(LOCAL_STORAGE_URL_KEY, cleanUrl);
  localStorage.setItem(LOCAL_STORAGE_KEY_KEY, cleanKey);
  cachedClient = null;
}

/**
 * Limpa credenciais locais
 */
export function clearLocalSupabaseConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_STORAGE_URL_KEY);
  localStorage.removeItem(LOCAL_STORAGE_KEY_KEY);
  cachedClient = null;
}

/**
 * Testa a conexão real com o Supabase e verifica a existência das tabelas
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  source: string;
  url?: string;
}> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      message: 'Chaves do Supabase não encontradas. Configure as variáveis na Vercel ou insira diretamente nas configurações.',
      source: 'none',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Não foi possível instanciar o cliente @supabase/supabase-js.',
      source: config.source,
      url: config.url,
    };
  }

  try {
    const { error } = await client.from('sales').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: `Conectou ao Supabase, mas a tabela "sales" ainda não foi criada. Execute o script SQL no SQL Editor do Supabase.`,
          source: config.source,
          url: config.url,
        };
      }
      return {
        success: false,
        message: `Erro retornado pelo Supabase: ${error.message} (Código: ${error.code})`,
        source: config.source,
        url: config.url,
      };
    }

    return {
      success: true,
      message: 'Conexão com o Supabase estabelecida com sucesso! Tabelas acessíveis.',
      source: config.source,
      url: config.url,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na requisição: ${err.message || 'Erro de rede ou URL inválida.'}`,
      source: config.source,
      url: config.url,
    };
  }
}
