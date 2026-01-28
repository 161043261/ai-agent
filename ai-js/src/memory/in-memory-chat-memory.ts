import { Message } from '../agent/model/message.interface';
import { ChatMemory } from './chat-memory.interface';

/**
 * 基于内存的对话记忆实现
 */
export class InMemoryChatMemory implements ChatMemory {
  private conversations: Map<string, Message[]> = new Map();
  private maxMessages: number;

  constructor(maxMessages: number = 20) {
    this.maxMessages = maxMessages;
  }

  async add(conversationId: string, messages: Message[]): Promise<void> {
    const existing = this.conversations.get(conversationId) || [];
    const updated = [...existing, ...messages];

    // 保持最大消息数限制
    if (updated.length > this.maxMessages) {
      this.conversations.set(conversationId, updated.slice(-this.maxMessages));
    } else {
      this.conversations.set(conversationId, updated);
    }
  }

  async get(conversationId: string): Promise<Message[]> {
    return this.conversations.get(conversationId) || [];
  }

  async clear(conversationId: string): Promise<void> {
    this.conversations.delete(conversationId);
  }
}
