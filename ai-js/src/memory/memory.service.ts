import { Injectable, Logger } from '@nestjs/common';
import { Message } from '../agent/model/message.interface';
import { ChatMemory } from './chat-memory.interface';
import { InMemoryChatMemory } from './in-memory-chat-memory';

@Injectable()
export class MemoryService implements ChatMemory {
  private readonly logger = new Logger(MemoryService.name);
  private readonly memory: ChatMemory;

  constructor() {
    // 默认使用内存存储, 可以根据配置切换到文件存储
    this.memory = new InMemoryChatMemory(20);
    this.logger.log('Memory Service initialized with InMemoryChatMemory');
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
