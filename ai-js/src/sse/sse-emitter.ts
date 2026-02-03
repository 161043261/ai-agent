import { Logger } from '@nestjs/common';
import { Response } from 'express';
import { EventEmitter } from 'stream';

export enum SseEmitterState {
  IDLE = 'IDLE',
  SENDING = 'SENDING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
}

export interface SseEmitterOptions {
  timeout?: number;
  onTimeout?: () => void;
  onCompletion?: () => void;
  onError?: (err: unknown) => void;
}

export class SseEmitter extends EventEmitter {
  private readonly logger = new Logger(SseEmitter.name);
  private readonly timeout: number;
  private timeoutId: NodeJS.Timeout | null = null;
  private state: SseEmitterState = SseEmitterState.IDLE;

  constructor(
    private readonly response: Response,
    options: SseEmitterOptions = {},
  ) {
    super();
    this.timeout = options.timeout ?? 180_000;
    this.setupResponse();
    this.resetTimeout();
  }

  private setupResponse() {
    this.response.setHeader('Content-Type', 'text/event-stream');
    this.response.setHeader('Connection', 'keep-alive');
    this.response.setHeader('Cache-Control', 'no-cache');
    this.response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    this.response.on('close', () => {
      this.logger.debug('Client disconnected');
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      this.removeAllListeners();
    });
  }

  private resetTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, this.timeout);
  }

  private handleTimeout() {
    if (
      this.state === SseEmitterState.IDLE ||
      this.state === SseEmitterState.SENDING
    ) {
      this.state = SseEmitterState.TIMEOUT;
    }
    this.logger.warn(`SSE emitter timeout after ${this.timeout}ms`);
    this.send({ type: 'timeout', message: 'Connection timeout' }, 'timeout');
    this.emit('timeout');
    this.end();
  }

  getState() {
    return this.state;
  }

  // Boolean(eventName) === true
  // `event: ${eventName}\ndata: ${...}`

  // Boolean(eventName) === false: comment line
  // `: ${...}`
  send(data: unknown, eventName?: string) {
    if (
      this.state === SseEmitterState.COMPLETED ||
      this.state === SseEmitterState.ERROR
    ) {
      this.logger.warn('Cannot send data after completion or error');
      return;
    }
    this.state = SseEmitterState.SENDING;
    this.resetTimeout();
    try {
      const message =
        (eventName ? `event: ${eventName}\ndata` : '') +
        `: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`; // comment line
      this.response.write(message);
    } catch (err) {
      this.logger.error('Writing to response error:', err);
      this.emit('error');
    }
  }

  sendCommentLine(comment: unknown) {
    this.send(comment);
  }

  complete() {
    if (this.state === SseEmitterState.COMPLETED) {
      return;
    }
    this.state = SseEmitterState.COMPLETED;
    this.logger.debug('SSE emitter completed');
    this.send({ type: 'done', message: 'Stream completed' }, 'complete');
    this.emit('complete');
    this.end();
  }

  end() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.removeAllListeners();
    try {
      this.response.end();
    } catch (err) {
      this.logger.error('End response error:', err);
    }
  }

  private onError(err: unknown) {
    if (
      this.state === SseEmitterState.COMPLETED ||
      this.state === SseEmitterState.ERROR
    ) {
      return;
    }
    this.state = SseEmitterState.ERROR;
    this.logger.log('SSE emitter error', err);
    this.send(
      {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      },
      'error',
    );
    this.emit('error');
    this.end();
  }
}
