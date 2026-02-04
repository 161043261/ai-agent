import { Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from '@langchain/core/messages';

const CONTEXT_AUGMENT_PROMPT = `
  Please generate a more complete and specific query based on the conversation history and the current query.
  Requirements:
  1. Understand the user's true by considering the conversational context.
  2. Supplement the specific content referred to by pronouns
  3. Keep the query concise.
  4. Return only the enhanced query text, without any other content.
`;

export class ContextualQueryAugmenter {
  private readonly logger = new Logger(ContextualQueryAugmenter.name);

  constructor(private chatModel: BaseChatModel) {}
  async augment(
    query: string,
    chatHistory: BaseMessage[],
    maxHistoryTurns: number = 3,
  ) {
    if (chatHistory.length === 0) {
      return query;
    }
    try {
      const { history: recentHistory } = chatHistory.reduceRight<{
        history: BaseMessage[];
        turns: number;
      }>(
        (acc, msg) => {
          if (acc.turns >= maxHistoryTurns) {
            return acc;
          }
          acc.history.unshift(msg);
          if (msg.type === 'human') {
            acc.turns++;
          }
          return acc;
        },
        { history: [], turns: 0 },
      );
      const contextPrompt = this.buildContextPrompt(recentHistory, query);
      const { content } = await this.chatModel.invoke([
        new SystemMessage(CONTEXT_AUGMENT_PROMPT),
        new HumanMessage(contextPrompt),
      ]);
      const augmentedQuery = (
        typeof content === 'string' ? content : JSON.stringify(content)
      ).trim();
      if (augmentedQuery.length > 0) {
        this.logger.log(`Query augmented: "${query}" -> "${augmentedQuery}"`);
        return augmentedQuery;
      } else {
        return query;
      }
    } catch (err) {
      this.logger.warn('Query augmentation error, using original query:', err);
      return query;
    }
  }

  buildContextPrompt(history: BaseMessage[], currentQuery: string) {
    const historyText = history
      .map(
        ({ type, content }) =>
          `${type}: ${typeof content === 'string' ? content : JSON.stringify(content)}`,
      )
      .join('\n');
    return `
      conversation history:
      ${historyText}

      current query:
      ${currentQuery}

      Please rewrite the current query into a more complete and specific query based on the conversation history
    `;
  }
}
