import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChatModelService } from './model/chat-model.service';
import { RagService } from './rag/rag.service';
import { McpClientService } from './mcp/mcp-client.service';
import { CodeQuestionTool } from './tools/code-question-tool';
import { ToolProviderService } from './tools/tool-provider.service';
import { SafeInputGuardrail } from './guardrail/safe-input-guardrail';
import { ChatMemoryService } from './memory/chat-memory.service';
import { ChatModelListenerService } from './listener/chat-model-listener.service';
import {
  StructuredOutputService,
  Report,
} from './structured-output/structured-output.service';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { join } from 'path';
import { readFileSync } from 'fs';

export interface RagResult {
  content: string;
  sources: string[];
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private systemPrompt: string;

  constructor(
    private readonly chatModelService: ChatModelService,
    private readonly ragService: RagService,
    private readonly mcpClientService: McpClientService,
    private readonly toolProviderService: ToolProviderService,
    private readonly guardrail: SafeInputGuardrail,
    private readonly chatMemoryService: ChatMemoryService,
    private readonly listenerService: ChatModelListenerService,
    private readonly structuredOutputService: StructuredOutputService,
    private readonly codeQuestionTool: CodeQuestionTool,
  ) {}

  async onModuleInit() {
    // Load system prompt
    const promptPath = join(process.cwd(), './resources/system-prompt.txt');
    this.logger.log('Load system prompt from', promptPath);
    try {
      this.systemPrompt = readFileSync(promptPath, 'utf-8');
    } catch {
      this.systemPrompt = `
        你是编程专家, 你的名字叫神人, 帮助用户解决编程问题, 重点关注 3 个方向
        1. 规划编程学习路线
        2. 提供编程学习建议
        3. 分享高频面试题
        请使用专业的语言解决用户的编程问题
      `;
    }
    // Initialize RAG
    await this.ragService.init();
    this.logger.log('AI Service initialized');
  }

  async *chatStream(memoryId: string, userMessage: string) {
    // Input guardrail check
    const guardrailResult = this.guardrail.validate(userMessage);
    if (!guardrailResult.safe) {
      return `Input guardrail validation failed: ${guardrailResult.failures.join(',')}`;
    }
    // Get chat history from memory
    const history = this.chatMemoryService.getHistory(memoryId);
    // RAG retrieval
    const relevantDocs = await this.ragService.retrieve(userMessage);
    let contextMessage = '';
    if (relevantDocs.length > 0) {
      contextMessage =
        'Relevant reference documents:' +
        relevantDocs.map((doc) => doc.pageContent).join('\n');
    }
    const { toolCalls } = await this.toolProviderService.chatWithTools(
      [new HumanMessage(userMessage)],
      '',
    );
    if (toolCalls && toolCalls.length > 0) {
      this.logger.log(
        `Tool calls: ${toolCalls.map((item) => item.name).join(',')}`,
      );
    }

    // Build messages
    const messages = [
      new SystemMessage(this.systemPrompt + contextMessage),
      ...history,
      new HumanMessage(userMessage),
    ];
    const streamingModel = this.chatModelService.getStreamingChatModel();
    const requestId = this.listenerService.onRequest({
      messages,
      modelName: streamingModel.getName(),
    });

    // Iterable readable stream (AI message chunk)
    const stream = await streamingModel.stream(messages);
    let fullResponse = '';
    try {
      for await (const chunk of stream) {
        const content =
          typeof chunk.content === 'string'
            ? chunk.content
            : JSON.stringify(chunk.content);
        if (content) {
          fullResponse += content;
          yield content;
        }
      }
      this.listenerService.onResponse({
        requestId,
        content: fullResponse,
        modelName: streamingModel.getName(),
      });
    } catch (err) {
      this.listenerService.onError({
        requestId,
        error: err,
        messages,
        modelName: streamingModel.getName(),
      });
      throw err;
    }
    // Save to memory
    this.chatMemoryService.addMessage(memoryId, new HumanMessage(userMessage));
    this.chatMemoryService.addMessage(memoryId, new AIMessage(fullResponse));
    this.logger.log(`Chat completed for memory ${memoryId}`);
  }

  async chat(userMessage: string): Promise<string> {
    const guardrailResult = this.guardrail.validate(userMessage);
    if (!guardrailResult.safe) {
      return guardrailResult.failures.join(',');
    }
    const chatModel = this.chatModelService.getChatModel();
    const messages = [
      new SystemMessage(this.systemPrompt),
      new HumanMessage(userMessage),
    ];
    const requestId = this.listenerService.onRequest({
      messages,
      modelName: chatModel.getName(),
    });
    try {
      const response = await chatModel.invoke(messages);
      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      this.listenerService.onResponse({
        requestId,
        content,
        modelName: chatModel.getName(),
      });
      return content;
    } catch (err) {
      this.listenerService.onError({
        requestId,
        error: err,
        messages,
        modelName: chatModel.getName(),
      });
      throw err;
    }
  }

  async chatForReport(userMessage: string): Promise<Report> {
    const guardrailResult = this.guardrail.validate(userMessage);
    if (!guardrailResult.safe) {
      return {
        name: 'Chat for report unsafe',
        suggestionList: guardrailResult.failures,
      };
    }
    return this.structuredOutputService.chatForReport(
      userMessage,
      this.systemPrompt,
    );
  }

  async chatWithRag(userMessage: string): Promise<RagResult> {
    const guardrailResult = this.guardrail.validate(userMessage);
    if (guardrailResult.safe) {
      return {
        content: 'Chat with RAG unsafe',
        sources: guardrailResult.failures,
      };
    }
    const relevantDocs = await this.ragService.retrieve(userMessage);
    const sources = relevantDocs.map((doc) =>
      String(doc.metadata.source ?? doc.metadata.file_name ?? 'unknown'),
    );
    const contextMessage =
      relevantDocs.length > 0
        ? relevantDocs.map((doc) => doc.pageContent).join('\n')
        : '';
    const chatModel = this.chatModelService.getChatModel();
    const messages = [
      new SystemMessage(`${this.systemPrompt}\n${contextMessage}`),
      new HumanMessage(userMessage),
    ];
    const requestId = this.listenerService.onRequest({
      messages,
      modelName: chatModel.getName(),
    });
    try {
      const response = await chatModel.invoke(messages);
      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      this.listenerService.onResponse({
        requestId,
        content,
        modelName: chatModel.getName(),
      });
      return { content, sources };
    } catch (err) {
      this.listenerService.onError({
        requestId,
        error: err,
        messages,
        modelName: chatModel.getName(),
      });
      throw err;
    }
  }

  async chatWithTools(userMessage: string): Promise<{
    content: string;
    toolCalls?: { name: string; args: Record<string, unknown> }[];
  }> {
    const guardrailResult = this.guardrail.validate(userMessage);
    if (!guardrailResult.safe) {
      return {
        content: 'Chat with tools unsafe',
        toolCalls: guardrailResult.failures.map((item) => ({
          name: item,
          args: {},
        })),
      };
    }
    return this.toolProviderService.chatWithTools(
      [new HumanMessage(userMessage)],
      this.systemPrompt,
    );
  }

  async chatWithMcp(userMessage: string): Promise<string> {
    const guardrailResult = this.guardrail.validate(userMessage);
    if (!guardrailResult.safe) {
      return `Chat with MCP unsafe: ${guardrailResult.failures.join(',')}`;
    }
    let mcpContext = '';
    if (this.mcpClientService.isInitialized()) {
      try {
        mcpContext =
          'Web search result: ' +
          (await this.mcpClientService.executeTool('web_search', {
            query: userMessage,
          }));
      } catch (err) {
        this.logger.warn(`Failed to chat with MCP:`, err);
      }
    }
    const chatModel = this.chatModelService.getChatModel();
    const messages = [
      new SystemMessage(
        mcpContext.length
          ? `${this.systemPrompt}\n${mcpContext}`
          : this.systemPrompt,
      ),
      new HumanMessage(userMessage),
    ];
    const response = await chatModel.invoke(messages);
    return typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
  }
}
