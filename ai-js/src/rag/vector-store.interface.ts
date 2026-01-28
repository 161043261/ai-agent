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
 * 向量存储接口
 */
export interface VectorStore {
  /**
   * 添加文档
   */
  add(documents: Document[]): Promise<void>;

  /**
   * 搜索相似文档
   */
  search(query: string, topK?: number): Promise<SearchResult[]>;

  /**
   * 删除文档
   */
  delete(ids: string[]): Promise<void>;
}
