import axios from 'axios';
import { Logger } from '@nestjs/common';
import { ChatModel, ChatRequest, ChatResponse } from './chat-model.interface';
import { Message, ToolCall } from '../agent/model/message.interface';
import { Tool } from '../tools/tool.interface';

const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

/**
 * 阿里云 DashScope 模型实现
 */
export class DashScopeChatModel implements ChatModel {
  private readonly logger = new Logger(DashScopeChatModel.name);

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'qwen-plus',
  ) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, systemPrompt, tools } = request;

    // 构建消息列表
    const apiMessages = this.buildMessages(messages, systemPrompt);

    // 构建工具定义
    const apiTools = tools ? this.buildTools(tools) : undefined;

    try {
      const response = await axios.post(
        DASHSCOPE_API_URL,
        {
          model: this.model,
          messages: apiMessages,
          tools: apiTools,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 60000,
        },
      );

      const choice = response.data.choices?.[0];
      if (!choice) {
        throw new Error('No response from DashScope');
      }

      const message = choice.message;
      const content = message.content || '';
      const toolCalls = this.parseToolCalls(message.tool_calls);

      return { content, toolCalls };
    } catch (error) {
      this.logger.error('DashScope API error', error);
      throw error;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<string> {
    const { messages, systemPrompt, tools } = request;
    const apiMessages = this.buildMessages(messages, systemPrompt);
    const apiTools = tools ? this.buildTools(tools) : undefined;

    try {
      const response = await axios.post(
        DASHSCOPE_API_URL,
        {
          model: this.model,
          messages: apiMessages,
          tools: apiTools,
          stream: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          responseType: 'stream',
          timeout: 120000,
        },
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
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
      this.logger.error('DashScope stream error', error);
      throw error;
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
}
