import { Message, ToolCall } from '../agent/model/message';
import { Tool } from '../tools/tool';
import { OpenAiMessage, OpenAiTool, OpenAiToolCall } from './types';

export interface ChatRequest {
  messageList: Message[];
  systemPrompt?: string;
  toolList?: Tool[];
  isStream?: boolean;
}

export interface ChatResponse {
  content: string;
  toolCallList?: ToolCall[];
}

export abstract class ChatModel {
  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract chatStream?(request: ChatRequest): AsyncIterable<string>;

  protected buildMessages(
    messageList: Message[],
    systemPrompt?: string,
  ): OpenAiMessage[] {
    const result: ReturnType<typeof this.buildMessages> = [];
    if (systemPrompt) {
      result.push({
        role: 'system',
        content: systemPrompt,
      });
    }
    for (const message of messageList) {
      const { role, content, toolCallId, name } = message;
      result.push({
        role,
        content,
        name,
        ...(role === 'tool' ? { tool_call_id: toolCallId } : {}),
      });
    }
    return result;
  }

  protected buildTools(tools: Tool[]): OpenAiTool[] {
    return tools.map((item) => {
      const { name, description, parameters } = item;
      return {
        type: 'function' as const,
        function: {
          name,
          description,
          parameters: {
            type: 'object' as const,
            properties: parameters.reduce((acc, cur) => {
              const { type, description } = cur;
              acc[cur.name] = {
                type,
                description,
              };
              return acc;
            }, {}),
            required: parameters
              .filter((item) => item.required)
              .map((item) => item.name),
          },
        },
      };
    });
  }

  protected parseToolCalls(toolCalls: OpenAiToolCall[] = []): ToolCall[] {
    if (toolCalls.length === 0) {
      return [];
    }
    return toolCalls.map((item) => ({
      id: item.id,
      name: item.function.name,
      arguments: item.function.arguments,
    }));
  }
}
