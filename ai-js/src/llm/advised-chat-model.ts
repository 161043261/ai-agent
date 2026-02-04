import { Logger } from '@nestjs/common';
import { AIMessage } from '@langchain/core/messages';
import { ChatModel, ChatRequest, ChatResponse } from './chat-model';
import { AdvisorChain } from '../advisor/advisors.service';

export class AdvisedChatModel extends ChatModel {
  private readonly logger = new Logger(AdvisedChatModel.name);

  constructor(
    private readonly chatModel: ChatModel,
    private readonly advisorChain: AdvisorChain,
  ) {
    super();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const advisedRequest = this.advisorChain.applyBefore(request);
    const response = await this.chatModel.chat(advisedRequest);
    return this.advisorChain.applyAfter(response);
  }

  async *chatStream(request: ChatRequest): AsyncIterable<string> {
    const advisedRequest = this.advisorChain.applyBefore(request);
    // Checking if chat model supports streaming responses
    if (!this.chatModel.chatStream) {
      // Downgraded to non-streaming response
      this.logger.log('Downgraded to non-streaming response');
      const response = await this.chatModel.chat(advisedRequest);
      const advisedResponse = this.advisorChain.applyAfter(response);
      yield advisedResponse.content;
      return;
    }

    let fullContent = '';
    for await (const chunk of this.chatModel.chatStream(advisedRequest)) {
      const advisedChunk = this.advisorChain.applyAfterStream(chunk);
      fullContent += advisedChunk;
      yield advisedChunk;
    }
    // Apply after advisor with accumulated content
    this.advisorChain.applyAfter({
      message: new AIMessage(fullContent),
      content: fullContent,
    });
  }

  getChatModel() {
    return this.chatModel;
  }
}
