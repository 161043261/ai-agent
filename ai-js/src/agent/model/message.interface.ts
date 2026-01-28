/**
 * 消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * 工具调用信息
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

/**
 * 工具响应
 */
export interface ToolResponse {
  toolCallId: string;
  name: string;
  content: string;
}

/**
 * 消息接口
 */
export interface Message {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
}

/**
 * 创建系统消息
 */
export function createSystemMessage(content: string): Message {
  return { role: 'system', content };
}

/**
 * 创建用户消息
 */
export function createUserMessage(content: string): Message {
  return { role: 'user', content };
}

/**
 * 创建助手消息
 */
export function createAssistantMessage(content: string, toolCalls?: ToolCall[]): Message {
  return { role: 'assistant', content, toolCalls };
}

/**
 * 创建工具响应消息
 */
export function createToolMessage(toolCallId: string, name: string, content: string): Message {
  return { role: 'tool', content, toolCallId, name };
}
