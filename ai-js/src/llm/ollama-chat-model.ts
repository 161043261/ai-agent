import axios from 'axios';
import { Logger } from '@nestjs/common';
import { ChatModel, ChatRequest, ChatResponse } from './chat-model.interface';
import { Message, ToolCall } from '../agent/model/message.interface';
import { Tool } from '../tools/tool.interface';

/**
 * Ollama 本地模型实现
 * 支持 Ollama 的 OpenAI 兼容 API
 */
export class OllamaChatModel implements ChatModel {
  private readonly logger = new Logger(OllamaChatModel.name);
  private readonly baseUrl: string;

  constructor(
    private readonly model: string = 'qwen2.5:7b',
    baseUrl: string = 'http://localhost:11434',
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, systemPrompt, tools } = request;
    const apiMessages = this.buildMessages(messages, systemPrompt);
    const apiTools = tools ? this.buildTools(tools) : undefined;

    try {
      // 使用 Ollama 的 OpenAI 兼容 API
      const response = await axios.post(
        `${this.baseUrl}/v1/chat/completions`,
        {
          model: this.model,
          messages: apiMessages,
          tools: apiTools,
          stream: false,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000, // Ollama 本地推理可能较慢
        },
      );

      const choice = response.data.choices?.[0];
      if (!choice) {
        throw new Error('No response from Ollama');
      }

      const message = choice.message;
      const content = message.content || '';

      // 优先使用正式的 tool_calls，如果没有则尝试从 content 中解析
      let toolCalls = this.parseToolCalls(message.tool_calls);
      if (!toolCalls || toolCalls.length === 0) {
        toolCalls = this.parseToolCallsFromContent(content);
      }

      return { content, toolCalls };
    } catch (error) {
      this.logger.error('Ollama API error', error);
      throw error;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<string> {
    const { messages, systemPrompt, tools } = request;
    const apiMessages = this.buildMessages(messages, systemPrompt);
    const apiTools = tools ? this.buildTools(tools) : undefined;

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/chat/completions`,
        {
          model: this.model,
          messages: apiMessages,
          tools: apiTools,
          stream: true,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          responseType: 'stream',
          timeout: 300000,
        },
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Ollama stream error', error);
      throw error;
    }
  }

  /**
   * 使用 Ollama 原生 API (非 OpenAI 兼容)
   */
  async chatNative(request: ChatRequest): Promise<ChatResponse> {
    const { messages, systemPrompt } = request;
    const apiMessages = this.buildNativeMessages(messages, systemPrompt);

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: this.model,
          messages: apiMessages,
          stream: false,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000,
        },
      );

      return {
        content: response.data.message?.content || '',
        toolCalls: undefined,
      };
    } catch (error) {
      this.logger.error('Ollama native API error', error);
      throw error;
    }
  }

  /**
   * 流式输出 - 原生 API
   */
  async *chatStreamNative(request: ChatRequest): AsyncIterable<string> {
    const { messages, systemPrompt } = request;
    const apiMessages = this.buildNativeMessages(messages, systemPrompt);

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: this.model,
          messages: apiMessages,
          stream: true,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          responseType: 'stream',
          timeout: 300000,
        },
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const content = parsed.message?.content;
            if (content) {
              yield content;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (error) {
      this.logger.error('Ollama native stream error', error);
      throw error;
    }
  }

  /**
   * 列出可用模型
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models?.map((m: { name: string }) => m.name) || [];
    } catch (error) {
      this.logger.error('Failed to list Ollama models', error);
      return [];
    }
  }

  /**
   * 检查 Ollama 服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  private buildMessages(
    messages: Message[],
    systemPrompt?: string,
  ): Array<{ role: string; content: string; tool_call_id?: string; name?: string }> {
    const result: Array<{ role: string; content: string; tool_call_id?: string; name?: string }> =
      [];

    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'tool') {
        result.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId,
          name: msg.name,
        });
      } else {
        result.push({ role: msg.role, content: msg.content });
      }
    }

    return result;
  }

  private buildNativeMessages(
    messages: Message[],
    systemPrompt?: string,
  ): Array<{ role: string; content: string }> {
    const result: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      result.push({ role: msg.role === 'tool' ? 'assistant' : msg.role, content: msg.content });
    }

    return result;
  }

  private buildTools(
    tools: Tool[],
  ): Array<{ type: string; function: { name: string; description: string; parameters: unknown } }> {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.reduce(
            (acc, param) => {
              acc[param.name] = {
                type: param.type,
                description: param.description,
              };
              return acc;
            },
            {} as Record<string, { type: string; description: string }>,
          ),
          required: tool.parameters.filter((p) => p.required).map((p) => p.name),
        },
      },
    }));
  }

  private parseToolCalls(
    toolCalls?: Array<{ id: string; function: { name: string; arguments: string } }>,
  ): ToolCall[] | undefined {
    if (!toolCalls || toolCalls.length === 0) {
      return undefined;
    }

    return toolCalls.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    }));
  }

  /**
   * 从 content 中解析工具调用 (兼容 Ollama 不规范的输出)
   * 支持格式: {"name": "toolName", "arguments": {...}}
   */
  private parseToolCallsFromContent(content: string): ToolCall[] | undefined {
    if (!content) return undefined;

    const toolCalls: ToolCall[] = [];

    // 尝试匹配 JSON 格式的工具调用
    // 格式1: {"name": "xxx", "arguments": {...}}
    // 格式2: {"name": "xxx", "parameters": {...}}
    const jsonPattern =
      /\{[\s\S]*?"name"\s*:\s*"([^"]+)"[\s\S]*?(?:"arguments"|"parameters")\s*:\s*(\{[^}]*\})[\s\S]*?\}/g;

    let match: RegExpExecArray | null;
    while ((match = jsonPattern.exec(content)) !== null) {
      try {
        const fullMatch = match[0];
        const parsed = JSON.parse(fullMatch);

        const name = parsed.name;
        const args = parsed.arguments || parsed.parameters || {};

        if (name) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            arguments: typeof args === 'string' ? args : JSON.stringify(args),
          });
          this.logger.log(`Parsed tool call from content: ${name}`);
        }
      } catch {
        // 尝试更宽松的解析
        try {
          const name = match[1];
          const argsStr = match[2];
          const args = JSON.parse(argsStr);

          if (name) {
            toolCalls.push({
              id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name,
              arguments: JSON.stringify(args),
            });
            this.logger.log(`Parsed tool call from content (fallback): ${name}`);
          }
        } catch {
          // 忽略解析失败
        }
      }
    }

    return toolCalls.length > 0 ? toolCalls : undefined;
  }
}
