import { Injectable, Logger } from '@nestjs/common';
import { BaseMessage } from '@langchain/core/messages';
import { ChatMemory } from './chat-memory';
import { InMemoryChatMemory } from './in-memory-chat-history';

@Injectable()
export class MemoryService implements ChatMemory {
  private readonly logger = new Logger(MemoryService.name);
  private readonly memory: ChatMemory;

  constructor() {
    this.memory = new InMemoryChatMemory(10);
    this.logger.log('In-memory chat memory service initialized');
  }

  async add(conversationId: string, messages: BaseMessage[]): Promise<void> {
    await this.memory.add(conversationId, messages);
  }

  async get(conversationId: string): Promise<BaseMessage[]> {
    return this.memory.get(conversationId);
  }

  async clear(conversationId: string): Promise<void> {
    await this.memory.clear(conversationId);
  }
}
