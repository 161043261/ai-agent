import { registerAs } from '@nestjs/config';

export type LlmProvider = 'ollama' | 'dashscope';

// App
export const appConfig = registerAs('app', () => ({
  port: Number.parseInt(process.env.PORT ?? '8123', 10),
  llmProvider: (process.env.LLM_PROVIDER as LlmProvider) ?? 'ollama',
}));

// Ollama
export const ollamaConfig = registerAs('ollama', () => ({
  baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
  modelName: process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
  embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text',
}));

// Dashscope
export const dashscopeConfig = registerAs('dashscope', () => ({
  apiKey: process.env.DASHSCOPE_API_KEY ?? '',
  modelName: process.env.DASHSCOPE_MODEL ?? 'qwen-plus',
}));

// Search Api
export const searchApiConfig = registerAs('searchApi', () => ({
  apiKey: process.env.SEARCH_API_KEY ?? '',
}));

// Mcp Servers Config
export const mcpConfig = registerAs('mcp', () => ({
  serversConfig: process.env.MCP_SERVERS_CONFIG,
}));

// for `ConfigModule.forRoot`
export const configModules = [
  appConfig,
  dashscopeConfig,
  ollamaConfig,
  searchApiConfig,
  mcpConfig,
];
