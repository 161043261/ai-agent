import { Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';

const KEYWORD_EXTRACT_PROMPT = `
  Please extract 5-10 keywords from the following text
  Requirements:
  1. The keywords should represent the core concepts of the text
  2. Include proper nouns and technical terms
  3. Return the keywords in a JSON array format, for example: ["keyword1", "keyword2"]
  4. Only return the JSON array, without any other content
`;

export class KeywordEnricher {
  private readonly logger = new Logger(KeywordEnricher.name);
  constructor(private chatModel: BaseChatModel) {}
}
