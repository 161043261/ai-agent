import { Injectable, Logger } from '@nestjs/common';
import { BaseMessage } from '@langchain/core/messages';

@Injectable()
export class ChatMemoryService {
  private readonly logger = new Logger(ChatMemoryService.name);
  private readonly memoryStore = new Map<string, BaseMessage[]>();
  private readonly maxMessages = 10;

  getHistory(memoryId: string): BaseMessage[] {
    return this.memoryStore.get(memoryId) ?? [];
  }

  addMessage(memoryId: string, message: BaseMessage) {
    const history = this.memoryStore.get(memoryId) ?? [];
    history.push(message);
    if (history.length > this.maxMessages) {
      history.splice(0, history.length - this.maxMessages);
    }
    this.memoryStore.set(memoryId, history);
    this.logger.debug(`Memory ${memoryId}: ${history.length} messages`);
  }

  clearHistory(memoryId: string) {
    this.memoryStore.delete(memoryId);
    this.logger.debug(`Memory ${memoryId} cleared`);
  }

  getAllMemoryIds() {
    return Array.from(this.memoryStore.keys());
  }
}
