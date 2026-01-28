export type LLMProvider = 'ollama' | 'dashscope';

export interface AppConfig {
  port: number;
  llmProvider: LLMProvider;
  dashscope: {
    apiKey: string;
    model: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
  searchApi: {
    apiKey: string;
  };
  database?: {
    url: string;
    username: string;
    password: string;
  };
}

export const config = (): AppConfig => ({
  port: parseInt(process.env.PORT || '8123', 10),
  // 默认使用 ollama，可通过环境变量切换为 dashscope
  llmProvider: (process.env.LLM_PROVIDER as LLMProvider) || 'ollama',
  dashscope: {
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    model: process.env.DASHSCOPE_MODEL || 'qwen-plus',
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
  },
  searchApi: {
    apiKey: process.env.SEARCH_API_KEY || '',
  },
  database: process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
        username: process.env.DATABASE_USERNAME || 'root',
        password: process.env.DATABASE_PASSWORD || '',
      }
    : undefined,
});
