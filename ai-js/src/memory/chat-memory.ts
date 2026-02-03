import { Message } from '../agent/model/message';

export interface ChatMemory {
  add(chatId: string, messages: Message[]): Promise<void>;
  get(chatId: string): Promise<Message[]>;
  clear(chatId: string): Promise<void>;
}
