import { Logger } from '@nestjs/common';
import { ChatModel } from '../llm/chat-model.interface';
import { createUserMessage } from '../agent/model/message.interface';

const QUERY_EXPANSION_PROMPT = `你是一个查询扩展助手。请将用户的问题改写成多个不同表述的问题，以便更好地搜索相关信息。
要求：
1. 保持原意不变
2. 使用不同的词汇和句式
3. 从不同角度描述同一问题
4. 返回JSON数组格式，例如：["问题1", "问题2", "问题3"]
5. 只返回JSON数组，不要其他内容`;

/**
 * 多查询扩展器
 * 将单一查询扩展为多个查询，提高召回率
 */
export class MultiQueryExpander {
  private readonly logger = new Logger(MultiQueryExpander.name);

  constructor(private chatModel: ChatModel) {}

  /**
   * 扩展查询
   * @param query 原始查询
   * @param count 生成的查询数量（不包含原始查询）
   * @returns 包含原始查询和扩展查询的数组
   */
  async expand(query: string, count: number = 3): Promise<string[]> {
    try {
      const response = await this.chatModel.chat({
        messages: [createUserMessage(`请将以下问题改写成 ${count} 个不同表述的问题：\n\n${query}`)],
        systemPrompt: QUERY_EXPANSION_PROMPT,
      });

      const expandedQueries = this.parseResponse(response.content);

      if (expandedQueries.length > 0) {
        this.logger.log(`Query expanded from 1 to ${expandedQueries.length + 1} queries`);
        return [query, ...expandedQueries.slice(0, count)];
      }

      return [query];
    } catch (error) {
      this.logger.warn('Query expansion failed, using original query');
      return [query];
    }
  }

  /**
   * 解析响应内容
   */
  private parseResponse(content: string): string[] {
    try {
      // 尝试直接解析JSON
      const parsed = JSON.parse(content.trim());
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
      }
    } catch {
      // JSON解析失败，尝试其他方式
    }

    // 尝试提取JSON数组
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
        }
      } catch {
        // 忽略
      }
    }

    // 尝试按行分割（处理编号列表）
    const lines = content
      .split('\n')
      .map((line) => line.replace(/^\d+[.\)、]\s*/, '').trim())
      .filter((line) => line.length > 5 && !line.startsWith('[') && !line.startsWith('{'));

    if (lines.length > 0) {
      return lines;
    }

    return [];
  }

  /**
   * 合并多个查询的搜索结果
   * @param results 每个查询的搜索结果数组
   * @param topK 返回的结果数量
   */
  mergeResults<T extends { document: { id: string }; score: number }>(
    results: T[][],
    topK: number,
  ): T[] {
    // 使用文档ID作为key进行去重，保留最高分数
    const mergedMap = new Map<string, T>();

    for (const queryResults of results) {
      for (const result of queryResults) {
        const existing = mergedMap.get(result.document.id);
        if (!existing || result.score > existing.score) {
          mergedMap.set(result.document.id, result);
        }
      }
    }

    // 按分数排序并返回topK结果
    return Array.from(mergedMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
