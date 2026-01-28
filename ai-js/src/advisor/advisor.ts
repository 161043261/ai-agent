import { Injectable, Logger } from '@nestjs/common';
import { ChatRequest, ChatResponse } from '../llm/chat-model.interface';

/**
 * Advisor 接口 - 用于在 LLM 调用前后进行拦截处理
 */
export interface Advisor {
  name: string;
  order: number;

  /**
   * 请求前处理
   */
  before?(request: ChatRequest): ChatRequest;

  /**
   * 响应后处理
   */
  after?(response: ChatResponse): ChatResponse;
}

/**
 * 流式 Advisor 接口 - 支持流式响应的拦截
 */
export interface StreamAdvisor extends Advisor {
  /**
   * 流式响应处理
   */
  afterStream?(chunk: string): string;
}

/**
 * 日志 Advisor - 记录 AI 请求和响应日志
 */
@Injectable()
export class LoggerAdvisor implements Advisor, StreamAdvisor {
  private readonly logger = new Logger(LoggerAdvisor.name);

  name = 'LoggerAdvisor';
  order = 0;

  before(request: ChatRequest): ChatRequest {
    const userMessage = request.messages.find((m) => m.role === 'user');
    if (userMessage) {
      const content =
        typeof userMessage.content === 'string'
          ? userMessage.content
          : JSON.stringify(userMessage.content);
      this.logger.log(`AI Request: ${content.substring(0, 200)}...`);
    }
    return request;
  }

  after(response: ChatResponse): ChatResponse {
    if (response.content) {
      this.logger.log(`AI Response: ${response.content.substring(0, 200)}...`);
    }
    if (response.toolCalls && response.toolCalls.length > 0) {
      this.logger.log(`Tool Calls: ${response.toolCalls.map((t) => t.name).join(', ')}`);
    }
    return response;
  }

  afterStream(chunk: string): string {
    // 流式模式下不记录每个 chunk，避免日志过多
    return chunk;
  }
}

/**
 * Re2 (Re-Reading) Advisor - 通过重复阅读问题来提高推理能力
 * 参考论文: "Re-Reading Improves Reasoning in Language Models"
 */
@Injectable()
export class ReReadingAdvisor implements Advisor {
  private readonly logger = new Logger(ReReadingAdvisor.name);

  name = 'ReReadingAdvisor';
  order = 1;

  before(request: ChatRequest): ChatRequest {
    const messages = [...request.messages];
    const userMessageIndex = messages.findIndex((m) => m.role === 'user');

    if (userMessageIndex !== -1) {
      const originalText = messages[userMessageIndex].content;
      if (typeof originalText === 'string') {
        // 修改用户提示词，添加重复阅读指令
        const newText = `${originalText}\nRead the question again: ${originalText}`;
        messages[userMessageIndex] = {
          ...messages[userMessageIndex],
          content: newText,
        };
        this.logger.debug(`Re2 enhanced prompt: ${newText.substring(0, 100)}...`);
      }
    }

    return {
      ...request,
      messages,
    };
  }
}

/**
 * Advisor 链 - 管理和执行多个 Advisor
 */
@Injectable()
export class AdvisorChain {
  private readonly logger = new Logger(AdvisorChain.name);
  private advisors: Advisor[] = [];
  private streamAdvisors: StreamAdvisor[] = [];

  constructor() {
    // 默认注册的 Advisor
    const loggerAdvisor = new LoggerAdvisor();
    const reReadingAdvisor = new ReReadingAdvisor();

    this.advisors = [loggerAdvisor, reReadingAdvisor];
    this.advisors.sort((a, b) => a.order - b.order);

    // 只有 LoggerAdvisor 支持流式处理
    this.streamAdvisors = [loggerAdvisor];
  }

  /**
   * 注册 Advisor
   */
  register(advisor: Advisor): void {
    this.advisors.push(advisor);
    this.advisors.sort((a, b) => a.order - b.order);

    if (this.isStreamAdvisor(advisor)) {
      this.streamAdvisors.push(advisor);
      this.streamAdvisors.sort((a, b) => a.order - b.order);
    }

    this.logger.log(`Registered advisor: ${advisor.name}`);
  }

  /**
   * 检查是否为 StreamAdvisor
   */
  private isStreamAdvisor(advisor: Advisor): advisor is StreamAdvisor {
    return 'afterStream' in advisor;
  }

  /**
   * 获取所有 Advisor
   */
  getAdvisors(): Advisor[] {
    return [...this.advisors];
  }

  /**
   * 执行请求前处理链
   */
  applyBefore(request: ChatRequest): ChatRequest {
    let result = request;
    for (const advisor of this.advisors) {
      if (advisor.before) {
        result = advisor.before(result);
      }
    }
    return result;
  }

  /**
   * 执行响应后处理链
   */
  applyAfter(response: ChatResponse): ChatResponse {
    let result = response;
    // 逆序执行 after
    for (let i = this.advisors.length - 1; i >= 0; i--) {
      const advisor = this.advisors[i];
      if (advisor.after) {
        result = advisor.after(result);
      }
    }
    return result;
  }

  /**
   * 执行流式响应处理链
   */
  applyAfterStream(chunk: string): string {
    let result = chunk;
    for (const advisor of this.streamAdvisors) {
      if (advisor.afterStream) {
        result = advisor.afterStream(result);
      }
    }
    return result;
  }
}
