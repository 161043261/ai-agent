import {
  BaseMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { ToolCall } from '@langchain/core/messages/tool';
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
}
