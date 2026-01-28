import axios from 'axios';
import { Logger } from '@nestjs/common';
import { EmbeddingModel } from './embedding-model.interface';

const DASHSCOPE_EMBEDDING_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings';

/**
 * 阿里云 DashScope Embedding 模型实现
 */
export class DashScopeEmbeddingModel implements EmbeddingModel {
  private readonly logger = new Logger(DashScopeEmbeddingModel.name);

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'text-embedding-v3',
  ) {}

  async embed(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    return result[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(
        DASHSCOPE_EMBEDDING_URL,
        {
          model: this.model,
          input: texts,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        },
      );

      const data = response.data;
      return data.data.map((item: { embedding: number[] }) => item.embedding);
    } catch (error) {
      this.logger.error('DashScope Embedding API error', error);
      throw error;
    }
  }
}
