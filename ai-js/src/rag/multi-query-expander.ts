import { Logger } from '@nestjs/common';
import { ChatModel } from '../llm/chat-model.interface';
import { createUserMessage } from '../agent/model/message.interface';

/**
 * 查询对象
 */
export interface Query {
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * 多查询扩展器配置
 */
export interface MultiQueryExpanderConfig {
  /** 生成的查询数量 */
  numberOfQueries?: number;
  /** 是否包含原始查询 */
  includeOriginal?: boolean;
}

const QUERY_EXPANSION_PROMPT = `你是一个查询扩展助手。给定一个用户查询，请生成 {numberOfQueries} 个相关但不同角度的查询变体。

要求：
1. 每个查询应该从不同角度或使用不同关键词来表达相似的意图
2. 查询应该有助于检索更全面的相关文档
3. 保持查询简洁明了
4. 每行输出一个查询，不要编号，不要其他解释

原始查询：{query}

请生成查询变体：`;

/**
 * 多查询扩展器
 * 将单个查询扩展为多个相关查询，提高检索召回率
 */
export class MultiQueryExpander {
  private readonly logger = new Logger(MultiQueryExpander.name);
  private readonly numberOfQueries: number;
  private readonly includeOriginal: boolean;

  constructor(
    private chatModel: ChatModel,
    config: MultiQueryExpanderConfig = {},
  ) {
    this.numberOfQueries = config.numberOfQueries ?? 3;
    this.includeOriginal = config.includeOriginal ?? true;
  }

  /**
   * 扩展查询
   * @param query 原始查询
   * @returns 扩展后的查询列表
   */
  async expand(query: string | Query): Promise<Query[]> {
    const queryText = typeof query === 'string' ? query : query.text;
    const originalMetadata = typeof query === 'string' ? {} : query.metadata || {};

    const queries: Query[] = [];

    // 可选：包含原始查询
    if (this.includeOriginal) {
      queries.push({
        text: queryText,
        metadata: { ...originalMetadata, isOriginal: true },
      });
    }

    try {
      const prompt = QUERY_EXPANSION_PROMPT.replace(
        '{numberOfQueries}',
        String(this.numberOfQueries),
      ).replace('{query}', queryText);

      const response = await this.chatModel.chat({
        messages: [createUserMessage(prompt)],
      });

      // 解析生成的查询
      const expandedQueries = response.content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.match(/^\d+[.、]/)) // 过滤空行和编号
        .slice(0, this.numberOfQueries);

      for (let i = 0; i < expandedQueries.length; i++) {
        queries.push({
          text: expandedQueries[i],
          metadata: {
            ...originalMetadata,
            isOriginal: false,
            expansionIndex: i,
          },
        });
      }

      this.logger.log(
        `Expanded query "${queryText.substring(0, 30)}..." into ${queries.length} queries`,
      );
    } catch (error) {
      this.logger.error('Failed to expand query', error);
      // 如果扩展失败，至少返回原始查询
      if (queries.length === 0) {
        queries.push({
          text: queryText,
          metadata: { ...originalMetadata, isOriginal: true },
        });
      }
    }

    return queries;
  }

  /**
   * 批量扩展查询
   */
  async expandBatch(queries: (string | Query)[]): Promise<Query[]> {
    const allQueries: Query[] = [];

    for (const query of queries) {
      const expanded = await this.expand(query);
      allQueries.push(...expanded);
    }

    return allQueries;
  }

  /**
   * 构建器模式
   */
  static builder(): MultiQueryExpanderBuilder {
    return new MultiQueryExpanderBuilder();
  }
}

/**
 * 多查询扩展器构建器
 */
export class MultiQueryExpanderBuilder {
  private config: MultiQueryExpanderConfig = {};
  private chatModel?: ChatModel;

  chatClientBuilder(model: ChatModel): MultiQueryExpanderBuilder {
    this.chatModel = model;
    return this;
  }

  numberOfQueries(num: number): MultiQueryExpanderBuilder {
    this.config.numberOfQueries = num;
    return this;
  }

  includeOriginal(include: boolean): MultiQueryExpanderBuilder {
    this.config.includeOriginal = include;
    return this;
  }

  build(): MultiQueryExpander {
    if (!this.chatModel) {
      throw new Error('ChatModel is required');
    }
    return new MultiQueryExpander(this.chatModel, this.config);
  }
}

/**
 * 查询重写转换器
 */
export class RewriteQueryTransformer {
  private readonly logger = new Logger(RewriteQueryTransformer.name);

  constructor(private chatModel: ChatModel) {}

  private static readonly REWRITE_PROMPT = `你是一个查询重写助手。请将用户的查询重写为更适合搜索的形式。

要求：
1. 保持原意不变
2. 扩展和优化关键词
3. 去除口语化表达
4. 使查询更加精确和专业
5. 只输出重写后的查询，不要输出其他内容

原始查询：{query}`;

  /**
   * 转换查询
   */
  async transform(query: Query): Promise<Query> {
    try {
      const prompt = RewriteQueryTransformer.REWRITE_PROMPT.replace('{query}', query.text);

      const response = await this.chatModel.chat({
        messages: [createUserMessage(prompt)],
      });

      const rewrittenText = response.content.trim();

      this.logger.log(`Rewritten query: "${query.text}" -> "${rewrittenText}"`);

      return {
        text: rewrittenText || query.text,
        metadata: {
          ...query.metadata,
          originalQuery: query.text,
          isRewritten: true,
        },
      };
    } catch (error) {
      this.logger.error('Failed to rewrite query', error);
      return query;
    }
  }

  /**
   * 构建器模式
   */
  static builder(): RewriteQueryTransformerBuilder {
    return new RewriteQueryTransformerBuilder();
  }
}

/**
 * 查询重写转换器构建器
 */
export class RewriteQueryTransformerBuilder {
  private chatModel?: ChatModel;

  chatClientBuilder(model: ChatModel): RewriteQueryTransformerBuilder {
    this.chatModel = model;
    return this;
  }

  build(): RewriteQueryTransformer {
    if (!this.chatModel) {
      throw new Error('ChatModel is required');
    }
    return new RewriteQueryTransformer(this.chatModel);
  }
}
