import { Controller, Get, Query, Res, Sse } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
import { LoveAppService } from '../app/love-app.service';
import { AgentService } from '../agent/agent.service';
import { McpClientService } from '../mcp/mcp-client.service';
import { ToolCallbackProvider } from '../mcp/tool-callback-provider';
import { SseEmitter } from '../sse/sse-emitter';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(
    private readonly loveAppService: LoveAppService,
    private readonly agentService: AgentService,
    private readonly mcpClientService: McpClientService,
    private readonly toolCallbackProvider: ToolCallbackProvider,
  ) {}

  /**
   * 同步调用 AI 恋爱大师应用
   */
  @Get('love_app/chat/sync')
  @ApiOperation({ summary: '同步调用 AI 恋爱大师应用' })
  @ApiQuery({ name: 'message', required: true, description: '用户消息' })
  @ApiQuery({ name: 'chatId', required: true, description: '会话 ID' })
  async doChatWithLoveAppSync(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
  ): Promise<string> {
    return this.loveAppService.doChat(message, chatId);
  }

  /**
   * SSE 流式调用 AI 恋爱大师应用
   */
  @Sse('love_app/chat/sse')
  @ApiOperation({ summary: 'SSE 流式调用 AI 恋爱大师应用' })
  @ApiQuery({ name: 'message', required: true, description: '用户消息' })
  @ApiQuery({ name: 'chatId', required: true, description: '会话 ID' })
  doChatWithLoveAppSSE(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
  ): Observable<MessageEvent> {
    return this.loveAppService
      .doChatByStream(message, chatId)
      .pipe(map((chunk) => ({ data: chunk }) as MessageEvent));
  }

  /**
   * SSE 流式调用 AI 恋爱大师应用 (ServerSentEvent)
   */
  @Get('love_app/chat/server_sent_event')
  @ApiOperation({ summary: 'SSE 流式调用 AI 恋爱大师应用' })
  @ApiQuery({ name: 'message', required: true, description: '用户消息' })
  @ApiQuery({ name: 'chatId', required: true, description: '会话 ID' })
  async doChatWithLoveAppServerSentEvent(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    this.loveAppService.doChatByStream(message, chatId).subscribe({
      next: (chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.end();
      },
    });
  }

  /**
   * SSE Emitter 流式调用 AI 恋爱大师应用（带超时/完成回调）
   */
  @Get('love_app/chat/sse_emitter')
  @ApiOperation({ summary: 'SSE Emitter 流式调用 AI 恋爱大师应用（带超时/完成回调）' })
  @ApiQuery({ name: 'message', required: true, description: '用户消息' })
  @ApiQuery({ name: 'chatId', required: true, description: '会话 ID' })
  async doChatWithLoveAppSseEmitter(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
    @Res() res: Response,
  ): Promise<void> {
    // 创建 SseEmitter，5 分钟超时
    const emitter = new SseEmitter(res, { timeout: 300000 });

    // 设置超时回调
    emitter.onTimeout(() => {
      console.log(`SSE Emitter timeout for chatId: ${chatId}`);
    });

    // 设置完成回调
    emitter.onCompletion(() => {
      console.log(`SSE Emitter completed for chatId: ${chatId}`);
    });

    // 设置错误回调
    emitter.onError((error) => {
      console.error(`SSE Emitter error for chatId: ${chatId}`, error);
    });

    this.loveAppService.doChatByStream(message, chatId).subscribe({
      next: (chunk) => {
        emitter.send({ content: chunk }, 'message');
      },
      error: (err) => {
        emitter.completeWithError(err);
      },
      complete: () => {
        emitter.complete();
      },
    });
  }

  /**
   * AI 恋爱报告功能
   */
  @Get('love_app/chat/report')
  @ApiOperation({ summary: 'AI 恋爱报告功能 (结构化输出) ' })
  @ApiQuery({ name: 'message', required: true, description: '用户消息' })
  @ApiQuery({ name: 'chatId', required: true, description: '会话 ID' })
  async doChatWithReport(@Query('message') message: string, @Query('chatId') chatId: string) {
    return this.loveAppService.doChatWithReport(message, chatId);
  }

  /**
   * 和 RAG 知识库进行对话
   */
  @Get('love_app/chat/rag')
  @ApiOperation({ summary: '和 RAG 知识库进行对话' })
  @ApiQuery({ name: 'message', required: true, description: '用户消息' })
  @ApiQuery({ name: 'chatId', required: true, description: '会话 ID' })
  async doChatWithRag(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
  ): Promise<string> {
    return this.loveAppService.doChatWithRag(message, chatId);
  }

  /**
   * AI 恋爱功能 (支持调用工具)
   */
  @Get('love_app/chat/tools')
  @ApiOperation({ summary: 'AI 恋爱功能 (支持调用工具) ' })
  @ApiQuery({ name: 'message', required: true, description: '用户消息' })
  @ApiQuery({ name: 'chatId', required: true, description: '会话 ID' })
  async doChatWithTools(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
  ): Promise<string> {
    return this.loveAppService.doChatWithTools(message, chatId);
  }

  /**
   * AI 恋爱功能 (支持调用 MCP 服务)
   */
  @Get('love_app/chat/mcp')
  @ApiOperation({ summary: 'AI 恋爱功能 (支持调用 MCP 服务)' })
  @ApiQuery({ name: 'message', required: true, description: '用户消息' })
  @ApiQuery({ name: 'chatId', required: true, description: '会话 ID' })
  async doChatWithMcp(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
  ): Promise<string> {
    return this.loveAppService.doChatWithMcp(message, chatId);
  }

  /**
   * 流式调用 Manus 超级智能体
   */
  @Get('manus/chat')
  @ApiOperation({ summary: '流式调用 Manus 超级智能体' })
  @ApiQuery({ name: 'message', required: true, description: '用户消息' })
  async doChatWithManus(@Query('message') message: string, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 自动包含所有可用工具（本地 + MCP）
    const allTools = this.toolCallbackProvider.getToolCallbacks();
    this.agentService.runManusStream(message, allTools).subscribe({
      next: (chunk) => {
        res.write(`data: ${chunk}\n\n`);
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.write(`data: [DONE]\n\n`);
        res.end();
      },
    });
  }

  /**
   * 同步调用 Manus 超级智能体
   */
  @Get('manus/chat/sync')
  @ApiOperation({ summary: '同步调用 Manus 超级智能体' })
  @ApiQuery({ name: 'message', required: true, description: '用户消息' })
  async doChatWithManusSync(@Query('message') message: string): Promise<string> {
    // 自动包含所有可用工具（本地 + MCP）
    const allTools = this.toolCallbackProvider.getToolCallbacks();
    return this.agentService.runManus(message, allTools);
  }

  /**
   * 流式调用 Manus 超级智能体 (支持 MCP 工具)
   * @deprecated 使用 /manus/chat 即可，已默认包含 MCP 工具
   */
  @Get('manus/chat/mcp')
  @ApiOperation({ summary: '流式调用 Manus 超级智能体 (支持 MCP 工具)' })
  @ApiQuery({ name: 'message', required: true, description: '用户消息' })
  async doChatWithManusMcp(@Query('message') message: string, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 获取所有可用工具并传递给智能体
    const allTools = this.toolCallbackProvider.getToolCallbacks();
    this.agentService.runManusStream(message, allTools).subscribe({
      next: (chunk) => {
        res.write(`data: ${chunk}\n\n`);
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.write(`data: [DONE]\n\n`);
        res.end();
      },
    });
  }
}
