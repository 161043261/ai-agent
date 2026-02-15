import { Injectable, Logger } from '@nestjs/common';
import { BaseMessage } from '@langchain/core/messages';

// 请求上下文
export interface ChatModelRequestContext {
  requestId: string;
  messages: BaseMessage[];
  modelName: string;
  timestamp: Date;
}

// 响应上下文
export interface ChatModelResponseContext extends Omit<
  ChatModelRequestContext,
  'messages'
> {
  content: string;
  latencyMs: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 错误上下文
export interface ChatModelErrorContext extends ChatModelRequestContext {
  error: unknown;
}

export interface ChatModelListener {
  onRequest(context: ChatModelRequestContext): string;
  onResponse(context: ChatModelResponseContext): void;
  onError(context: ChatModelErrorContext): void;
}

@Injectable()
export class ChatModelListenerService {
  private readonly logger = new Logger(ChatModelListenerService.name);
  private listeners: ChatModelListener[] = [];
  private requestStartTime = new Map<string, number>();

  generateRequestId() {
    return String(Date.now());
  }

  onRequest(context: Pick<ChatModelRequestContext, 'messages' | 'modelName'>) {
    const requestId = this.generateRequestId();
    this.requestStartTime.set(requestId, Date.now());
    const fullContext: ChatModelRequestContext = {
      ...context,
      requestId,
      timestamp: new Date(),
    };
    for (const listener of this.listeners) {
      try {
        listener.onRequest(fullContext);
      } catch (err) {
        this.logger.error('ChatModelListenerService onRequest error', err);
      }
    }
    return requestId;
  }

  onResponse(
    context: Omit<ChatModelResponseContext, 'timestamp' | 'latencyMs'>,
  ) {
    const startTime = this.requestStartTime.get(context.requestId);
    const latencyMs = Date.now() - (startTime ?? Date.now());
    this.requestStartTime.delete(context.requestId);
    const fullContext: ChatModelResponseContext = {
      ...context,
      latencyMs,
      timestamp: new Date(),
    };
    for (const listener of this.listeners) {
      try {
        listener.onResponse(fullContext);
      } catch (err) {
        this.logger.error('ChatModelListenerService onResponse error', err);
      }
    }
  }

  onError(context: Omit<ChatModelErrorContext, 'timestamp'>) {
    this.requestStartTime.delete(context.requestId);
    const fullContext: ChatModelErrorContext = {
      ...context,
      timestamp: new Date(),
    };
    for (const listener of this.listeners) {
      try {
        listener.onError(fullContext);
      } catch (err) {
        this.logger.error('ChatModelListenerService onError error', err);
      }
    }
  }
}
