import { Logger } from '@nestjs/common';
import { ChatModel } from '../llm/chat-model.interface';
import { createUserMessage } from '../agent/model/message.interface';
import { Document } from './vector-store.interface';

const KEYWORD_EXTRACTION_PROMPT = `你是一个关键词提取助手。请从以下文本中提取5-10个关键词。
要求：
1. 关键词应该是文本中的核心概念
2. 包含专有名词、技术术语
3. 返回JSON数组格式，例如：["关键词1", "关键词2"]
4. 只返回JSON数组，不要其他内容`;

/**
 * 关键词丰富器
 * 为文档自动补充关键词元信息，提高检索精度
 */
export class KeywordEnricher {
  private readonly logger = new Logger(KeywordEnricher.name);

  constructor(private chatModel: ChatModel) {}

  /**
   * 为文档列表添加关键词元信息
   */
  async enrichDocuments(documents: Document[]): Promise<Document[]> {
    const enrichedDocs: Document[] = [];

    for (const doc of documents) {
      try {
        const keywords = await this.extractKeywords(doc.content);
        enrichedDocs.push({
          ...doc,
          metadata: {
            ...doc.metadata,
            keywords,
          },
        });
        this.logger.debug(`Enriched document ${doc.id} with ${keywords.length} keywords`);
      } catch (error) {
        // 如果提取失败，保留原文档
        this.logger.warn(`Failed to enrich document ${doc.id}, keeping original`);
        enrichedDocs.push(doc);
      }
    }

    return enrichedDocs;
  }

  /**
   * 从文本中提取关键词
   */
  private async extractKeywords(content: string): Promise<string[]> {
    // 截取内容前1000字符，避免token过多
    const truncatedContent = content.slice(0, 1000);

    const response = await this.chatModel.chat({
      messages: [createUserMessage(`请提取以下文本的关键词：\n\n${truncatedContent}`)],
      systemPrompt: KEYWORD_EXTRACTION_PROMPT,
    });

    try {
      // 尝试解析JSON数组
      const parsed = JSON.parse(response.content.trim());
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string');
      }
      return [];
    } catch {
      // 如果解析失败，尝试从文本中提取
      return this.fallbackExtract(response.content);
    }
  }

  /**
   * 备用提取方法：从非JSON格式文本中提取关键词
   */
  private fallbackExtract(text: string): string[] {
    // 尝试匹配引号包围的词
    const matches = text.match(/["'"]([^"'"]+)["'"]/g);
    if (matches) {
      return matches.map((m) => m.replace(/["'"]/g, '').trim()).filter((k) => k.length > 0);
    }
    // 尝试按逗号分割
    const parts = text.split(/[,，]/);
    if (parts.length > 1) {
      return parts.map((p) => p.trim()).filter((k) => k.length > 0 && k.length < 20);
    }
    return [];
  }

  /**
   * 基于关键词的查询增强
   */
  async augmentQuery(query: string, documentKeywords: string[][]): Promise<string> {
    // 统计关键词频率
    const keywordFreq = new Map<string, number>();
    for (const keywords of documentKeywords) {
      for (const keyword of keywords) {
        keywordFreq.set(keyword, (keywordFreq.get(keyword) || 0) + 1);
      }
    }

    // 取频率最高的关键词
    const topKeywords = Array.from(keywordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword);

    if (topKeywords.length === 0) {
      return query;
    }

    return `${query} ${topKeywords.join(' ')}`;
  }
}
