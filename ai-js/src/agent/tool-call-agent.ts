import { ToolCall } from '@langchain/core/messages/tool';
import { ChatResponse } from '../llm/chat-model';
import { Tool, ToolExecutor } from '../tools/types';
import { TerminateTool } from '../tools/terminate-tool';
import { AgentState } from './model/agent-state.enum';
import {
  createAssistantMessage,
  createToolMessage,
  createUserMessage,
} from './model/message';
import { ReActAgent } from './re-act-agent';

export class ToolCallAgent extends ReActAgent {
  // Available tools
  protected availableTools: Tool[] = [];

  // Stores the response result of tool calls
  protected toolCallResponse: ChatResponse | null = null;

  // Tool executor
  protected toolExecutor: ToolExecutor;

  constructor(tools: Tool[], toolExecutor: ToolExecutor) {
    super();
    this.availableTools = tools;
    this.toolExecutor = toolExecutor;
  }

  // Processes the current state and decides the next action
  async think(): Promise<boolean> {
    // Validate the prompt and concatenate the user prompt
    if (this.nextStepPrompt.trim()) {
      this.messages.push(createUserMessage(this.nextStepPrompt.trim()));
    }
    try {
      if (!this.chatModel) {
        throw new Error('Chat model not initialized');
      }
      // Call the AI model to get the tool call results
      const response = await this.chatModel.chat({
        messages: this.messages,
        systemPrompt: this.systemPrompt,
        tools: this.availableTools,
      });
      // Record the response for later use in Act
      this.toolCallResponse = response;

      const { content, toolCalls } = response;
      this.logger.log(`${this.name} thinking: ${content}`);
      this.logger.log(
        `${this.name} selected ${toolCalls?.length ?? 0} tools to use`,
      );
      // Send the thinking content to SSE
      this.emitThinking(content);

      // If no tools need to be called, return false
      if (!toolCalls || toolCalls.length == 0) {
        // Only when no tools are called, manually record the assistant message
        this.messages.push(createAssistantMessage(content));
        return false;
      }

      const toolCallInfo = toolCalls
        .map(
          (item: ToolCall) =>
            `Tool name: ${item.name}, arguments: ${JSON.stringify(item.args)}`,
        )
        .join('\n');
      this.logger.log('Tool call information:', toolCallInfo);
      // Send tool call information to SSE
      for (const item of toolCalls) {
        this.emitToolCall(item.name, JSON.stringify(item.args));
      }
      // When tools need to be called, no need to record the assistant message as it will be
      // automatically recorded during tool calls
      return true;
    } catch (err) {
      this.logger.error(`${this.name} process error:`, err);
      this.messages.push(createAssistantMessage(`${this.name} process error`));
      return false;
    }
  }

  async act(): Promise<string> {
    if (!this.toolCallResponse) {
      return 'No tools need to be called';
    }
    const { content, toolCalls } = this.toolCallResponse;
    if (!toolCalls || toolCalls.length === 0) {
      return 'No tools need to be called';
    }
    this.messages.push(createAssistantMessage(content, toolCalls));
    const results: string[] = [];

    // Call tools
    for (const toolCall of toolCalls) {
      const toolCallId = toolCall.id || crypto.randomUUID();
      try {
        const result = await this.toolExecutor.execute(
          toolCall.name,
          JSON.stringify(toolCall.args),
        );
        this.messages.push(
          createToolMessage(toolCallId, toolCall.name, result),
        );
        // Send each tool's result to SSE
        this.emitToolResult(toolCall.name, result);
        results.push(`Tool ${toolCall.name} returned result: ${result}`);
        // Check if a terminate tool was called
        if (toolCall.name === TerminateTool.name) {
          this.state = AgentState.FINISHED;
        }
      } catch (err) {
        this.logger.error(`Executing tool ${toolCall.name} error:`, err);
        const errResult = `Executing tool ${toolCall.name} error`;
        this.messages.push(
          createToolMessage(toolCallId, toolCall.name, errResult),
        );
        this.emitToolResult(toolCall.name, errResult);
        results.push(errResult);
      }
    }

    this.toolCallResponse = null;
    const finalResult = results.join('\n');
    this.logger.log('Final result:', finalResult);
    return finalResult;
  }
}
