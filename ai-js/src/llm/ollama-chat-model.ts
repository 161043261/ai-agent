import { Logger } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { AIMessage } from '@langchain/core/messages';
import { ChatModel, ChatRequest, ChatResponse } from './chat-model';

interface OllamaModels {
  models?: { name: string }[];
}

export class OllamaChatModel extends ChatModel {
  private readonly logger = new Logger(OllamaChatModel.name);
  private readonly baseUrl: string;
  private readonly client: ChatOllama;

  constructor(
    private readonly modelName: string = 'qwen2.5:7b',
    baseUrl: string = 'http://localhost:11434',
  ) {
    super();
    this.baseUrl = baseUrl;
    this.client = new ChatOllama({
      model: this.modelName,
      baseUrl: this.baseUrl,
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, systemPrompt, tools } = request;
    const finalMessages = this.prependSystemPrompt(messages, systemPrompt);

    try {
      let client = this.client;

      if (tools && tools.length > 0) {
        const langchainTools = this.buildLangchainTools(tools);
        client = this.client.bindTools(langchainTools) as ChatOllama;
      }

      const response = await client.invoke(finalMessages);
      const content =
        typeof response.content === 'string' ? response.content : '';

      return {
        message: response as AIMessage,
        content,
        toolCalls: response.tool_calls,
      };
    } catch (err) {
      this.logger.error('Ollama response error:', err);
      throw err;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<string> {
    const { messages, systemPrompt } = request;
    const finalMessages = this.prependSystemPrompt(messages, systemPrompt);

    try {
      const stream = await this.client.stream(finalMessages);

      for await (const chunk of stream) {
        const content =
          typeof chunk.content === 'string'
            ? chunk.content
            : JSON.stringify(chunk.content);
        if (content) {
          yield content;
        }
      }
    } catch (err) {
      this.logger.error('Ollama stream response error:', err);
      throw err;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = (await response.json()) as OllamaModels;
      return data.models?.map((m) => m.name) || [];
    } catch (err) {
      this.logger.error('List ollama models error:', err);
      return [];
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }
}
