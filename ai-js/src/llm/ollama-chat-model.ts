import { Logger } from '@nestjs/common';
import { ChatModel, ChatRequest, ChatResponse } from './chat-model';
import { OllamaModels, OpenAiResponse, OpenAiStreamResponse } from './types';
import axios from 'axios';

export class OllamaChatModel extends ChatModel {
  private readonly logger = new Logger(OllamaChatModel.name);
  private readonly baseUrl: string;

  constructor(
    private readonly modelName: string = 'qwen2.5:7b',
    baseUrl: string = 'http://localhost:11434',
  ) {
    super();
    this.baseUrl = baseUrl;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messageList, systemPrompt, toolList } = request;
    const apiMessages = this.buildMessages(messageList, systemPrompt);
    const apiTools =
      toolList && toolList.length > 0 ? this.buildTools(toolList) : [];
    try {
      const response = await axios.post<OpenAiResponse>(
        `${this.baseUrl}/v1/chat/completions`,
        {
          model: this.modelName,
          messages: apiMessages,
          stream: false,
          ...(apiTools.length > 0 ? { tools: apiTools } : {}),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 180_000,
        },
      );
      const choice = response.data.choices?.[0];
      if (!choice) {
        this.logger.error('No response from ollama');
        throw new Error('No response from ollama');
      }
      const {
        message: { content = '', tool_calls: openAiToolCalls },
      } = choice;
      const toolCallList = this.parseToolCalls(openAiToolCalls);
      return { content, toolCallList };
    } catch (err) {
      this.logger.error('Ollama response error:', err);
      throw err;
    }
  }

  async *chatStream?(request: ChatRequest): AsyncIterable<string> {
    const { messageList, systemPrompt, toolList } = request;
    const apiMessages = this.buildMessages(messageList, systemPrompt);
    const apiTools =
      toolList && toolList.length > 0 ? this.buildTools(toolList) : [];
    try {
      const response = await axios.post<AsyncIterable<string>>(
        `${this.baseUrl}/v1/chat/completions`,
        {
          model: this.modelName,
          messages: apiMessages,
          tools: apiTools,
          stream: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            timeout: 180_000,
          },
        },
      );

      for await (const chunk of response.data) {
        this.logger.debug(
          `Ollama stream response: typeof chunk === ${typeof chunk}`,
        );
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }
            try {
              const resp: OpenAiStreamResponse = JSON.parse(data);
              const choice = resp.choices?.[0];
              if (!choice) {
                this.logger.error('No response from dashscope');
                continue;
              }
              const {
                delta: { content = '' },
              } = resp.choices[0];
              if (content) {
                yield content;
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err) {
      this.logger.error('Dashscope stream response error:', err);
      throw err;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get<OllamaModels>(
        `${this.baseUrl}/api/tags`,
      );
      return response.data.models?.map((m: { name: string }) => m.name) || [];
    } catch (err) {
      this.logger.error('Failed to list ollama models:', err);
      return [];
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
