import { BaseMessage } from '@langchain/core/messages';
import { ChatMemory } from './chat-memory';

export class InMemoryChatMemory implements ChatMemory {
  private chats = new Map<string, BaseMessage[]>();
  private maxMessages = 10;

  constructor(maxMessages = 10) {
    this.maxMessages = maxMessages;
  }

  async add(chatId: string, messages: BaseMessage[]) {
    const history = this.chats.get(chatId) ?? [];
    const newHistory = [...history, ...messages];
    if (newHistory.length > this.maxMessages) {
      this.chats.set(chatId, newHistory.slice(-this.maxMessages));
    } else {
      this.chats.set(chatId, newHistory);
    }
  }

  async get(chatId: string): Promise<BaseMessage[]> {
    return this.chats.get(chatId) ?? [];
  }

  async clear(chatId: string) {
    this.chats.delete(chatId);
  }
}
