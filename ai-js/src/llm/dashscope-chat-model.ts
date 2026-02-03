import { Logger } from '@nestjs/common';
import { ChatModel, ChatRequest, ChatResponse } from './chat-model';
import axios from 'axios';
import { OpenAiResponse, OpenAiStreamResponse } from './types';

const DASHSCOPE_API_URL =
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

export class DashscopeChatModel extends ChatModel {
  private readonly logger = new Logger(DashscopeChatModel.name);

  constructor(
    private readonly apiKey: string,
    private readonly modelName = 'qwen-plus',
  ) {
    super();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messageList, systemPrompt, toolList } = request;
    const apiMessages = this.buildMessages(messageList, systemPrompt);
    const apiTools =
      toolList && toolList.length > 0 ? this.buildTools(toolList) : [];
    try {
      const response = await axios.post<OpenAiResponse>(
        DASHSCOPE_API_URL,
        {
          model: this.modelName,
          messages: apiMessages,
          stream: false,
          ...(apiTools.length > 0 ? { tools: apiTools } : {}),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      const choice = response.data.choices?.[0];
      if (!choice) {
        this.logger.error('No response from dashscope');
        throw new Error('No response from dashscope');
      }
      const {
        message: { content = '', tool_calls: openAiToolCalls },
      } = choice;
      const toolCallList = this.parseToolCalls(openAiToolCalls);
      return { content, toolCallList };
    } catch (err) {
      this.logger.error('Dashscope response error:', err);
      throw err;
    }
  }

  async *chatStream?(request: ChatRequest): AsyncIterable<string> {
    const { messageList, systemPrompt } = request;
    const apiMessages = this.buildMessages(messageList, systemPrompt);
    try {
      const response = await axios.post<AsyncIterable<string>>(
        DASHSCOPE_API_URL,
        {
          model: this.modelName,
          messages: apiMessages,
          stream: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      for await (const chunk of response.data) {
        this.logger.debug(
          `Dashscope stream response: typeof chunk === ${typeof chunk}`,
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
}
