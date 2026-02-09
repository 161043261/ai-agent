/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { ChatModelService } from '../model/chat-model.service';
import { ChatModelListenerService } from '../listener/chat-model-listener.service';
import { McpClientService } from '../mcp/mcp-client.service';
import { CodeQuestionTool } from './code-question-tool';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { ToolCall } from '@langchain/core/messages/tool';

@Injectable()
export class ToolProviderService {
  private readonly logger = new Logger(ToolProviderService.name);
  private tools = new Map<string, StructuredTool>();

  constructor(
    private readonly chatModelService: ChatModelService,
    private readonly listenerService: ChatModelListenerService,
    private readonly mcpClientService: McpClientService,
    private readonly codeQuestionTool: CodeQuestionTool,
  ) {
    this.registerBuiltinTools();
  }

  private registerBuiltinTools() {
    this.registerTool(this.codeQuestionTool);
  }

  registerTool(tool: StructuredTool): void {
    this.tools.set(tool.name, tool);
    this.logger.debug(`Tool registered: ${tool.name}`);
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    this.logger.log(`Executing tool: ${name}`);
    try {
      const result = await tool.invoke(args);
      this.logger.log(`Tool ${name} completed`);
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (err) {
      this.logger.error(`Tool ${name} failed:`, err);
      throw err;
    }
  }

  async chatWithTools(
    messages: (SystemMessage | HumanMessage | AIMessage)[],
    systemPrompt: string,
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> {
    const chatModel = this.chatModelService.getChatModel();
    const toolsArray = this.getAllTools();
    const fullMessages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      ...messages,
    ];
    const requestId = this.listenerService.onRequest({
      messages: fullMessages,
      modelName: chatModel.getName(),
    });
    try {
      const modelWithTools = chatModel.bindTools?.(toolsArray);
      if (!modelWithTools) {
        throw new Error('Model does not support tools');
      }
      const response = await modelWithTools.invoke(fullMessages);
      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      const toolCalls: ToolCall[] =
        response.tool_calls?.map((item) => ({
          id: item.id ?? String(Date.now()),
          name: item.name,
          args: item.args,
        })) ?? [];
      this.listenerService.onResponse({
        requestId,
        content,
        modelName: chatModel.getName(),
      });
      return { content, toolCalls };
    } catch (err) {
      this.listenerService.onError({
        requestId,
        error: err,
        messages: fullMessages,
        modelName: chatModel.getName(),
      });
      this.logger.error('chatWithTools failed:', err);
      throw err;
    }
  }

  getAllTools(): StructuredTool[] {
    return Array.from(this.tools.values());
  }
}
