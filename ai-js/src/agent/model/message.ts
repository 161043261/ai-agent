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

export function createAiMessage(
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
