import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import Sqlite3, { Database } from 'better-sqlite3';
import { ConfigService } from '@nestjs/config';
import { OllamaEmbeddings } from '@langchain/ollama';
import { OpenAIEmbeddings } from '@langchain/openai';
import { dirname, join } from 'path';
import { existsSync, readdirSync } from 'node:fs';
import { mkdirSync, readFileSync } from 'fs';

interface StoredDocument {
  id: string;
  content: string;
  metadata: string;
  embedding: string;
}

@Injectable()
export class VectorStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VectorStoreService.name);
  private embeddings: Embeddings;
  private db: Database | null = null;
  private dbPath: string;
  private sqlSnippets: string[] = [];

  constructor(private readonly configService: ConfigService) {
    this.logger.debug('Current working directory:', process.cwd());
    const sql1 = readFileSync(join(process.cwd(), './sql/1.sql'), 'utf-8');
    const sql2 = readFileSync(join(process.cwd(), './sql/2.sql'), 'utf-8');
    this.sqlSnippets.push(sql1, sql2);
    this.logger.warn(
      "'vector-store.service' is DEPRECATED, use 'rag.service' instead",
    );
  }

  async onModuleInit() {
    const provider = this.configService.get<string>('LLM_PROVIDER', 'ollama');
    this.dbPath = this.configService.get<string>(
      'VECTOR_DB_PATH',
      join(process.cwd(), './data/vectors.db'),
    );

    if (provider === 'ollama') {
      this.initOllamaEmbeddings();
    } else {
      this.initDashScopeEmbeddings();
    }
    await this.initDatabase();
  }

  onModuleDestroy() {
    if (this.db) {
      this.db.close();
      this.db = null;
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
      openAIApiKey: apiKey,
      modelName: embeddingModel,
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      },
    });
    this.logger.log(`DashScope embedding initialized: ${embeddingModel}`);
  }

  private async initDatabase() {
    try {
      const dir = dirname(this.dbPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      this.db = new Sqlite3(this.dbPath);
      this.db.exec(this.sqlSnippets[0]);

      // Create index
      this.db.exec(
        'CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at);',
      );

      this.loadDocumentsFromDirectory(
        join(process.cwd(), './resources/docs/base'),
      );

      const { count } = this.db
        .prepare('SELECT COUNT(*) as count FROM documents;')
        .get() as { count: number };
      this.logger.log(`Vector database initialized with ${count} documents`);
    } catch (err) {
      this.logger.log('Failed to initialize database:', err);
      this.db = new Sqlite3(':memory:');
      this.db.exec(this.sqlSnippets[1]);
      this.logger.warn('Fallback to memory database');
    }
  }

  async loadDocumentsFromDirectory(docsPath: string): Promise<number> {
    if (!existsSync(docsPath)) {
      this.logger.warn('Documents directory not found:', docsPath);
      return 0;
    }
    const docs: Document[] = [];
    const files = readdirSync(docsPath);
    // this.logger.debug(`Load documents ${files.join(",")} from directory ${docsPath}`)
    for (const file of files) {
      if (file.endsWith('.md') || file.endsWith('.txt')) {
        const filePath = join(docsPath, file);
        try {
          const content = readFileSync(filePath, 'utf-8');
          docs.push(
            new Document({
              pageContent: content,
              metadata: {
                source: filePath,
                file_name: file,
              },
            }),
          );
        } catch (err) {
          this.logger.warn(`Failed to load ${file}:`, err);
        }
      }
    }
    if (docs.length === 0) {
      return 0;
    }
    // Split documents
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await splitter.splitDocuments(docs);
    // Transform: add file name to content for better search
    const transformedDocs = splitDocs.map((doc) => {
      const filename = doc.metadata.file_name ?? 'unknown';
      return new Document({
        pageContent: `${filename}\n${doc.pageContent}`,
        metadata: doc.metadata,
      });
    });

    await this.addDocuments(transformedDocs);
    this.logger.log(
      `Loaded ${transformedDocs.length} chucks from ${docs.length} documents`,
    );
    return transformedDocs.length;
  }

  async addDocuments(documents: Document[]) {
    if (!this.db || documents.length === 0) {
      return;
    }
    const texts = documents.map((doc) => doc.pageContent);
    const embeddings = await this.embeddings.embedDocuments(texts);
    const stmt = this.db.prepare(
      'INSERT INTO documents (content, metadata, embedding) VALUES (?, ?, ?)',
    );
    const insertMany = this.db.transaction(
      (docs: Document[], embeddings: number[][]) => {
        for (let i = 0; i < docs.length; i++) {
          stmt.run(
            docs[i].pageContent,
            JSON.stringify(docs[i].metadata),
            JSON.stringify(embeddings[i]),
          );
        }
      },
    );
    insertMany(documents, embeddings);
    this.logger.log(`Added ${documents.length} documents to vector store`);
  }

  // 相似度搜索
  async similaritySearch(
    query: string,
    maxResults = 5,
    minScore = 0.75,
  ): Promise<Document[]> {
    if (!this.db) {
      return [];
    }
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const rows = this.db
        .prepare('SELECT * FROM documents')
        .all() as StoredDocument[];
      if (rows.length === 0) {
        return [];
      }
      const results: { doc: Document; score: number }[] = [];
      for (const row of rows) {
        const docEmbedding = JSON.parse(row.embedding) as number[];
        const score = this.cosineSimilarity(queryEmbedding, docEmbedding);
        if (score > minScore) {
          results.push({
            doc: new Document({
              pageContent: row.content,
              metadata: JSON.parse(row.metadata ?? '{}'),
            }),
            score,
          });
        }
      }
      results.sort((a, b) => b.score - a.score);
      const topResults = results.slice(0, maxResults).map((item) => item.doc);
      this.logger.debug(`Found ${topResults.length} documents`);
      return topResults;
    } catch (err) {
      this.logger.error('Similarity search failed:', err);
      return [];
    }
  }

  async similaritySearchWithScore(
    query: string,
    maxResults = 5,
  ): Promise<[doc: Document, score: number][]> {
    if (!this.db) {
      return [];
    }
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const rows = this.db
        .prepare('SELECT * FROM documents')
        .all() as StoredDocument[];
      if (rows.length === 0) {
        return [];
      }
      const results: [doc: Document, score: number][] = [];
      for (const row of rows) {
        const docEmbedding = JSON.parse(row.embedding) as number[];
        const score = this.cosineSimilarity(queryEmbedding, docEmbedding);
        results.push([
          new Document({
            pageContent: row.content,
            metadata: JSON.parse(row.metadata ?? '{}'),
          }),
          score,
        ]);
      }
      results.sort((a, b) => b[1] - a[1]);
      return results.slice(0, maxResults);
    } catch (err) {
      this.logger.error('Similarity search with score failed:', err);
      return [];
    }
  }

  // 计算余弦相似度
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) {
      return 0;
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async clear(): Promise<void> {
    if (!this.db) {
      return;
    }
    this.db.exec('DELETE FROM documents');
    this.logger.log('Vector store cleared');
  }

  getDocumentCount(): number {
    if (!this.db) {
      return 0;
    }
    const result = this.db
      .prepare('SELECT COUNT(*) as count FROM documents')
      .get() as { count: number };
    return result.count;
  }
}
