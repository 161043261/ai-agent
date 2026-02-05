import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { QueryRewriter } from './query-rewriter';
import { ContextualQueryAugmenter } from './contextual-query-augmenter';
import { KeywordEnricher } from './keyword-enricher';
import { ConfigService } from '@nestjs/config';
import { LlmProvider } from '../config';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { DocumentLoader } from './document-loader';
import { DocumentRetriever } from './document-retriever';
import { BaseMessage } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';

const DOCS_PATH = process.cwd() + './docs/base';

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings!: Embeddings;
  private chatModel!: BaseChatModel;
  private documentLoader!: DocumentLoader;
  private documentRetriever: DocumentRetriever | null = null;
  private queryRewriter: QueryRewriter | null = null;
  private contextualAugmenter: ContextualQueryAugmenter | null = null;
  private keywordEnricher: KeywordEnricher | null = null;
  private initializeSuccess: Promise<boolean> | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const provider = this.configService.get<LlmProvider>(
      'LLM_PROVIDER',
      'ollama',
    );
    if (provider === 'ollama') {
      this.initOllama();
    } else {
      this.initDashscope();
    }
    this.documentLoader = new DocumentLoader({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    this.queryRewriter = new QueryRewriter(this.chatModel);
    this.logger.log('Query rewriter enabled');
    this.contextualAugmenter = new ContextualQueryAugmenter(this.chatModel);
    this.logger.log('Contextual query augmenter enabled');
    this.keywordEnricher = new KeywordEnricher(this.chatModel);
    this.logger.log('Keyword enricher enabled');
  }

  private async ensureInitialized(): Promise<boolean> {
    if (this.initializeSuccess === null) {
      this.initializeSuccess = this.initialize();
    }
    return this.initializeSuccess;
  }

  private async initialize(docsPath: string = DOCS_PATH): Promise<boolean> {
    try {
      const docs = await this.documentLoader.loadAndSplit(docsPath);
      if (docs.length === 0) {
        this.logger.warn('No documents for RAG');
        return false;
      }
      this.vectorStore = await MemoryVectorStore.fromDocuments(
        docs,
        this.embeddings,
      );
      this.documentRetriever = new DocumentRetriever(
        this.vectorStore,
        this.queryRewriter,
        this.contextualAugmenter,
      );
      this.logger.log(`RAG initialized with ${docs.length} chunks`);
      return true;
    } catch (err) {
      this.logger.error('Initialize RAG error:', err);
      return false;
    }
  }

  private initOllama() {
    const baseUrl = this.configService.get<string>(
      'OLLAMA_BASE_URL',
      'http://localhost:11434',
    );
    const embeddingModel = this.configService.get<string>(
      'OLLAMA_EMBEDDING_MODEL',
      'nomic-embed-text',
    );
    const chatModelName = this.configService.get<string>(
      'OLLAMA_CHAT_MODEL',
      'qwen2.5',
    );
    this.embeddings = new OllamaEmbeddings({ baseUrl, model: embeddingModel });
    this.chatModel = new ChatOllama({ baseUrl, model: chatModelName });
    this.logger.log(
      `Ollama initialized: embedding=${embeddingModel}, chat=${chatModelName}`,
    );
  }

  private initDashscope() {
    const apiKey = this.configService.get<string>('DASHSCOPE_API_KEY');
    const embeddingModel = this.configService.get<string>(
      'DASHSCOPE_EMBEDDING_MODEL',
      'text-embedding-v4',
    );
    const chatModelName = this.configService.get<string>(
      'DASHSCOPE_CHAT_MODEL',
      'qwen-plus',
    );
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey || 'mock-key',
      modelName: embeddingModel,
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      },
    });
    this.chatModel = new ChatOpenAI({
      openAIApiKey: apiKey || 'mock-key',
      modelName: chatModelName,
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      },
    });
    this.logger.log(
      `Dashscope initialized: embedding=${embeddingModel}, chat=${chatModelName}`,
    );
  }

  async retrieve(
    query: string,
    chatHistory?: BaseMessage[],
  ): Promise<Document[]> {
    const ok = await this.ensureInitialized();
    if (!ok) {
      return [];
    }
    return this.documentRetriever?.retrieve(query, chatHistory) ?? [];
  }

  async retrieveAsContext(query: string, chatHistory?: BaseMessage[]) {
    const ok = await this.ensureInitialized();
    if (!ok) {
      return '';
    }
    return this.documentRetriever?.retrieveAsContext(query, chatHistory) ?? '';
  }

  async addDocuments(docs: Document[]): Promise<void> {
    const ok = await this.ensureInitialized();
    if (!ok) {
      this.logger.warn('RAG not initialized, cannot add documents');
      return;
    }
    if (this.keywordEnricher) {
      docs = await this.keywordEnricher.enrichDocuments(docs);
    }
    await this.vectorStore!.addDocuments(docs);
    this.logger.log(`Added ${docs.length} documents to vector store`);
  }

  isAvailable(): boolean {
    return this.vectorStore !== null;
  }
}
