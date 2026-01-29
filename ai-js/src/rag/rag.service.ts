import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { VectorStore, SearchResult, Document, SearchOptions } from './vector-store.interface';
import { SimpleVectorStore } from './simple-vector-store';
import { DashScopeEmbeddingModel } from './dashscope-embedding-model';
import { OllamaEmbeddingModel } from './ollama-embedding-model';
import { DocumentLoader } from './document-loader';
import { QueryRewriter } from './query-rewriter';
import { KeywordEnricher } from './keyword-enricher';
import { MultiQueryExpander } from './multi-query-expander';
import { ContextualQueryAugmenter } from './contextual-query-augmenter';
import { TokenTextSplitter, SplitMode } from './token-text-splitter';
import { LlmService } from '../llm/llm.service';
import { EmbeddingModel } from './embedding-model.interface';
import { Message } from '../agent/model/message.interface';
import { FilterExpression, FilterExpressionBuilder } from './filter-expression';
import { DocumentRetriever } from './document-retriever';

/**
 * RAG 服务配置
 */
export interface RagServiceConfig {
  /** 是否启用查询重写 */
  enableQueryRewrite?: boolean;
  /** 是否启用多查询扩展 */
  enableMultiQuery?: boolean;
  /** 多查询扩展数量 */
  multiQueryCount?: number;
  /** 是否启用上下文增强 */
  enableContextualAugment?: boolean;
  /** 是否启用关键词丰富 */
  enableKeywordEnrich?: boolean;
  /** 分割模式 */
  splitMode?: SplitMode;
  /** 块大小 */
  chunkSize?: number;
  /** 块重叠 */
  chunkOverlap?: number;
}

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private vectorStore: VectorStore | null = null;
  private queryRewriter: QueryRewriter | null = null;
  private keywordEnricher: KeywordEnricher | null = null;
  private multiQueryExpander: MultiQueryExpander | null = null;
  private contextualAugmenter: ContextualQueryAugmenter | null = null;
  private textSplitter: TokenTextSplitter;
  private documentLoader: DocumentLoader;
  private config: Required<RagServiceConfig>;

  constructor(
    private configService: ConfigService,
    private llmService: LlmService,
  ) {
    this.documentLoader = new DocumentLoader();
    this.config = this.loadConfig();
    this.textSplitter = this.createTextSplitter();
  }

  /**
   * 加载配置
   */
  private loadConfig(): Required<RagServiceConfig> {
    return {
      enableQueryRewrite: this.configService.get<boolean>('RAG_ENABLE_QUERY_REWRITE', true),
      enableMultiQuery: this.configService.get<boolean>('RAG_ENABLE_MULTI_QUERY', false),
      multiQueryCount: this.configService.get<number>('RAG_MULTI_QUERY_COUNT', 3),
      enableContextualAugment: this.configService.get<boolean>(
        'RAG_ENABLE_CONTEXTUAL_AUGMENT',
        true,
      ),
      enableKeywordEnrich: this.configService.get<boolean>('RAG_ENABLE_KEYWORD_ENRICH', false),
      splitMode:
        (this.configService.get<string>('RAG_SPLIT_MODE', 'recursive') as SplitMode) ||
        SplitMode.RECURSIVE,
      chunkSize: this.configService.get<number>('RAG_CHUNK_SIZE', 500),
      chunkOverlap: this.configService.get<number>('RAG_CHUNK_OVERLAP', 50),
    };
  }

  /**
   * 创建文本分割器
   */
  private createTextSplitter(): TokenTextSplitter {
    return TokenTextSplitter.builder()
      .withMode(this.config.splitMode)
      .withChunkSize(this.config.chunkSize)
      .withChunkOverlap(this.config.chunkOverlap)
      .build();
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

      // 获取 ChatModel
      const chatModel = this.llmService.getChatModel();

      // 初始化查询重写器
      if (this.config.enableQueryRewrite) {
        this.queryRewriter = new QueryRewriter(chatModel);
        this.logger.log('Query rewriter enabled');
      }

      // 初始化关键词丰富器
      if (this.config.enableKeywordEnrich) {
        this.keywordEnricher = new KeywordEnricher(chatModel);
        this.logger.log('Keyword enricher enabled');
      }

      // 初始化多查询扩展器
      if (this.config.enableMultiQuery) {
        this.multiQueryExpander = new MultiQueryExpander(chatModel);
        this.logger.log('Multi-query expander enabled');
      }

      // 初始化上下文增强器
      if (this.config.enableContextualAugment) {
        this.contextualAugmenter = new ContextualQueryAugmenter(chatModel);
        this.logger.log('Contextual query augmenter enabled');
      }

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
        // 使用新的文本分割器分割文档
        const chunks = this.textSplitter.splitDocuments(documents);

        // 可选：关键词丰富
        let enrichedChunks = chunks;
        if (this.keywordEnricher) {
          this.logger.log('Enriching documents with keywords...');
          enrichedChunks = await this.keywordEnricher.enrichDocuments(chunks);
        }

        await this.vectorStore.add(enrichedChunks);
        this.logger.log(`Loaded ${documents.length} documents, ${enrichedChunks.length} chunks`);
      }
    } catch (error) {
      this.logger.warn('Failed to load default documents', error);
    }
  }

  /**
   * 搜索相关文档
   * @param query 查询文本
   * @param topK 返回结果数量
   * @param conversationHistory 对话历史（用于上下文增强）
   */
  async search(
    query: string,
    topK: number = 5,
    conversationHistory?: Message[],
  ): Promise<SearchResult[]> {
    if (!this.vectorStore) {
      return [];
    }

    let searchQuery = query;

    // 1. 上下文增强
    if (this.contextualAugmenter && conversationHistory && conversationHistory.length > 0) {
      searchQuery = await this.contextualAugmenter.augment(searchQuery, conversationHistory);
      this.logger.log(`Query contextually augmented: ${query} -> ${searchQuery}`);
    }

    // 2. 查询重写
    if (this.queryRewriter) {
      searchQuery = await this.queryRewriter.rewrite(searchQuery);
      this.logger.log(`Query rewritten: ${query} -> ${searchQuery}`);
    }

    // 3. 多查询扩展
    if (this.multiQueryExpander) {
      const expandedQueries = await this.multiQueryExpander.expand(
        searchQuery,
        this.config.multiQueryCount,
      );
      this.logger.log(`Query expanded to ${expandedQueries.length} queries`);

      // 对每个查询执行搜索
      const allResults: SearchResult[][] = [];
      for (const q of expandedQueries) {
        const results = await this.vectorStore.search(q, topK);
        allResults.push(results);
      }

      // 合并结果
      return this.multiQueryExpander.mergeResults(allResults, topK);
    }

    // 单查询搜索
    return this.vectorStore.search(searchQuery, topK);
  }

  /**
   * 添加文档到向量存储
   */
  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    // 分割文档
    const chunks = this.textSplitter.splitDocuments(documents);

    // 可选：关键词丰富
    let enrichedChunks = chunks;
    if (this.keywordEnricher) {
      enrichedChunks = await this.keywordEnricher.enrichDocuments(chunks);
    }

    await this.vectorStore.add(enrichedChunks);
  }

  /**
   * 构建 RAG 上下文
   * @param query 查询文本
   * @param topK 返回结果数量
   * @param conversationHistory 对话历史
   */
  async buildContext(
    query: string,
    topK: number = 3,
    conversationHistory?: Message[],
  ): Promise<string> {
    const results = await this.search(query, topK, conversationHistory);

    if (results.length === 0) {
      return '';
    }

    const context = results.map((r) => r.document.content).join('\n\n---\n\n');

    return `以下是相关的参考资料：\n\n${context}\n\n请基于以上资料回答用户的问题; `;
  }

  /**
   * 获取当前配置
   */
  getConfig(): RagServiceConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<RagServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 如果分割配置改变，重新创建分割器
    if (newConfig.splitMode || newConfig.chunkSize || newConfig.chunkOverlap) {
      this.textSplitter = this.createTextSplitter();
    }
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return this.vectorStore !== null;
  }

  /**
   * 带过滤条件的搜索
   * @param query 查询文本
   * @param options 搜索选项（包含过滤表达式、相似度阈值等）
   * @param conversationHistory 对话历史
   */
  async searchWithFilter(
    query: string,
    options: SearchOptions,
    conversationHistory?: Message[],
  ): Promise<SearchResult[]> {
    if (!this.vectorStore) {
      return [];
    }

    let searchQuery = query;

    // 1. 上下文增强
    if (this.contextualAugmenter && conversationHistory && conversationHistory.length > 0) {
      searchQuery = await this.contextualAugmenter.augment(searchQuery, conversationHistory);
    }

    // 2. 查询重写
    if (this.queryRewriter) {
      searchQuery = await this.queryRewriter.rewrite(searchQuery);
    }

    // 使用带选项的搜索
    if (this.vectorStore.searchWithOptions) {
      return this.vectorStore.searchWithOptions(searchQuery, options);
    }

    // 回退到基本搜索
    return this.vectorStore.search(searchQuery, options.topK);
  }

  /**
   * 创建带过滤的文档检索器
   * @param filterExpression 过滤表达式
   * @param similarityThreshold 相似度阈值
   * @param topK 返回数量
   */
  createFilteredRetriever(
    filterExpression?: FilterExpression,
    similarityThreshold: number = 0.5,
    topK: number = 3,
  ): DocumentRetriever | null {
    if (!this.vectorStore) {
      return null;
    }

    return DocumentRetriever.builder()
      .vectorStore(this.vectorStore)
      .filterExpression(filterExpression!)
      .similarityThreshold(similarityThreshold)
      .topK(topK)
      .build();
  }

  /**
   * 创建过滤表达式构建器
   */
  createFilterBuilder(): FilterExpressionBuilder {
    return new FilterExpressionBuilder();
  }

  /**
   * 获取向量存储实例（用于高级操作）
   */
  getVectorStore(): VectorStore | null {
    return this.vectorStore;
  }
}
