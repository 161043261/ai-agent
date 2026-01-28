import { Logger } from '@nestjs/common';
import { Document, VectorStore } from './vector-store.interface';

/**
 * 过滤表达式类型
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';

/**
 * 过滤条件
 */
export interface FilterExpression {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * 文档检索器配置
 */
export interface DocumentRetrieverConfig {
  /** 向量存储 */
  vectorStore: VectorStore;
  /** 过滤表达式 */
  filterExpression?: FilterExpression | FilterExpression[];
  /** 相似度阈值 (0-1) */
  similarityThreshold?: number;
  /** 返回文档数量 */
  topK?: number;
}

/**
 * 过滤表达式构建器
 */
export class FilterExpressionBuilder {
  private expressions: FilterExpression[] = [];

  /**
   * 等于
   */
  eq(field: string, value: unknown): FilterExpressionBuilder {
    this.expressions.push({ field, operator: 'eq', value });
    return this;
  }

  /**
   * 不等于
   */
  ne(field: string, value: unknown): FilterExpressionBuilder {
    this.expressions.push({ field, operator: 'ne', value });
    return this;
  }

  /**
   * 大于
   */
  gt(field: string, value: number): FilterExpressionBuilder {
    this.expressions.push({ field, operator: 'gt', value });
    return this;
  }

  /**
   * 大于等于
   */
  gte(field: string, value: number): FilterExpressionBuilder {
    this.expressions.push({ field, operator: 'gte', value });
    return this;
  }

  /**
   * 小于
   */
  lt(field: string, value: number): FilterExpressionBuilder {
    this.expressions.push({ field, operator: 'lt', value });
    return this;
  }

  /**
   * 小于等于
   */
  lte(field: string, value: number): FilterExpressionBuilder {
    this.expressions.push({ field, operator: 'lte', value });
    return this;
  }

  /**
   * 包含于
   */
  in(field: string, values: unknown[]): FilterExpressionBuilder {
    this.expressions.push({ field, operator: 'in', value: values });
    return this;
  }

  /**
   * 不包含于
   */
  nin(field: string, values: unknown[]): FilterExpressionBuilder {
    this.expressions.push({ field, operator: 'nin', value: values });
    return this;
  }

  /**
   * 包含字符串
   */
  contains(field: string, value: string): FilterExpressionBuilder {
    this.expressions.push({ field, operator: 'contains', value });
    return this;
  }

  /**
   * 构建过滤表达式
   */
  build(): FilterExpression[] {
    return [...this.expressions];
  }

  /**
   * 构建单个表达式（如果只有一个）
   */
  buildSingle(): FilterExpression | undefined {
    return this.expressions.length === 1 ? this.expressions[0] : undefined;
  }
}

/**
 * 向量存储文档检索器
 * 支持按元数据过滤文档
 */
export class VectorStoreDocumentRetriever {
  private readonly logger = new Logger(VectorStoreDocumentRetriever.name);
  private readonly vectorStore: VectorStore;
  private readonly filterExpressions: FilterExpression[];
  private readonly similarityThreshold: number;
  private readonly topK: number;

  constructor(config: DocumentRetrieverConfig) {
    this.vectorStore = config.vectorStore;
    this.filterExpressions = Array.isArray(config.filterExpression)
      ? config.filterExpression
      : config.filterExpression
        ? [config.filterExpression]
        : [];
    this.similarityThreshold = config.similarityThreshold ?? 0.5;
    this.topK = config.topK ?? 3;
  }

  /**
   * 检索相关文档
   */
  async retrieve(query: string): Promise<Document[]> {
    // 从向量存储搜索（获取更多结果以便过滤）
    const searchResults = await this.vectorStore.search(query, this.topK * 3);

    // 应用过滤和阈值
    const filteredResults = searchResults
      .filter((result) => result.score >= this.similarityThreshold)
      .filter((result) => this.matchesFilter(result.document));

    // 取 topK
    const topResults = filteredResults.slice(0, this.topK);

    this.logger.log(
      `Retrieved ${topResults.length} documents for query: ${query.substring(0, 50)}...`,
    );

    return topResults.map((r) => r.document);
  }

  /**
   * 检查文档是否匹配过滤条件
   */
  private matchesFilter(document: Document): boolean {
    if (this.filterExpressions.length === 0) {
      return true;
    }

    return this.filterExpressions.every((expr) => this.evaluateExpression(document, expr));
  }

  /**
   * 评估单个过滤表达式
   */
  private evaluateExpression(document: Document, expr: FilterExpression): boolean {
    const fieldValue = document.metadata?.[expr.field];

    switch (expr.operator) {
      case 'eq':
        return fieldValue === expr.value;
      case 'ne':
        return fieldValue !== expr.value;
      case 'gt':
        return typeof fieldValue === 'number' && fieldValue > (expr.value as number);
      case 'gte':
        return typeof fieldValue === 'number' && fieldValue >= (expr.value as number);
      case 'lt':
        return typeof fieldValue === 'number' && fieldValue < (expr.value as number);
      case 'lte':
        return typeof fieldValue === 'number' && fieldValue <= (expr.value as number);
      case 'in':
        return Array.isArray(expr.value) && expr.value.includes(fieldValue);
      case 'nin':
        return Array.isArray(expr.value) && !expr.value.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(expr.value as string);
      default:
        return true;
    }
  }

  /**
   * 构建器模式
   */
  static builder(): VectorStoreDocumentRetrieverBuilder {
    return new VectorStoreDocumentRetrieverBuilder();
  }
}

/**
 * 文档检索器构建器
 */
export class VectorStoreDocumentRetrieverBuilder {
  private config: Partial<DocumentRetrieverConfig> = {};

  vectorStore(store: VectorStore): VectorStoreDocumentRetrieverBuilder {
    this.config.vectorStore = store;
    return this;
  }

  filterExpression(
    expr: FilterExpression | FilterExpression[],
  ): VectorStoreDocumentRetrieverBuilder {
    this.config.filterExpression = expr;
    return this;
  }

  similarityThreshold(threshold: number): VectorStoreDocumentRetrieverBuilder {
    this.config.similarityThreshold = threshold;
    return this;
  }

  topK(k: number): VectorStoreDocumentRetrieverBuilder {
    this.config.topK = k;
    return this;
  }

  build(): VectorStoreDocumentRetriever {
    if (!this.config.vectorStore) {
      throw new Error('VectorStore is required');
    }
    return new VectorStoreDocumentRetriever(this.config as DocumentRetrieverConfig);
  }
}

/**
 * 创建恋爱应用的自定义 RAG 检索顾问
 */
export function createLoveAppDocumentRetriever(
  vectorStore: VectorStore,
  status: string,
): VectorStoreDocumentRetriever {
  // 过滤特定状态的文档
  const expression = new FilterExpressionBuilder().eq('status', status).buildSingle();

  return VectorStoreDocumentRetriever.builder()
    .vectorStore(vectorStore)
    .filterExpression(expression!)
    .similarityThreshold(0.5)
    .topK(3)
    .build();
}
