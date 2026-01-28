import { Message, ToolCall } from '../agent/model/message.interface';
import { Tool } from '../tools/tool.interface';

/**
 * Chat 请求参数
 */
export interface ChatRequest {
  messages: Message[];
  systemPrompt?: string;
  tools?: Tool[];
  stream?: boolean;
}

/**
 * Chat 响应
 */
export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
}

/**
 * Chat Model 接口
 */
export interface ChatModel {
  /**
   * 发送 Chat 请求
   */
  chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * 流式 Chat 请求
   */
  chatStream?(request: ChatRequest): AsyncIterable<string>;
}
