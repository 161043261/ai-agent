import { Logger } from '@nestjs/common';
import { ChatModel, ChatRequest, ChatResponse } from './chat-model.interface';
import { AdvisorChain } from '../advisor/advisor';

/**
 * Advisor 增强的 ChatModel 包装器
 * 在调用 ChatModel 前后应用 Advisor 链
 */
export class AdvisedChatModel implements ChatModel {
  private readonly logger = new Logger(AdvisedChatModel.name);

  constructor(
    private readonly delegate: ChatModel,
    private readonly advisorChain: AdvisorChain,
  ) {}

  /**
   * 发送 Chat 请求（应用 Advisor 链）
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 1. 应用 before 处理
    const advisedRequest = this.advisorChain.applyBefore(request);

    // 2. 调用实际的 ChatModel
    const response = await this.delegate.chat(advisedRequest);

    // 3. 应用 after 处理
    return this.advisorChain.applyAfter(response);
  }

  /**
   * 流式 Chat 请求（应用 Advisor 链）
   */
  async *chatStream(request: ChatRequest): AsyncIterable<string> {
    // 1. 应用 before 处理
    const advisedRequest = this.advisorChain.applyBefore(request);

    // 2. 检查 delegate 是否支持流式
    if (!this.delegate.chatStream) {
      // 降级为非流式
      const response = await this.delegate.chat(advisedRequest);
      const advisedResponse = this.advisorChain.applyAfter(response);
      yield advisedResponse.content;
      return;
    }

    // 3. 调用实际的流式 ChatModel
    let fullContent = '';
    for await (const chunk of this.delegate.chatStream(advisedRequest)) {
      // 应用流式处理
      const advisedChunk = this.advisorChain.applyAfterStream(chunk);
      fullContent += advisedChunk;
      yield advisedChunk;
    }

    // 4. 流式完成后，应用 after 处理（用于日志记录）
    this.advisorChain.applyAfter({ content: fullContent });
  }

  /**
   * 获取原始 ChatModel
   */
  getDelegate(): ChatModel {
    return this.delegate;
  }
}
