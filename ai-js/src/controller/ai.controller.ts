import { Controller, Get, Query, Res } from '@nestjs/common';
import { AppService } from '../app.service';
import { AgentService } from '../agent/agent.service';
import { map, Observable } from 'rxjs';
import type { Response } from 'express';
import { SseEmitter } from '../sse/sse-emitter';

@Controller('ai')
export class AiController {
  constructor(
    private readonly appService: AppService,
    private readonly agentService: AgentService,
  ) {}

  @Get('code-app/chat/sync')
  async doChatWithCodeAppSync(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
  ): Promise<string> {
    return this.appService.doChat(message, chatId);
  }

  @Get('code-app/chat/stream')
  doChatWithCodeAppStream(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
  ): Observable<{ data: string }> {
    return this.appService
      .doChatStream(message, chatId)
      .pipe(map((chunk) => ({ data: chunk })));
  }

  @Get('code-app/chat/sse')
  async doChatWithCodeAppSse(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    this.appService.doChatStream(message, chatId).subscribe({
      next: (chunk) => {
        res.write(`data: ${chunk}\n\n`);
      },
      error: (err) => {
        res.write(
          `data: ${err instanceof Error ? err.message : JSON.stringify(err)}\n\n`,
        );
        res.end();
      },
      complete: () => {
        res.end();
      },
    });
  }

  @Get('code-app/chat/sse_emitter')
  async doChatWithCodeAppSseEmitter(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
    @Res() res: Response,
  ): Promise<void> {
    const emitter = new SseEmitter(res, { timeout: 300000 });
    emitter.on('timeout', () => {
      console.log(`SSE Emitter timeout for chatId: ${chatId}`);
    });
    emitter.on('complete', () => {
      console.log(`SSE Emitter completed for chatId: ${chatId}`);
    });
    emitter.on('error', (error) => {
      console.error(`SSE Emitter error for chatId: ${chatId}`, error);
    });
    this.appService.doChatStream(message, chatId).subscribe({
      next: (chunk) => {
        emitter.send(chunk, 'message');
      },
      error: (err) => {
        emitter.onError(err);
      },
      complete: () => {
        emitter.complete();
      },
    });
  }

  @Get('code-app/chat/report')
  async doChatWithReport(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
  ) {
    return this.appService.doChatWithReport(message, chatId);
  }

  @Get('code-app/chat/rag')
  async doChatWithRag(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
  ): Promise<string> {
    return this.appService.doChatWithRag(message, chatId);
  }

  @Get('code-app/chat/tools')
  async doChatWithTools(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
  ): Promise<string> {
    return this.appService.doChatWithTools(message, chatId);
  }

  @Get('manus/chat')
  async doChatWithManus(
    @Query('message') message: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const allTools = this.toolCallbackProvider.getToolCallbacks();
    this.agentService.runManusStream(message, allTools).subscribe({
      next: (chunk) => {
        res.write(`data: ${chunk}\n\n`);
      },
      error: (err) => {
        res.write(
          `data: ${err instanceof Error ? err.message : String(err)}\n\n`,
        );
        res.end();
      },
      complete: () => {
        res.write(`data: [DONE]\n\n`);
        res.end();
      },
    });
  }
}
