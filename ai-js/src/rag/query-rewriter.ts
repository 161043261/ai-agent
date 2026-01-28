import { ChatModel } from '../llm/chat-model.interface';
import { createUserMessage, createSystemMessage } from '../agent/model/message.interface';

const REWRITE_PROMPT = `你是一个查询重写助手; 请将用户的查询重写为更适合搜索的形式; 
要求：
1. 保持原意
2. 扩展关键词
3. 去除口语化表达
4. 输出重写后的查询, 不要输出其他内容`;

/**
 * 查询重写器
 */
export class QueryRewriter {
  constructor(private chatModel: ChatModel) {}

  /**
   * 执行查询重写
   */
  async rewrite(query: string): Promise<string> {
    try {
      const response = await this.chatModel.chat({
        messages: [createUserMessage(query)],
        systemPrompt: REWRITE_PROMPT,
      });

      return response.content.trim() || query;
    } catch {
      // 如果重写失败, 返回原查询
      return query;
    }
  }
}
