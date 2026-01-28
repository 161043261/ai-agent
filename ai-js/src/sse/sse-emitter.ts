import { Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * SSE 发射器状态
 */
export enum SseEmitterState {
  IDLE = 'IDLE',
  SENDING = 'SENDING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
}

/**
 * SSE 发射器配置
 */
export interface SseEmitterOptions {
  /** 超时时间（毫秒），默认 5 分钟 */
  timeout?: number;
  /** 超时回调 */
  onTimeout?: () => void;
  /** 完成回调 */
  onCompletion?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * 提供超时管理、完成回调等功能
 */
export class SseEmitter {
  private readonly logger = new Logger(SseEmitter.name);
  private readonly timeout: number;
  private timeoutId: NodeJS.Timeout | null = null;
  private state: SseEmitterState = SseEmitterState.IDLE;

  private onTimeoutCallback?: () => void;
  private onCompletionCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(
    private readonly response: Response,
    options: SseEmitterOptions = {},
  ) {
    // 默认 5 分钟超时（与 Java 版本一致）
    this.timeout = options.timeout ?? 300000;
    this.onTimeoutCallback = options.onTimeout;
    this.onCompletionCallback = options.onCompletion;
    this.onErrorCallback = options.onError;

    this.setupResponse();
    this.startTimeout();
  }

  /**
   * 设置 SSE 响应头
   */
  private setupResponse(): void {
    this.response.setHeader('Content-Type', 'text/event-stream');
    this.response.setHeader('Cache-Control', 'no-cache');
    this.response.setHeader('Connection', 'keep-alive');
    this.response.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲

    // 监听客户端断开
    this.response.on('close', () => {
      this.logger.debug('Client disconnected');
      this.cleanup();
    });
  }

  /**
   * 启动超时计时器
   */
  private startTimeout(): void {
    this.clearTimeout();
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, this.timeout);
  }

  /**
   * 重置超时计时器（每次发送数据时调用）
   */
  private resetTimeout(): void {
    this.startTimeout();
  }

  /**
   * 清除超时计时器
   */
  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * 处理超时
   */
  private handleTimeout(): void {
    if (this.state === SseEmitterState.SENDING || this.state === SseEmitterState.IDLE) {
      this.state = SseEmitterState.TIMEOUT;
      this.logger.warn(`SSE Emitter timeout after ${this.timeout}ms`);

      // 发送超时事件
      this.sendRaw('event: timeout\ndata: {"type":"timeout","message":"Connection timeout"}\n\n');

      if (this.onTimeoutCallback) {
        try {
          this.onTimeoutCallback();
        } catch (error) {
          this.logger.error('Error in onTimeout callback', error);
        }
      }

      this.end();
    }
  }

  /**
   * 获取当前状态
   */
  getState(): SseEmitterState {
    return this.state;
  }

  /**
   * 发送数据
   * @param data 要发送的数据（会被 JSON 序列化）
   * @param event 可选的事件名称
   */
  send(data: unknown, event?: string): void {
    if (this.state === SseEmitterState.COMPLETED || this.state === SseEmitterState.ERROR) {
      this.logger.warn('Cannot send data after completion or error');
      return;
    }

    this.state = SseEmitterState.SENDING;
    this.resetTimeout();

    let message = '';
    if (event) {
      message += `event: ${event}\n`;
    }
    message += `data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`;

    this.sendRaw(message);
  }

  /**
   * 发送原始 SSE 消息
   */
  private sendRaw(message: string): void {
    try {
      this.response.write(message);
    } catch (error) {
      this.logger.error('Error writing to response', error);
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 发送心跳（保持连接）
   */
  sendHeartbeat(): void {
    this.sendRaw(': heartbeat\n\n');
    this.resetTimeout();
  }

  /**
   * 完成 SSE 流
   */
  complete(): void {
    if (this.state === SseEmitterState.COMPLETED) {
      return;
    }

    this.state = SseEmitterState.COMPLETED;
    this.logger.debug('SSE Emitter completed');

    // 发送完成事件
    this.send({ type: 'done', message: 'Stream completed' }, 'complete');

    if (this.onCompletionCallback) {
      try {
        this.onCompletionCallback();
      } catch (error) {
        this.logger.error('Error in onCompletion callback', error);
      }
    }

    this.end();
  }

  /**
   * 发送错误
   */
  completeWithError(error: Error): void {
    this.handleError(error);
  }

  /**
   * 处理错误
   */
  private handleError(error: Error): void {
    if (this.state === SseEmitterState.COMPLETED || this.state === SseEmitterState.ERROR) {
      return;
    }

    this.state = SseEmitterState.ERROR;
    this.logger.error('SSE Emitter error', error);

    // 发送错误事件
    this.send({ type: 'error', message: error.message }, 'error');

    if (this.onErrorCallback) {
      try {
        this.onErrorCallback(error);
      } catch (err) {
        this.logger.error('Error in onError callback', err);
      }
    }

    this.end();
  }

  /**
   * 结束响应
   */
  private end(): void {
    this.cleanup();
    try {
      this.response.end();
    } catch {
      // 忽略已关闭的连接错误
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.clearTimeout();
  }

  /**
   * 设置超时回调
   */
  onTimeout(callback: () => void): this {
    this.onTimeoutCallback = callback;
    return this;
  }

  /**
   * 设置完成回调
   */
  onCompletion(callback: () => void): this {
    this.onCompletionCallback = callback;
    return this;
  }

  /**
   * 设置错误回调
   */
  onError(callback: (error: Error) => void): this {
    this.onErrorCallback = callback;
    return this;
  }
}
