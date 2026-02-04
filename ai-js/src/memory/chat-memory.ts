import { BaseMessage } from '@langchain/core/messages';

export interface ChatMemory {
  add(chatId: string, messages: BaseMessage[]): Promise<void>;
  get(chatId: string): Promise<BaseMessage[]>;
  clear(chatId: string): Promise<void>;
}
