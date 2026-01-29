import { FilterExpression } from './filter-expression';

/**
 * 文档接口
 */
export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

/**
 * 搜索结果
 */
export interface SearchResult {
  document: Document;
  score: number;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 返回结果数量 */
  topK?: number;
  /** 过滤表达式 */
  filterExpression?: FilterExpression;
  /** 相似度阈值 (0-1) */
  similarityThreshold?: number;
}

/**
 * 向量存储接口
 */
export interface VectorStore {
  /**
   * 添加文档
   */
  add(documents: Document[]): Promise<void>;

  /**
   * 搜索相似文档
   * @param query 查询文本
   * @param topK 返回结果数量（简化调用）
   */
  search(query: string, topK?: number): Promise<SearchResult[]>;

  /**
   * 带选项的搜索（支持过滤和阈值）
   * @param query 查询文本
   * @param options 搜索选项
   */
  searchWithOptions?(query: string, options: SearchOptions): Promise<SearchResult[]>;

  /**
   * 删除文档
   */
  delete(ids: string[]): Promise<void>;
}
