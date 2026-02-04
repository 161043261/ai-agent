import { Logger } from '@nestjs/common';
import { EmbeddingModel } from './types';
import axios from 'axios';

const DASHSCOPE_EMBEDDING_URL =
  'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings';

interface DashscopeEmbeddingResponse {
  data: { embedding: number[] }[];
}

export class DashscopeEmbeddingModel implements EmbeddingModel {
  private readonly logger = new Logger(DashscopeEmbeddingModel.name);
  constructor(
    private readonly apiKey: string,
    private readonly modelName = 'text-embedding-v3',
  ) {}

  async embed(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    return result[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const { data: axiosData } = await axios.post<DashscopeEmbeddingResponse>(
        DASHSCOPE_EMBEDDING_URL,
        {
          model: this.modelName,
          input: texts,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 180_000,
        },
      );
      const { data } = axiosData;
      return data.map((item) => item.embedding);
    } catch (err) {
      this.logger.error('Dashscope embedding api error:', err);
      throw err;
    }
  }
}
