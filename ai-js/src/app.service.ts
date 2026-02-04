import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm/llm.service';
import { MemoryService } from './memory/memory.service';
import { RagService } from './rag/rag.service';
import { ToolsService } from './tools/tools.service';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Observable, Subject } from 'rxjs';
import { z } from 'zod';

const SYSTEM_PROMPT = `
  You are a programming expert, and your name is [MoWan];
  Before starting the conversation, ask the user whether they are interested in front-end, back-end, or full-stack development.
  If the user is interested in front-end development, ask if they are familiar with JavaScript, TypeScript, HTML, CSS, npm/yarn/pnpm, Vue, vue-router, Pinia, React, react-router, MobX, Zustand, Jotai, Webpack, Vite, Rollup, etc.
  If the user is interested in back-end development, ask if they are familiar with Express, Koa, Nest.js, Java, Spring Boot, Redis, MongoDB, MySQL, Kafka, ClickHouse, ElasticSearch, etc.
  If the user is interested in full-stack development, ask if they are familiar with Next.js or Nuxt.js.
  Use chinese.
`;

const CodeReportSchema = z.object({
  title: z.string(),
  suggestions: z.array(z.string()),
});

type CodeReport = z.infer<typeof CodeReportSchema>;

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
    private readonly ragService: RagService,
    private readonly toolsService: ToolsService,
  ) {}

  async doChat(message: string, chatId: string): Promise<string> {
    const history = await this.memoryService.get(chatId);
    const userMessage = new HumanMessage(message);
    const messages = [...history, userMessage];
    const response = await this.llmService.getChatModel().chat({
      messages,
      systemPrompt: SYSTEM_PROMPT,
    });
    const aiMessage = new AIMessage(response.content);
    await this.memoryService.add(chatId, [userMessage, aiMessage]);
    this.logger.log('Chat response content:', response.content);
    return response.content;
  }

  doChatStream(message: string, chatId: string): Observable<string> {
    const subject = new Subject<string>();

    (async () => {
      try {
        const history = await this.memoryService.get(chatId);
        const userMessage = new HumanMessage(message);
        const messages = [...history, userMessage];
        const chatModel = this.llmService.getChatModel();
        if (chatModel.chatStream) {
          let fullContent = '';
          for await (const chunk of chatModel.chatStream({
            messages,
            systemPrompt: SYSTEM_PROMPT,
          })) {
            fullContent += chunk;
            subject.next(chunk);
          }
          const aiMessage = new AIMessage(fullContent);
          await this.memoryService.add(chatId, [userMessage, aiMessage]);
        } else {
          // Downgraded to non-streaming response
          const response = await chatModel.chat({
            messages,
            systemPrompt: SYSTEM_PROMPT,
          });
          const aiMessage = new AIMessage(response.content);
          await this.memoryService.add(chatId, [userMessage, aiMessage]);
          subject.next(response.content);
        }
        subject.complete();
      } catch (err) {
        subject.error(err);
      }
    })().catch((err) => {
      this.logger.error('Chat stream error:', err);
    });

    return subject.asObservable();
  }

  async doChatWithReport(message: string, chatId: string): Promise<CodeReport> {
    const reportPrompt =
      SYSTEM_PROMPT +
      `\nGenerate a code report after each conversation, titled as {username} code report, with content as a list of suggestions. Please output the result in JSON format: {"title": "", "suggestions": ["suggestion 1", "suggestion 2"]}`;
    const history = await this.memoryService.get(chatId);
    const userMessage = new HumanMessage(message);
    const messages = [...history, userMessage];
    const response = await this.llmService.getChatModel().chat({
      messages,
      systemPrompt: reportPrompt,
    });
    const aiMessage = new AIMessage(response.content);
    await this.memoryService.add(chatId, [userMessage, aiMessage]);
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch.length) {
      const { success, data, error } = CodeReportSchema.safeParse(
        JSON.parse(jsonMatch[0]),
      );
      if (success) {
        this.logger.log(`Code report: ${JSON.stringify(data)}`);
        return data;
      }
      this.logger.warn(`Code report validation failed:`, error.message);
    }
    return {
      title: 'Code report',
      suggestions: [response.content],
    };
  }

  async doChatWithRag(message: string, chatId: string): Promise<string> {
    const ragContext = await this.ragService.retrieveAsContext(message);
    const history = await this.memoryService.get(chatId);
    const enhancedPrompt = ragContext
      ? `${SYSTEM_PROMPT}\n\n${ragContext}`
      : SYSTEM_PROMPT;
    const userMessage = new HumanMessage(message);
    const messages = [...history, userMessage];
    const response = await this.llmService.getChatModel().chat({
      messages,
      systemPrompt: enhancedPrompt,
    });
    const aiMessage = new AIMessage(response.content);
    await this.memoryService.add(chatId, [userMessage, aiMessage]);
    this.logger.log('Chat with RAG response content:', response.content);
    return response.content;
  }

  async doChatWithTools(message: string, chatId: string): Promise<string> {
    const history = await this.memoryService.get(chatId);
    const userMessage = new HumanMessage(message);
    const messages = [...history, userMessage];
    const tools = this.toolsService.getAllTools();
    const response = await this.llmService.getChatModel().chat({
      messages,
      systemPrompt: SYSTEM_PROMPT,
      tools,
    });
    const { toolCalls } = response;
    if (toolCalls && toolCalls.length) {
      const toolResults: string[] = [];
      for (const toolCall of toolCalls) {
        const result = await this.toolsService.execute(
          toolCall.name,
          toolCall.args,
        );
        toolResults.push(`[${toolCall.name}]: ${result}`);
      }
      const finalContent = `${response.content}\n\nTool execution results:\n${toolResults.join('\n')}`;
      const aiMessage = new AIMessage(finalContent);
      await this.memoryService.add(chatId, [userMessage, aiMessage]);
      return finalContent;
    }
    const aiMessage = new AIMessage(response.content);
    await this.memoryService.add(chatId, [userMessage, aiMessage]);
    return response.content;
  }
}
