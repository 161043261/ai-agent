import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { VectorStore, SearchResult, Document } from './vector-store.interface';
import { SimpleVectorStore } from './simple-vector-store';
import { DashScopeEmbeddingModel } from './dashscope-embedding-model';
import { OllamaEmbeddingModel } from './ollama-embedding-model';
import { DocumentLoader } from './document-loader';
import { QueryRewriter } from './query-rewriter';
import { LlmService } from '../llm/llm.service';
import { EmbeddingModel } from './embedding-model.interface';

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private vectorStore: VectorStore | null = null;
  private queryRewriter: QueryRewriter | null = null;
  private documentLoader: DocumentLoader;

  constructor(
    private configService: ConfigService,
    private llmService: LlmService,
  ) {
    this.documentLoader = new DocumentLoader();
  }

  async onModuleInit(): Promise<void> {
    try {
      // 根据 LLM_PROVIDER 选择 Embedding 模型
      const embeddingModel = this.createEmbeddingModel();
      if (!embeddingModel) {
        this.logger.warn('Embedding model not configured, RAG service disabled');
        return;
      }

      this.vectorStore = new SimpleVectorStore(embeddingModel);

      // 初始化查询重写器
      this.queryRewriter = new QueryRewriter(this.llmService.getChatModel());

      // 加载默认文档
      await this.loadDefaultDocuments();

      this.logger.log('RAG Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RAG Service', error);
    }
  }

  /**
   * 根据配置创建 Embedding 模型
   */
  private createEmbeddingModel(): EmbeddingModel | null {
    const provider = this.configService.get<string>('LLM_PROVIDER', 'ollama');

    if (provider === 'ollama') {
      const baseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
      const model = this.configService.get<string>('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text');
      this.logger.log(`Using Ollama embedding model: ${model}`);
      return new OllamaEmbeddingModel(baseUrl, model);
    }

    // DashScope
    const apiKey = this.configService.get<string>('DASHSCOPE_API_KEY');
    if (!apiKey) {
      this.logger.warn('DASHSCOPE_API_KEY not configured');
      return null;
    }
    this.logger.log('Using DashScope embedding model');
    return new DashScopeEmbeddingModel(apiKey);
  }

  /**
   * 加载默认文档
   */
  private async loadDefaultDocuments(): Promise<void> {
    if (!this.vectorStore) return;

    try {
      // 加载恋爱知识文档
      const documentDir = path.join(process.cwd(), 'resources', 'document');
      const documents = await this.documentLoader.loadMarkdownDirectory(documentDir);

      if (documents.length > 0) {
        // 分割文档
        const chunks: Document[] = [];
        for (const doc of documents) {
          const docChunks = this.documentLoader.splitDocument(doc, 500, 50);
          chunks.push(...docChunks);
        }

        await this.vectorStore.add(chunks);
        this.logger.log(`Loaded ${documents.length} documents, ${chunks.length} chunks`);
      }
    } catch (error) {
      this.logger.warn('Failed to load default documents', error);
    }
  }

  /**
   * 搜索相关文档
   */
  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    if (!this.vectorStore) {
      return [];
    }

    // 可选：查询重写
    let searchQuery = query;
    if (this.queryRewriter) {
      searchQuery = await this.queryRewriter.rewrite(query);
      this.logger.log(`Query rewritten: ${query} -> ${searchQuery}`);
    }

    return this.vectorStore.search(searchQuery, topK);
  }

  /**
   * 添加文档到向量存储
   */
  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    await this.vectorStore.add(documents);
  }

  /**
   * 构建 RAG 上下文
   */
  async buildContext(query: string, topK: number = 3): Promise<string> {
    const results = await this.search(query, topK);

    if (results.length === 0) {
      return '';
    }

    const context = results.map((r) => r.document.content).join('\n\n---\n\n');

    return `以下是相关的参考资料：\n\n${context}\n\n请基于以上资料回答用户的问题; `;
  }
}
