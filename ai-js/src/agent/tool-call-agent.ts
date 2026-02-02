import { ChatResponse } from '../llm/chat-model';
import { Tool, ToolExecutor } from '../tools/tool';
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
      this.messageList.push(createUserMessage(this.nextStepPrompt.trim()));
    }
    try {
      if (!this.chatModel) {
        throw new Error('Chat model not initialized');
      }
      // Call the AI model to get the tool call results
      const response = await this.chatModel.chat({
        messages: this.messageList,
        systemPrompt: this.systemPrompt,
        tools: this.availableTools,
      });
      // Record the response for later use in Act
      this.toolCallResponse = response;

      const { content, toolCallList } = response;
      this.logger.log(`${this.name} thinking: ${content}`);
      this.logger.log(
        `${this.name} selected ${toolCallList?.length ?? 0} tools to use`,
      );
      // Send the thinking content to SSE
      this.emitThinking(content);

      // If no tools need to be called, return false
      if (!toolCallList || toolCallList.length == 0) {
        // Only when no tools are called, manually record the assistant message
        this.messageList.push(createAssistantMessage(content));
        return false;
      }

      const toolCallInfo = toolCallList
        .map((item) => `Tool name: ${item.name}, arguments: ${item.arguments}`)
        .join('\n');
      this.logger.log('Tool call information:', toolCallInfo);
      // Send tool call information to SSE
      for (const item of toolCallList) {
        this.emitToolCall(item.name, item.arguments);
      }
      // When tools need to be called, no need to record the assistant message as it will be
      // automatically recorded during tool calls
      return true;
    } catch (err) {
      var errMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`${this.name} process error: ${errMessage}`);
      this.messageList.push(
        createAssistantMessage(`${this.name} process error: ${errMessage}`),
      );
      return false;
    }
  }

  async act(): Promise<string> {
    if (!this.toolCallResponse) {
      return 'No tools need to be called';
    }
    const { content, toolCallList } = this.toolCallResponse;
    if (!toolCallList || toolCallList.length === 0) {
      return 'No tools need to be called';
    }
    this.messageList.push(createAssistantMessage(content, toolCallList));
    const results: string[] = [];

    // Call tools
    for (const toolCall of toolCallList) {
      try {
        const result = await this.toolExecutor.execute(
          toolCall.name,
          toolCall.arguments,
        );
        this.messageList.push(
          createToolMessage(toolCall.id, toolCall.name, result),
        );
        // Send each tool's result to SSE
        this.emitToolResult(toolCall.name, result);
        results.push(`Tool ${toolCall.name} returned result: ${result}`);
        // Check if a terminate tool was called
        if (toolCall.name === 'doTerminate') {
          this.state = AgentState.FINISHED;
        }
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        const errResult = `Executing tool ${toolCall.name} error: ${errMessage}`;
        this.messageList.push(
          createToolMessage(toolCall.id, toolCall.name, errMessage),
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
