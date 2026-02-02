import { Injectable, Logger } from '@nestjs/common';
import { ChatRequest, ChatResponse } from '../llm/chat-model';

export interface Advisor {
  name: string;
  order: number;

  before?(request: ChatRequest): ChatRequest;
  after?(response: ChatResponse): ChatResponse;
}

export interface StreamAdvisor extends Advisor {
  afterStream?(chunk: string): string;
}

@Injectable()
export class LoggerAdvisor implements Advisor, StreamAdvisor {
  private readonly logger = new Logger(LoggerAdvisor.name);

  name: string;
  order: number;

  before?(request: ChatRequest): ChatRequest {
    const userMessages = request.messages.filter(
      (item) => item.role === 'user',
    );
    if (userMessages.length > 0) {
      const content = userMessages.map((item) => item.content).join(',');
      this.logger.log(`AI request: ${content.substring(0, 228)}...`);
    }
    return request;
  }

  after?(response: ChatResponse): ChatResponse {
    if (response.content) {
      this.logger.log(`AI response: ${response.content.substring(0, 228)}...`);
    }
    if (response.toolCalls && response.toolCalls.length > 0) {
      this.logger.log(
        `Tool calls: ${response.toolCalls.map((item) => item.name).join(',')}`,
      );
    }
    return response;
  }

  afterStream?(chunk: string): string {
    // throw new Error('Method not implemented.');
    return chunk;
  }
}
