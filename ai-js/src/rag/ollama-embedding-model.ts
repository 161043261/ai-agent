import axios from 'axios';
import { Logger } from '@nestjs/common';
import { EmbeddingModel } from './embedding-model.interface';

/**
 * Ollama 本地 Embedding 模型实现
 */
export class OllamaEmbeddingModel implements EmbeddingModel {
  private readonly logger = new Logger(OllamaEmbeddingModel.name);

  constructor(
    private readonly baseUrl: string = 'http://localhost:11434',
    private readonly model: string = 'nomic-embed-text',
  ) {}

  async embed(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/embed`,
        {
          model: this.model,
          input: text,
        },
        {
          timeout: 30000,
        },
      );

      return response.data.embeddings[0];
    } catch (error) {
      this.logger.error('Ollama Embedding API error', error);
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/embed`,
        {
          model: this.model,
          input: texts,
        },
        {
          timeout: 60000,
        },
      );

      return response.data.embeddings;
    } catch (error) {
      this.logger.error('Ollama Embedding API error', error);
      throw error;
    }
  }
}
