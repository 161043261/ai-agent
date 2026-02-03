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
    const userMessage = request.messageList.find(
      (item) => item.role === 'user',
    );
    if (!userMessage) {
      return request;
    }
    const { content } = userMessage;
    if (!content) {
      return request;
    }
    this.logger.log(`AI request: ${content}`);
    return request;
  }

  after?(response: ChatResponse): ChatResponse {
    const { content, toolCallList } = response;
    if (!content) {
      return response;
    }
    this.logger.log(`AI response: ${content}`);
    if (toolCallList && toolCallList.length > 0) {
      this.logger.log(
        `Tool calls: ${toolCallList.map((item) => item.name).join(',')}`,
      );
    }
    return response;
  }

  afterStream?(chunk: string): string {
    return chunk;
  }
}

// Re-Reading Improves Reasoning in Large Language Models
export class ReReadingAdvisor implements Advisor {
  private readonly logger = new Logger(ReReadingAdvisor.name);

  name = ReReadingAdvisor.name;
  order = 1;

  before(request: ChatRequest): ChatRequest {
    const { messageList } = request;
    const userMessageIdx = messageList.findIndex(
      (item) => item.role === 'user',
    );
    if (userMessageIdx === -1) {
      return request;
    }
    const userText = messageList[userMessageIdx].content;
    const newUserText = `${userText}\nRead the question again: ${userText}`;
    messageList[userMessageIdx] = {
      ...messageList[userMessageIdx],
      content: newUserText,
    };
    this.logger.debug(`Re2 enhanced prompt: ${newUserText}`);
    return request;
  }
}

@Injectable()
export class AdvisorChain {
  // private readonly logger = new Logger(AdvisorChain.name);
  private advisors: Advisor[] = [];
  private streamAdvisors: StreamAdvisor[] = [];

  constructor() {
    const loggerAdvisor = new LoggerAdvisor();
    const reReadingAdvisor = new ReReadingAdvisor();

    this.advisors = [loggerAdvisor, reReadingAdvisor];
    this.advisors.sort((a, b) => a.order - b.order);
    this.streamAdvisors = [loggerAdvisor];
  }

  register(advisor: Advisor) {
    this.advisors.push(advisor);
    this.advisors.sort((a, b) => a.order - b.order);
  }

  public isStreamAdvisor(advisor: Advisor): advisor is StreamAdvisor {
    return 'afterStream' in advisor;
  }

  getAllAdvisors(): Advisor[] {
    return this.advisors;
  }

  applyBefore(request: ChatRequest): ChatRequest {
    for (const advisor of this.advisors) {
      if (advisor.before) {
        request = advisor.before(request);
      }
    }
    return request;
  }

  applyAfter(response: ChatResponse): ChatResponse {
    for (const advisor of this.advisors) {
      if (advisor.after) {
        response = advisor.after(response);
      }
    }
    return response;
  }

  applyAfterStream(chunk: string): string {
    for (const advisor of this.streamAdvisors) {
      if (advisor.afterStream) {
        chunk = advisor.afterStream(chunk);
      }
    }
    return chunk;
  }
}
