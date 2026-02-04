import {
  BaseMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { ToolCall } from '@langchain/core/messages/tool';
import { z } from 'zod';
import { Tool } from '../tools/types';

export interface ChatRequest {
  messages: BaseMessage[];
  systemPrompt?: string;
  tools?: Tool[];
  stream?: boolean;
}

export interface ChatResponse {
  message: AIMessage;
  content: string;
  toolCalls?: ToolCall[];
}

export interface LangchainTool {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
}

export abstract class ChatModel {
  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract chatStream?(request: ChatRequest): AsyncIterable<string>;

  /**
   * Prepend system prompt to messages if provided
   */
  protected prependSystemPrompt(
    messages: BaseMessage[],
    systemPrompt?: string,
  ): BaseMessage[] {
    if (!systemPrompt) {
      return messages;
    }
    return [new SystemMessage(systemPrompt), ...messages];
  }

  /**
   * Build LangChain tool definitions from Tool[]
   */
  protected buildLangchainTools(tools: Tool[]): LangchainTool[] {
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
}
