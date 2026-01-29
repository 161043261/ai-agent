import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Document, SearchResult, VectorStore, SearchOptions } from './vector-store.interface';
import { EmbeddingModel } from './embedding-model.interface';
import { FilterExpressionEvaluator } from './filter-expression';

/**
 * 简单的内存向量存储实现
 */
export class SimpleVectorStore implements VectorStore {
  private readonly logger = new Logger(SimpleVectorStore.name);
  private documents: Map<string, Document> = new Map();
  private readonly filterEvaluator = new FilterExpressionEvaluator();

  constructor(private embeddingModel: EmbeddingModel) {}

  async add(documents: Document[]): Promise<void> {
    for (const doc of documents) {
      const id = doc.id || uuidv4();
      const embedding = await this.embeddingModel.embed(doc.content);
      this.documents.set(id, { ...doc, id, embedding });
      this.logger.log(`Added document: ${id}`);
    }
  }

  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    return this.searchWithOptions(query, { topK });
  }

  async searchWithOptions(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { topK = 5, filterExpression, similarityThreshold = 0 } = options;

    const queryEmbedding = await this.embeddingModel.embed(query);

    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      // 应用元数据过滤
      if (filterExpression && doc.metadata) {
        const matches = this.filterEvaluator.evaluate(filterExpression, doc.metadata);
        if (!matches) {
          continue;
        }
      }

      if (doc.embedding) {
        const score = this.cosineSimilarity(queryEmbedding, doc.embedding);

        // 应用相似度阈值
        if (score >= similarityThreshold) {
          results.push({ document: doc, score });
        }
      }
    }

    // 按相似度降序排序, 取 topK
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}
