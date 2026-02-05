// API 基础 URL
const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:8123/api';

// SSE 连接参数类型
type SSEParams = Record<string, string>;

// SSE 连接封装
export const connectSSE = (
  url: string,
  params: SSEParams,
  onMessage?: (data: string) => void,
  onError?: (error: Event) => void
): EventSource => {
  // 构建带参数的 URL
  const queryString = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const fullUrl = `${API_BASE_URL}${url}?${queryString}`;
  const eventSource = new EventSource(fullUrl);

  eventSource.onmessage = (event) => {
    const data = event.data;
    if (data === '[DONE]') {
      onMessage?.('[DONE]');
    } else {
      onMessage?.(data);
    }
  };

  eventSource.onerror = (error) => {
    onError?.(error);
    eventSource.close();
  };

  return eventSource;
};

// AI 编程魔丸聊天 (原 AI 恋爱大师)
export const chatWithCodePill = (message: string, chatId: string): EventSource => {
  return connectSSE('/ai/love_app/chat/sse', { message, chatId });
};

// AI 超级智能体聊天
export const chatWithManus = (message: string): EventSource => {
  return connectSSE('/ai/manus/chat', { message });
};

// AI 超级智能体聊天 (支持 MCP)
export const chatWithManusMcp = (message: string): EventSource => {
  return connectSSE('/ai/manus/chat/mcp', { message });
};

export default {
  chatWithCodePill,
  chatWithManus,
  chatWithManusMcp,
};
