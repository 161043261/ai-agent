import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  AIMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { z } from 'zod';
import { Message, ToolCall } from '../agent/model/message';
import { Tool } from '../tools/types';

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

export interface LangchainToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
}

export abstract class ChatModel {
  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract chatStream?(request: ChatRequest): AsyncIterable<string>;

  protected buildLangchainMessages(
    messageList: Message[],
    systemPrompt?: string,
  ): BaseMessage[] {
    const result: BaseMessage[] = [];

    if (systemPrompt) {
      result.push(new SystemMessage(systemPrompt));
    }

    for (const message of messageList) {
      const { role, content, toolCallId } = message;

      switch (role) {
        case 'system':
          result.push(new SystemMessage(content));
          break;
        case 'user':
          result.push(new HumanMessage(content));
          break;
        case 'assistant':
          result.push(new AIMessage(content));
          break;
        case 'tool':
          if (toolCallId) {
            result.push(new ToolMessage({ content, tool_call_id: toolCallId }));
          }
          break;
      }
    }

    return result;
  }

  protected buildLangchainTools(tools: Tool[]): LangchainToolDefinition[] {
    return tools.map((tool) => {
      const schemaShape: Record<string, z.ZodTypeAny> = {};

      for (const param of tool.parameters) {
        let zodType: z.ZodTypeAny;
        switch (param.type) {
          case 'number':
            zodType = z.number().describe(param.description);
            break;
          case 'boolean':
            zodType = z.boolean().describe(param.description);
            break;
          case 'array':
            zodType = z.array(z.any()).describe(param.description);
            break;
          case 'object':
            zodType = z.record(z.string(), z.any()).describe(param.description);
            break;
          default:
            zodType = z.string().describe(param.description);
        }

        schemaShape[param.name] = param.required ? zodType : zodType.optional();
      }

      return {
        name: tool.name,
        description: tool.description,
        schema: z.object(schemaShape as z.ZodRawShape),
      };
    });
  }

  protected parseLangchainToolCalls(
    toolCalls: { id?: string; name: string; args: Record<string, unknown> }[],
  ): ToolCall[] {
    return toolCalls.map((tc) => ({
      id: tc.id || crypto.randomUUID(),
      name: tc.name,
      arguments: JSON.stringify(tc.args),
    }));
  }
}
