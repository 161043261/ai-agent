import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { LlmService } from '../llm/llm.service';
import { MemoryService } from '../memory/memory.service';
import { RagService } from '../rag/rag.service';
import { ToolsService } from '../tools/tools.service';
import { ToolCallbackProvider } from '../mcp/tool-callback-provider';
import {
  Message,
  createUserMessage,
  createAssistantMessage,
} from '../agent/model/message.interface';

const SYSTEM_PROMPT =
  '扮演深耕恋爱心理领域的专家; 开场向用户表明身份, 告知用户可倾诉恋爱难题; 围绕单身、恋爱、已婚三种状态提问：单身状态询问社交圈拓展及追求心仪对象的困扰；恋爱状态询问沟通、习惯差异引发的矛盾；已婚状态询问家庭责任与亲属关系处理的问题; 引导用户详述事情经过、对方反应及自身想法, 以便给出专属解决方案';

/**
 * 恋爱报告结构
 */
export interface LoveReport {
  title: string;
  suggestions: string[];
}

@Injectable()
export class LoveAppService {
  private readonly logger = new Logger(LoveAppService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
    private readonly ragService: RagService,
    private readonly toolsService: ToolsService,
    private readonly toolCallbackProvider: ToolCallbackProvider,
  ) {}

  /**
   * AI 基础对话 (支持多轮对话记忆)
   */
  async doChat(message: string, chatId: string): Promise<string> {
    // 获取历史对话
    const history = await this.memoryService.get(chatId);

    // 添加新消息
    const userMessage = createUserMessage(message);
    const messages: Message[] = [...history, userMessage];

    // 调用 AI（使用带 Advisor 的 ChatModel）
    const response = await this.llmService.getAdvisedChatModel().chat({
      messages,
      systemPrompt: SYSTEM_PROMPT,
    });

    const assistantMessage = createAssistantMessage(response.content);

    // 保存对话记录
    await this.memoryService.add(chatId, [userMessage, assistantMessage]);

    this.logger.log(`content: ${response.content}`);
    return response.content;
  }

  /**
   * AI 基础对话 (支持多轮对话记忆, SSE 流式传输)
   */
  doChatByStream(message: string, chatId: string): Observable<string> {
    const subject = new Subject<string>();

    (async () => {
      try {
        // 获取历史对话
        const history = await this.memoryService.get(chatId);

        // 添加新消息
        const userMessage = createUserMessage(message);
        const messages: Message[] = [...history, userMessage];

        // 使用带 Advisor 的 ChatModel
        const chatModel = this.llmService.getAdvisedChatModel();

        if (chatModel.chatStream) {
          let fullContent = '';

          for await (const chunk of chatModel.chatStream({
            messages,
            systemPrompt: SYSTEM_PROMPT,
          })) {
            fullContent += chunk;
            subject.next(chunk);
          }

          // 保存完整对话
          const assistantMessage = createAssistantMessage(fullContent);
          await this.memoryService.add(chatId, [userMessage, assistantMessage]);
        } else {
          // 降级为非流式
          const response = await chatModel.chat({
            messages,
            systemPrompt: SYSTEM_PROMPT,
          });

          const assistantMessage = createAssistantMessage(response.content);
          await this.memoryService.add(chatId, [userMessage, assistantMessage]);

          subject.next(response.content);
        }

        subject.complete();
      } catch (error) {
        subject.error(error);
      }
    })();

    return subject.asObservable();
  }

  /**
   * AI 恋爱报告功能 (结构化输出)
   */
  async doChatWithReport(message: string, chatId: string): Promise<LoveReport> {
    const reportPrompt =
      SYSTEM_PROMPT +
      '\n每次对话后都要生成恋爱结果, 请以 JSON 格式输出：{"title": "xxx的恋爱报告", "suggestions": ["建议1", "建议2"]}';

    const history = await this.memoryService.get(chatId);
    const userMessage = createUserMessage(message);
    const messages: Message[] = [...history, userMessage];

    const response = await this.llmService.getAdvisedChatModel().chat({
      messages,
      systemPrompt: reportPrompt,
    });

    // 尝试解析 JSON
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const report = JSON.parse(jsonMatch[0]) as LoveReport;
        this.logger.log(`loveReport: ${JSON.stringify(report)}`);
        return report;
      }
    } catch {
      this.logger.warn('Failed to parse love report JSON');
    }

    // 返回默认报告
    return {
      title: '恋爱报告',
      suggestions: [response.content],
    };
  }

  /**
   * 和 RAG 知识库进行对话
   */
  async doChatWithRag(message: string, chatId: string): Promise<string> {
    // 构建 RAG 上下文
    const ragContext = await this.ragService.buildContext(message);

    // 获取历史对话
    const history = await this.memoryService.get(chatId);

    // 构建增强的提示词
    const enhancedPrompt = ragContext ? `${SYSTEM_PROMPT}\n\n${ragContext}` : SYSTEM_PROMPT;

    const userMessage = createUserMessage(message);
    const messages: Message[] = [...history, userMessage];

    const response = await this.llmService.getAdvisedChatModel().chat({
      messages,
      systemPrompt: enhancedPrompt,
    });

    const assistantMessage = createAssistantMessage(response.content);
    await this.memoryService.add(chatId, [userMessage, assistantMessage]);

    this.logger.log(`content: ${response.content}`);
    return response.content;
  }

  /**
   * AI 恋爱报告功能 (支持调用工具)
   */
  async doChatWithTools(message: string, chatId: string): Promise<string> {
    const history = await this.memoryService.get(chatId);
    const userMessage = createUserMessage(message);
    const messages: Message[] = [...history, userMessage];

    const tools = this.toolsService.getAllTools();

    const response = await this.llmService.getAdvisedChatModel().chat({
      messages,
      systemPrompt: SYSTEM_PROMPT,
      tools,
    });

    // 如果有工具调用, 执行工具
    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolResults: string[] = [];

      for (const toolCall of response.toolCalls) {
        const result = await this.toolsService.execute(toolCall.name, toolCall.arguments);
        toolResults.push(`[${toolCall.name}]: ${result}`);
      }

      // 将工具结果合并到响应中
      const finalContent = `${response.content}\n\n工具执行结果：\n${toolResults.join('\n')}`;
      const assistantMessage = createAssistantMessage(finalContent);
      await this.memoryService.add(chatId, [userMessage, assistantMessage]);

      return finalContent;
    }

    const assistantMessage = createAssistantMessage(response.content);
    await this.memoryService.add(chatId, [userMessage, assistantMessage]);

    return response.content;
  }

  /**
   * AI 恋爱功能 (支持调用 MCP 服务)
   */
  async doChatWithMcp(message: string, chatId: string): Promise<string> {
    const history = await this.memoryService.get(chatId);
    const userMessage = createUserMessage(message);
    const messages: Message[] = [...history, userMessage];

    // 获取所有可用工具（包括本地工具和 MCP 工具）
    const allTools = this.toolCallbackProvider.getAllToolDefinitions();

    this.logger.log(`doChatWithMcp: ${allTools.length} tools available`);

    const response = await this.llmService.getAdvisedChatModel().chat({
      messages,
      systemPrompt: SYSTEM_PROMPT,
      tools: allTools,
    });

    // 如果有工具调用, 通过 ToolCallbackProvider 执行
    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolResults: string[] = [];

      for (const toolCall of response.toolCalls) {
        this.logger.log(`Executing tool via MCP: ${toolCall.name}`);
        const result = await this.toolCallbackProvider.executeTool(
          toolCall.name,
          toolCall.arguments,
        );
        toolResults.push(`[${toolCall.name}]: ${result}`);
      }

      // 将工具结果合并到响应中
      const finalContent = `${response.content}\n\n工具执行结果：\n${toolResults.join('\n')}`;
      const assistantMessage = createAssistantMessage(finalContent);
      await this.memoryService.add(chatId, [userMessage, assistantMessage]);

      return finalContent;
    }

    const assistantMessage = createAssistantMessage(response.content);
    await this.memoryService.add(chatId, [userMessage, assistantMessage]);

    this.logger.log(`content: ${response.content}`);
    return response.content;
  }
}
