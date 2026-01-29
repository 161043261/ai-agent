import { Logger } from '@nestjs/common';
import { ChatModel } from '../llm/chat-model.interface';
import { createUserMessage } from '../agent/model/message.interface';
import { Message } from '../agent/model/message.interface';

const CONTEXT_AUGMENT_PROMPT = `你是一个查询增强助手。请根据对话历史和当前查询，生成一个更完整、更明确的查询。
要求：
1. 结合对话上下文理解用户真实意图
2. 补充代词指代的具体内容
3. 保持查询的简洁性
4. 只返回增强后的查询文本，不要其他内容`;

/**
 * 上下文查询增强器
 * 根据对话上下文增强查询，解决代词指代等问题
 */
export class ContextualQueryAugmenter {
  private readonly logger = new Logger(ContextualQueryAugmenter.name);

  constructor(private chatModel: ChatModel) {}

  /**
   * 根据对话上下文增强查询
   * @param query 当前查询
   * @param conversationHistory 对话历史
   * @param maxHistoryTurns 使用的最大对话轮数
   */
  async augment(
    query: string,
    conversationHistory: Message[],
    maxHistoryTurns: number = 3,
  ): Promise<string> {
    // 如果没有历史记录，直接返回原查询
    if (!conversationHistory || conversationHistory.length === 0) {
      return query;
    }

    // 检查是否需要增强（查询中是否包含代词或模糊引用）
    if (!this.needsAugmentation(query)) {
      return query;
    }

    try {
      // 截取最近的对话历史
      const recentHistory = this.getRecentHistory(conversationHistory, maxHistoryTurns);

      // 构建上下文提示
      const contextPrompt = this.buildContextPrompt(recentHistory, query);

      const response = await this.chatModel.chat({
        messages: [createUserMessage(contextPrompt)],
        systemPrompt: CONTEXT_AUGMENT_PROMPT,
      });

      const augmentedQuery = response.content.trim();

      // 验证增强后的查询
      if (augmentedQuery.length > 0 && augmentedQuery.length < query.length * 3) {
        this.logger.log(`Query augmented: "${query}" -> "${augmentedQuery}"`);
        return augmentedQuery;
      }

      return query;
    } catch (error) {
      this.logger.warn('Query augmentation failed, using original query');
      return query;
    }
  }

  /**
   * 检查查询是否需要上下文增强
   */
  private needsAugmentation(query: string): boolean {
    // 检查是否包含代词或模糊引用
    const pronounPatterns = [
      /\b(他|她|它|这|那|这个|那个|此|这些|那些)\b/,
      /\b(之前|刚才|上面|前面|后面)\b/,
      /\b(继续|接着|然后|还有)\b/,
      /^(怎么|如何|为什么|什么)\b/,
      /\b(为什么|怎么样|如何)\b$/,
    ];

    return pronounPatterns.some((pattern) => pattern.test(query));
  }

  /**
   * 获取最近的对话历史
   */
  private getRecentHistory(history: Message[], maxTurns: number): Message[] {
    // 计算对话轮数（一个用户消息+一个助手消息为一轮）
    let turnCount = 0;
    const result: Message[] = [];

    for (let i = history.length - 1; i >= 0 && turnCount < maxTurns; i--) {
      result.unshift(history[i]);
      if (history[i].role === 'user') {
        turnCount++;
      }
    }

    return result;
  }

  /**
   * 构建上下文提示
   */
  private buildContextPrompt(history: Message[], currentQuery: string): string {
    const historyText = history
      .map((msg) => {
        const role = msg.role === 'user' ? '用户' : '助手';
        return `${role}: ${msg.content}`;
      })
      .join('\n');

    return `对话历史：
${historyText}

当前查询：${currentQuery}

请根据对话历史，将当前查询改写为一个更完整、更明确的查询。`;
  }

  /**
   * 批量增强查询
   */
  async augmentBatch(
    queries: string[],
    conversationHistory: Message[],
    maxHistoryTurns: number = 3,
  ): Promise<string[]> {
    const results: string[] = [];

    for (const query of queries) {
      const augmented = await this.augment(query, conversationHistory, maxHistoryTurns);
      results.push(augmented);
    }

    return results;
  }
}
