import { Logger } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';

interface EmbeddingModel {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export class DashscopeEmbeddingModel implements EmbeddingModel {
  private readonly logger = new Logger(DashscopeEmbeddingModel.name);
  private readonly client: OpenAIEmbeddings;

  constructor(
    private readonly apiKey: string,
    private readonly modelName = 'text-embedding-v3',
  ) {
    this.client = new OpenAIEmbeddings({
      openAIApiKey: this.apiKey,
      modelName: this.modelName,
      configuration: {
        baseURL: DASHSCOPE_BASE_URL,
      },
    });
  }

  async embed(text: string): Promise<number[]> {
    try {
      return await this.client.embedQuery(text);
    } catch (err) {
      this.logger.error('Dashscope embedding api error:', err);
      throw err;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      return await this.client.embedDocuments(texts);
    } catch (err) {
      this.logger.error('Dashscope embedding batch api error:', err);
      throw err;
    }
  }
}
