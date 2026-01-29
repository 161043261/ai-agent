import { Logger } from '@nestjs/common';
import { VectorStore, SearchOptions, SearchResult } from './vector-store.interface';
import { FilterExpression, FilterExpressionBuilder } from './filter-expression';

/**
 * 文档检索器配置
 */
export interface DocumentRetrieverConfig {
  /** 向量存储 */
  vectorStore: VectorStore;
  /** 过滤表达式 */
  filterExpression?: FilterExpression;
  /** 相似度阈值 */
  similarityThreshold?: number;
  /** 返回文档数量 */
  topK?: number;
}

/**
 * 文档检索器
 * 参考 Java 版本的 VectorStoreDocumentRetriever
 */
export class DocumentRetriever {
  private readonly logger = new Logger(DocumentRetriever.name);
  private readonly config: Required<Omit<DocumentRetrieverConfig, 'filterExpression'>> & {
    filterExpression?: FilterExpression;
  };

  constructor(config: DocumentRetrieverConfig) {
    this.config = {
      vectorStore: config.vectorStore,
      filterExpression: config.filterExpression,
      similarityThreshold: config.similarityThreshold ?? 0.5,
      topK: config.topK ?? 3,
    };
  }

  /**
   * 检索相关文档
   */
  async retrieve(query: string): Promise<SearchResult[]> {
    const options: SearchOptions = {
      topK: this.config.topK,
      similarityThreshold: this.config.similarityThreshold,
      filterExpression: this.config.filterExpression,
    };

    // 检查向量存储是否支持带选项的搜索
    if (this.config.vectorStore.searchWithOptions) {
      return this.config.vectorStore.searchWithOptions(query, options);
    }

    // 回退到基本搜索
    return this.config.vectorStore.search(query, this.config.topK);
  }

  /**
   * 创建构建器
   */
  static builder(): DocumentRetrieverBuilder {
    return new DocumentRetrieverBuilder();
  }
}

/**
 * 文档检索器构建器
 */
export class DocumentRetrieverBuilder {
  private config: Partial<DocumentRetrieverConfig> = {};

  vectorStore(store: VectorStore): DocumentRetrieverBuilder {
    this.config.vectorStore = store;
    return this;
  }

  filterExpression(expression: FilterExpression): DocumentRetrieverBuilder {
    this.config.filterExpression = expression;
    return this;
  }

  similarityThreshold(threshold: number): DocumentRetrieverBuilder {
    this.config.similarityThreshold = threshold;
    return this;
  }

  topK(k: number): DocumentRetrieverBuilder {
    this.config.topK = k;
    return this;
  }

  build(): DocumentRetriever {
    if (!this.config.vectorStore) {
      throw new Error('VectorStore is required');
    }
    return new DocumentRetriever(this.config as DocumentRetrieverConfig);
  }
}

/**
 * 恋爱应用 RAG 自定义 Advisor 工厂
 * 参考 Java 版本的 LoveAppRagCustomAdvisorFactory
 */
export class LoveAppRagAdvisorFactory {
  private readonly logger = new Logger(LoveAppRagAdvisorFactory.name);

  /**
   * 创建自定义的 RAG 检索器
   * @param vectorStore 向量存储
   * @param status 状态过滤条件
   */
  static createDocumentRetriever(vectorStore: VectorStore, status: string): DocumentRetriever {
    // 创建过滤表达式
    const filterBuilder = new FilterExpressionBuilder();
    const filterExpression = filterBuilder.eq('status', status);

    return DocumentRetriever.builder()
      .vectorStore(vectorStore)
      .filterExpression(filterExpression)
      .similarityThreshold(0.5)
      .topK(3)
      .build();
  }

  /**
   * 创建带多条件过滤的检索器
   * @param vectorStore 向量存储
   * @param filters 过滤条件
   */
  static createWithFilters(
    vectorStore: VectorStore,
    filters: { field: string; value: unknown }[],
  ): DocumentRetriever {
    const filterBuilder = new FilterExpressionBuilder();

    // 构建 AND 条件
    const expressions = filters.map((f) => filterBuilder.eq(f.field, f.value));
    const filterExpression =
      expressions.length > 1 ? filterBuilder.and(...expressions) : expressions[0];

    return DocumentRetriever.builder()
      .vectorStore(vectorStore)
      .filterExpression(filterExpression)
      .similarityThreshold(0.5)
      .topK(3)
      .build();
  }

  /**
   * 创建带分类过滤的检索器
   * @param vectorStore 向量存储
   * @param categories 允许的分类列表
   */
  static createWithCategories(
    vectorStore: VectorStore,
    categories: string[],
  ): DocumentRetriever {
    const filterBuilder = new FilterExpressionBuilder();
    const filterExpression = filterBuilder.in('category', categories);

    return DocumentRetriever.builder()
      .vectorStore(vectorStore)
      .filterExpression(filterExpression)
      .similarityThreshold(0.5)
      .topK(5)
      .build();
  }
}
