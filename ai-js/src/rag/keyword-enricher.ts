import { Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';

const KEYWORD_EXTRACT_PROMPT = `
  Please extract keywords from the following text.
  Requirements:
  1. The keywords should represent the core concepts of the text.
  2. Include proper nouns and technical terms.
  3. Return the keywords in a JSON array format, for example: ["keyword1", "keyword2"].
  4. Only return the JSON array, without any other content.
`;

export class KeywordEnricher {
  private readonly logger = new Logger(KeywordEnricher.name);
  constructor(private chatModel: BaseChatModel) {}

  async enrichDocuments(documents: Document[]): Promise<Document[]> {
    const enrichedDocs: Document[] = [];
    for (const doc of documents) {
      try {
        const keywords = await this.extractKeywords(doc.pageContent);
        enrichedDocs.push(
          new Document({
            pageContent: doc.pageContent,
            metadata: {
              ...doc.metadata,
              keywords,
            },
          }),
        );
        this.logger.debug(`Enriched document with ${keywords.length} keywords`);
      } catch (err) {
        this.logger.warn('Enrich document error, keep original:', err);
      }
    }
    return enrichedDocs;
  }

  private async extractKeywords(content: string): Promise<string[]> {
    const response = await this.chatModel.invoke([
      new SystemMessage(KEYWORD_EXTRACT_PROMPT),
      new HumanMessage(
        `Please extract keywords from the following text: \n\n${content}`,
      ),
    ]);
    const responseText =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(responseText.trim());
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string');
      }
      return [];
    } catch {
      return [];
    }
  }
}
