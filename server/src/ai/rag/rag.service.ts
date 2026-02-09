import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OllamaEmbeddings } from '@langchain/ollama';
import { Embeddings } from '@langchain/core/embeddings';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { join } from 'path';
import { existsSync, readdirSync } from 'node:fs';
import { readFileSync } from 'fs';

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: Embeddings;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const provider = this.configService.get<string>('LLM_PROVIDER', 'ollama');
    if (provider === 'ollama') {
      this.initOllamaEmbeddings();
    } else {
      this.initDashScopeEmbeddings();
    }
  }

  private initOllamaEmbeddings() {
    const baseUrl = this.configService.get<string>(
      'OLLAMA_BASE_URL',
      'http://localhost:11434',
    );
    const embeddingModel = this.configService.get<string>(
      'OLLAMA_EMBEDDING_MODEL',
      'nomic-embed-text',
    );
    this.embeddings = new OllamaEmbeddings({
      baseUrl,
      model: embeddingModel,
    });
    this.logger.log(
      `Ollama embedding initialized: ${embeddingModel} at ${baseUrl}`,
    );
  }

  private initDashScopeEmbeddings() {
    const apiKey = this.configService.get<string>('DASHSCOPE_API_KEY');
    const embeddingModel = this.configService.get<string>(
      'DASHSCOPE_EMBEDDING_MODEL',
      'text-embedding-v4',
    );
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey || 'mock-key',
      modelName: embeddingModel,
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      },
    });
    this.logger.log(`DashScope embedding initialized: ${embeddingModel}`);
  }

  async init() {
    try {
      const docsPath = join(process.cwd(), './resources/docs/base');
      const docs = this.loadDocuments(docsPath);
      if (docs.length === 0) {
        this.logger.warn('No documents for RAG');
        return;
      }

      // Split documents
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const splitDocs = await splitter.splitDocuments(docs);
      // Transform: add file name to content for better search
      const transformedDocs = splitDocs.map((doc) => {
        const filename =
          String(doc.metadata.source)?.split('/').pop() || 'unknown';
        return new Document({
          pageContent: `${filename}\n${doc.pageContent}`,
          metadata: doc.metadata,
        });
      });
      // Create vector store
      this.vectorStore = await MemoryVectorStore.fromDocuments(
        transformedDocs,
        this.embeddings,
      );

      this.logger.log(
        `RAG initialized with ${transformedDocs.length} chunks from ${docs.length} documents`,
      );
    } catch (err) {
      this.logger.error('Failed to initialize RAG:', err);
    }
  }

  private loadDocuments(docsPath: string): Document[] {
    const documents: Document[] = [];
    if (!existsSync(docsPath)) {
      this.logger.warn(`Documents path not found: ${docsPath}`);
      return documents;
    }
    const files = readdirSync(docsPath);
    for (const file of files) {
      if (file.endsWith('.md') || file.endsWith('.txt')) {
        const filepath = join(docsPath, file);
        try {
          const content = readFileSync(filepath, 'utf-8');
          documents.push(
            new Document({
              pageContent: content,
              metadata: {
                source: filepath,
                file_name: file,
              },
            }),
          );
          this.logger.debug(`Loaded document: ${file}`);
        } catch (err) {
          this.logger.error(`Failed to load ${file}:`, err);
        }
      }
    }
    return documents;
  }

  async retrieve(
    query: string,
    maxResults = 5,
    minScore = 0.75,
  ): Promise<Document[]> {
    if (!this.vectorStore) {
      return [];
    }
    try {
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        maxResults,
      );
      // Filter by minimum score
      const filteredResults = results
        .filter(([, score]) => score >= minScore)
        .map(([doc]) => doc);

      this.logger.debug(`Retrieved ${filteredResults.length} documents`);
      return filteredResults;
    } catch (err) {
      this.logger.error('Retrieval error:', err);
      return [];
    }
  }

  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.vectorStore) {
      this.logger.warn('Vector store not initialized');
      return;
    }
    await this.vectorStore.addDocuments(documents);
    this.logger.log(`Added ${documents.length} documents to vector store`);
  }
}
