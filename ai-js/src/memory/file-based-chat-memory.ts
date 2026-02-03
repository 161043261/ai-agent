import { Message } from '../agent/model/message';
import { ChatMemory } from './chat-memory';

export class FileBasedChatMemory implements ChatMemory {
  add(chatId: string, messages: Message[]): Promise<void> {
    throw new Error('Method not implemented.');
  }
  get(chatId: string): Promise<Message[]> {
    throw new Error('Method not implemented.');
  }
  clear(chatId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
