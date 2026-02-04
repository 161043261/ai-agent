import { Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage } from '@langchain/core/messages';
import { ChatModel, ChatRequest, ChatResponse } from './chat-model';

const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export class DashscopeChatModel extends ChatModel {
  private readonly logger = new Logger(DashscopeChatModel.name);
  private readonly client: ChatOpenAI;

  constructor(
    private readonly apiKey: string,
    private readonly modelName = 'qwen-plus',
  ) {
    super();
    this.client = new ChatOpenAI({
      openAIApiKey: this.apiKey,
      modelName: this.modelName,
      configuration: {
        baseURL: DASHSCOPE_BASE_URL,
      },
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, systemPrompt, tools } = request;
    const finalMessages = this.unshiftSystemPrompt(messages, systemPrompt);

    try {
      let client = this.client;

      if (tools && tools.length > 0) {
        client = this.client.bindTools(tools) as ChatOpenAI;
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
      this.logger.error('Dashscope response error:', err);
      throw err;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<string> {
    const { messages, systemPrompt } = request;
    const finalMessages = this.unshiftSystemPrompt(messages, systemPrompt);

    try {
      const stream = await this.client.stream(finalMessages);

      for await (const chunk of stream) {
        const content = typeof chunk.content === 'string' ? chunk.content : '';
        if (content) {
          yield content;
        }
      }
    } catch (err) {
      this.logger.error('Dashscope stream response error:', err);
      throw err;
    }
  }
}
