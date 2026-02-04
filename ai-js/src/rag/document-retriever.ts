import { VectorStore } from '@langchain/core/vectorstores';
import { Logger } from '@nestjs/common';
import { QueryRewriter } from './query-rewriter';
import { ContextualQueryAugmenter } from './contextual-query-augmenter';
import { BaseMessage } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';

export interface DocumentRetrieverConfig {
  maxResults: number;
  minScore: number;
}

export class DocumentRetriever {
  private readonly logger = new Logger(DocumentRetriever.name);
  private readonly config: Required<DocumentRetrieverConfig>;

  constructor(
    private readonly vectorStore: VectorStore,
    private readonly queryRewriter: QueryRewriter | null = null,
    private readonly contextualAugmenter: ContextualQueryAugmenter | null = null,
    config: Partial<DocumentRetrieverConfig> = {},
  ) {
    this.config = {
      maxResults: config.maxResults ?? 5,
      minScore: config.minScore ?? 0.75,
    };
  }

  async retrieve(
    query: string,
    chatHistory: BaseMessage[] = [],
  ): Promise<Document[]> {
    let oldQuery = query;
    if (this.contextualAugmenter && chatHistory.length) {
      query = await this.contextualAugmenter.augment(query, chatHistory);
      if (query !== oldQuery) {
        oldQuery = query;
        this.logger.debug(`Query augmented: "${oldQuery}" -> "${query}"`);
      }
    }
    if (this.queryRewriter) {
      query = await this.queryRewriter.rewrite(query);
      if (query !== oldQuery) {
        this.logger.debug(`Query rewritten: "${oldQuery}" -> "${query}"`);
      }
    }
    try {
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        this.config.maxResults,
      );
      const filteredResults = results
        .filter(([, score]) => score >= this.config.minScore)
        .map(([doc]) => doc);
      this.logger.debug(
        `Retrieved ${filteredResults.length} documents for query: "${query}"`,
      );
      return filteredResults;
    } catch (err) {
      this.logger.error('Retrieval error:', err);
      return [];
    }
  }

  async retrieveAsContext(query: string, chatHistory: BaseMessage[] = []) {
    const docs = await this.retrieve(query, chatHistory);
    if (docs.length === 0) {
      return '';
    }
    const queryWithContext = docs.map((doc) => doc.pageContent).join('\n\n');
    return `The following are relevant reference documents:
      ${queryWithContext}`;
  }
}
