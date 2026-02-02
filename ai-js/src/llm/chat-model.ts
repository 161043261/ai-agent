import { Message, ToolCall } from '../agent/model/message';
import { Tool } from '../tools/tool';

export interface ChatRequest {
  messages: Message[];
  systemPrompt?: string;
  tools?: Tool[];
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
}

export interface ChatModel {
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream?(request: ChatRequest): AsyncIterable<string>;
}
