/**
 * Embedding 模型接口
 */
export interface EmbeddingModel {
  /**
   * 将文本转换为向量
   */
  embed(text: string): Promise<number[]>;

  /**
   * 批量转换
   */
  embedBatch(texts: string[]): Promise<number[][]>;
}
