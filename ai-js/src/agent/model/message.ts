import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  AIMessage,
  ToolMessage,
  AIMessageChunk,
} from '@langchain/core/messages';
import { ToolCall } from '@langchain/core/messages/tool';

// Re-export LangChain types for convenience
export type {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  AIMessage,
  ToolMessage,
  AIMessageChunk,
  ToolCall,
};

// Helper functions to create messages
export function createSystemMessage(content: string): SystemMessage {
  return new SystemMessage(content);
}

export function createUserMessage(content: string): HumanMessage {
  return new HumanMessage(content);
}

export function createAssistantMessage(
  content: string,
  toolCalls?: ToolCall[],
): AIMessage {
  return new AIMessage({
    content,
    tool_calls: toolCalls,
  });
}

export function createToolMessage(
  toolCallId: string,
  name: string,
  content: string,
): ToolMessage {
  return new ToolMessage({
    content,
    tool_call_id: toolCallId,
    name,
  });
}

// Serialization helpers for ChatMemory
export interface SerializedMessage {
  type: 'human' | 'ai' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export function serializeMessage(message: BaseMessage): SerializedMessage {
  const msgType = message.type;
  const type = msgType as SerializedMessage['type'];
  const content =
    typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content);

  const serialized: SerializedMessage = { type, content };

  if (message instanceof AIMessage && message.tool_calls?.length) {
    serialized.tool_calls = message.tool_calls;
  }

  if (message instanceof ToolMessage) {
    serialized.tool_call_id = message.tool_call_id;
    serialized.name = message.name;
  }

  return serialized;
}

export function deserializeMessage(data: SerializedMessage): BaseMessage {
  switch (data.type) {
    case 'human':
      return new HumanMessage(data.content);
    case 'system':
      return new SystemMessage(data.content);
    case 'ai':
      return new AIMessage({
        content: data.content,
        tool_calls: data.tool_calls,
      });
    case 'tool':
      return new ToolMessage({
        content: data.content,
        tool_call_id: data.tool_call_id || '',
        name: data.name,
      });
    default:
      return new HumanMessage(data.content);
  }
}

export function serializeMessages(messages: BaseMessage[]): string {
  return JSON.stringify(messages.map(serializeMessage));
}

export function deserializeMessages(json: string): BaseMessage[] {
  const data = JSON.parse(json) as SerializedMessage[];
  return data.map(deserializeMessage);
}
