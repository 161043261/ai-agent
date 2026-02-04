import { Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const REWRITE_PROMPT = `
  Please rewrite the user's query into a more suitable format for searching.
  Requirements:
  1. Maintain the original meaning.
  2. Expand keywords.
  3. Remove colloquial expressions.
  4. Output only the rewritten query, without any other content.
`;

export class QueryRewriter {
  private readonly logger = new Logger(QueryRewriter.name);
  constructor(private chatModel: BaseChatModel) {}

  async rewrite(query: string): Promise<string> {
    try {
      const response = await this.chatModel.invoke([
        new SystemMessage(REWRITE_PROMPT),
        new HumanMessage(query),
      ]);

      const rewritten = (response.content as string).trim();
      if (rewritten && rewritten !== query) {
        this.logger.debug(`Query rewritten: "${query}" -> "${rewritten}"`);
        return rewritten;
      }
      return query;
    } catch (err) {
      this.logger.warn('Query rewrite error, using original query:', err);
      return query;
    }
  }
}
