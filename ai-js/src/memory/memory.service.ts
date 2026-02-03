import { Injectable, Logger } from '@nestjs/common';
import { ChatMemory } from './chat-memory';
import { InMemoryChatMemory } from './in-memory-chat-history';
import { Message } from '../agent/model/message';

@Injectable()
export class MemoryService implements ChatMemory {
  private readonly logger = new Logger(MemoryService.name);
  private readonly memory: ChatMemory;

  constructor() {
    this.memory = new InMemoryChatMemory(10);
    this.logger.log('In-memory chat memory service initialized');
  }

  async add(conversationId: string, messages: Message[]): Promise<void> {
    await this.memory.add(conversationId, messages);
  }

  async get(conversationId: string): Promise<Message[]> {
    return this.memory.get(conversationId);
  }

  async clear(conversationId: string): Promise<void> {
    await this.memory.clear(conversationId);
  }
}
