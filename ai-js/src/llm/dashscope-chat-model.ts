import { Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
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
    const { messageList, systemPrompt, toolList } = request;
    const messages = this.buildLangchainMessages(messageList, systemPrompt);

    try {
      let clientWithTools = this.client;

      if (toolList && toolList.length > 0) {
        const tools = this.buildLangchainTools(toolList);
        clientWithTools = this.client.bindTools(tools) as ChatOpenAI;
      }

      const response = await clientWithTools.invoke(messages);
      const content =
        typeof response.content === 'string' ? response.content : '';
      const toolCallList = response.tool_calls
        ? this.parseLangchainToolCalls(response.tool_calls)
        : [];

      return { content, toolCallList };
    } catch (err) {
      this.logger.error('Dashscope response error:', err);
      throw err;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<string> {
    const { messageList, systemPrompt } = request;
    const messages = this.buildLangchainMessages(messageList, systemPrompt);

    try {
      const stream = await this.client.stream(messages);

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
