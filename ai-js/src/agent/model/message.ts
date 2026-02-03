export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolResponse {
  toolCallId: string;
  name: string;
  content: string;
}

export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCallList?: ToolCall[];
}

export function createSystemMessage(content: string): Message {
  return { role: 'system', content };
}

export function createUserMessage(content: string): Message {
  return { role: 'user', content };
}

export function createAssistantMessage(
  content: string,
  toolCallList?: ToolCall[],
): Message {
  return { role: 'assistant', content, toolCallList };
}

export function createToolMessage(
  toolCallId: string,
  name: string,
  content: string,
): Message {
  return { role: 'tool', content, toolCallId, name };
}
