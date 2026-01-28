import { Logger } from '@nestjs/common';
import { ChatModel } from '../llm/chat-model.interface';
import { createUserMessage } from '../agent/model/message.interface';
import { Document } from './vector-store.interface';

const KEYWORD_EXTRACT_PROMPT = `你是一个关键词提取助手。请从以下文档内容中提取最重要的关键词。

要求：
1. 提取 {keywordCount} 个最相关的关键词
2. 关键词应该能够准确概括文档主题
3. 只输出关键词，用逗号分隔，不要输出其他内容

文档内容：
{content}`;

/**
 * 基于 AI 的关键词增强器
 * 使用 AI 自动为文档补充关键词元信息
 */
export class KeywordEnricher {
  private readonly logger = new Logger(KeywordEnricher.name);

  constructor(
    private chatModel: ChatModel,
    private keywordCount: number = 5,
  ) {}

  /**
   * 为单个文档提取关键词
   */
  async extractKeywords(content: string): Promise<string[]> {
    try {
      const prompt = KEYWORD_EXTRACT_PROMPT.replace(
        '{keywordCount}',
        String(this.keywordCount),
      ).replace(
        '{content}',
        content.substring(0, 2000), // 限制内容长度
      );

      const response = await this.chatModel.chat({
        messages: [createUserMessage(prompt)],
      });

      const keywords = response.content
        .split(/[,，]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      return keywords.slice(0, this.keywordCount);
    } catch (error) {
      this.logger.error('Failed to extract keywords', error);
      return [];
    }
  }

  /**
   * 为文档列表补充关键词元信息
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
            keywords: keywords.join(','),
            keywordList: keywords,
          },
        });

        this.logger.log(`Enriched document ${doc.id} with keywords: ${keywords.join(', ')}`);
      } catch (error) {
        this.logger.error(`Failed to enrich document ${doc.id}`, error);
        enrichedDocs.push(doc);
      }
    }

    return enrichedDocs;
  }

  /**
   * 批量为文档提取关键词（并行处理）
   */
  async enrichDocumentsBatch(documents: Document[], batchSize: number = 5): Promise<Document[]> {
    const enrichedDocs: Document[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchPromises = batch.map(async (doc) => {
        try {
          const keywords = await this.extractKeywords(doc.content);
          return {
            ...doc,
            metadata: {
              ...doc.metadata,
              keywords: keywords.join(','),
              keywordList: keywords,
            },
          };
        } catch {
          return doc;
        }
      });

      const results = await Promise.all(batchPromises);
      enrichedDocs.push(...results);
    }

    return enrichedDocs;
  }
}
