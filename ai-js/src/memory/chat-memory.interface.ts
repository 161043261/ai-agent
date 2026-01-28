import { Message } from '../agent/model/message.interface';

/**
 * Chat Memory 接口
 */
export interface ChatMemory {
  /**
   * 添加消息
   */
  add(conversationId: string, messages: Message[]): Promise<void>;

  /**
   * 获取消息列表
   */
  get(conversationId: string): Promise<Message[]>;

  /**
   * 清除对话记录
   */
  clear(conversationId: string): Promise<void>;
}
