import { Logger } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface DocumentLoaderConfig {
  chunkSize: number;
  chunkOverlap: number;
  unshiftFilename: boolean;
}

export class DocumentLoader {
  private readonly logger = new Logger(DocumentLoader.name);
  private readonly config: Required<DocumentLoaderConfig>;

  constructor(config: Partial<DocumentLoaderConfig> = {}) {
    this.config = {
      chunkSize: config.chunkSize ?? 1000,
      chunkOverlap: config.chunkOverlap ?? 200,
      unshiftFilename: config.unshiftFilename ?? true,
    };
  }

  async loadAndSplit(docsPath: string): Promise<Document[]> {
    const docs = this.loadFromDirectory(docsPath);
    if (docs.length === 0) {
      return [];
    }
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
    });
    const splitDocs = await splitter.splitDocuments(docs);
    if (this.config.unshiftFilename) {
      return splitDocs.map((doc: Document) => {
        const filename =
          String(doc.metadata.source).split('/').pop() || 'unknown';
        return new Document({
          pageContent: `${filename}\n${doc.pageContent}`,
          metadata: doc.metadata,
        });
      });
    }
    return splitDocs;
  }

  loadFromDirectory(docsPath: string): Document[] {
    const documents: Document[] = [];
    if (!existsSync(docsPath)) {
      this.logger.warn(`Documents path not found: ${docsPath}`);
      return documents;
    }
    const files = readdirSync(docsPath);
    for (const file of files) {
      if (['.md', '.txt', '.json'].some((ext) => file.endsWith(ext))) {
        const filepath = join(docsPath, file);
        try {
          const content = readFileSync(filepath, 'utf-8');
          documents.push(
            new Document({
              pageContent: content,
              metadata: { source: filepath, file_name: file },
            }),
          );
          this.logger.debug(`Loaded document: ${file}`);
        } catch (err) {
          this.logger.error(`Failed to load ${file}:`, err);
        }
      }
    }
    this.logger.log(`Loaded ${documents.length} documents from ${docsPath}`);
    return documents;
  }

  loadFromFile(filepath: string): Document | null {
    if (!existsSync(filepath)) {
      this.logger.warn(`File not found: ${filepath}`);
      return null;
    }
    try {
      const content = readFileSync(filepath, 'utf-8');
      const filename = filepath.split('/').pop() || 'unknown';
      return new Document({
        pageContent: content,
        metadata: { source: filepath, file_name: filename },
      });
    } catch (err) {
      this.logger.error(`Failed to load file ${filepath}:`, err);
      return null;
    }
  }
}
