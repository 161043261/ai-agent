import { ReActAgent } from './react-agent';
import { AgentState } from './model/agent-state.enum';
import {
  ToolCall,
  createUserMessage,
  createAssistantMessage,
  createToolMessage,
} from './model/message.interface';
import { Tool, ToolExecutor } from '../tools/tool.interface';

/**
 * 处理工具调用的代理类
 * 具体实现了 think 和 act 方法
 */
export class ToolCallAgent extends ReActAgent {
  /** 可用的工具列表 */
  protected availableTools: Tool[];

  /** 工具执行器 */
  protected toolExecutor: ToolExecutor;

  /** 保存工具调用信息 */
  protected pendingToolCalls: ToolCall[] = [];

  /** 保存最后一次思考的内容 (用于 act 记录助手消息) */
  protected lastThinkContent: string = '';

  constructor(tools: Tool[], toolExecutor: ToolExecutor) {
    super();
    this.availableTools = tools;
    this.toolExecutor = toolExecutor;
  }

  /**
   * 处理当前状态并决定下一步行动
   * @returns 是否需要执行行动
   */
  async think(): Promise<boolean> {
    // 1. 拼接用户提示词
    if (this.nextStepPrompt?.trim()) {
      this.messageList.push(createUserMessage(this.nextStepPrompt));
    }

    // 2. 调用 AI 大模型, 获取工具调用结果
    try {
      if (!this.chatModel) {
        throw new Error('ChatModel not initialized');
      }

      const response = await this.chatModel.chat({
        messages: this.messageList,
        systemPrompt: this.systemPrompt,
        tools: this.availableTools,
      });

      // 3. 解析工具调用结果
      const { content, toolCalls } = response;

      this.logger.log(`${this.name}的思考：${content}`);
      this.logger.log(`${this.name}选择了 ${toolCalls?.length || 0} 个工具来使用`);

      // 发送思考内容到 SSE
      this.emitThinking(content);

      if (toolCalls && toolCalls.length > 0) {
        const toolCallInfo = toolCalls
          .map((tc) => `工具名称：${tc.name}, 参数：${tc.arguments}`)
          .join('\n');
        this.logger.log(toolCallInfo);

        // 发送工具调用信息到 SSE
        for (const tc of toolCalls) {
          this.emitToolCall(tc.name, tc.arguments);
        }

        // 保存工具调用信息供 act 使用
        this.pendingToolCalls = toolCalls;
        // 保存思考内容供 act 记录助手消息
        this.lastThinkContent = content;

        // 需要调用工具时, 无需记录助手消息, 因为调用工具时会自动记录 (与 Java 版本一致)
        return true;
      } else {
        // 只有不调用工具时, 才需要手动记录助手消息 (与 Java 版本一致)
        this.messageList.push(createAssistantMessage(content));
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`${this.name}的思考过程遇到了问题：${errorMessage}`);
      this.messageList.push(createAssistantMessage(`处理时遇到了错误：${errorMessage}`));
      return false;
    }
  }

  /**
   * 执行工具调用并处理结果
   * @returns 执行结果
   */
  async act(): Promise<string> {
    if (this.pendingToolCalls.length === 0) {
      return '没有工具需要调用';
    }

    // 记录助手消息 (包含工具调用), 与 Java 版本的 toolCallingManager 行为一致
    this.messageList.push(createAssistantMessage(this.lastThinkContent, this.pendingToolCalls));

    const results: string[] = [];

    // 执行每个工具调用
    for (const toolCall of this.pendingToolCalls) {
      try {
        const result = await this.toolExecutor.execute(toolCall.name, toolCall.arguments);

        // 记录工具响应消息
        this.messageList.push(createToolMessage(toolCall.id, toolCall.name, result));

        // 发送工具结果到 SSE
        this.emitToolResult(toolCall.name, result);

        results.push(`工具 ${toolCall.name} 返回的结果：${result}`);

        // 判断是否调用了终止工具
        if (toolCall.name === 'doTerminate') {
          this.state = AgentState.FINISHED;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorResult = `工具执行错误: ${errorMessage}`;
        this.messageList.push(createToolMessage(toolCall.id, toolCall.name, errorResult));

        // 发送错误结果到 SSE
        this.emitToolResult(toolCall.name, errorResult);

        results.push(`工具 ${toolCall.name} 执行失败：${errorMessage}`);
      }
    }

    // 清空待执行的工具调用
    this.pendingToolCalls = [];

    const finalResult = results.join('\n');
    this.logger.log(finalResult);
    return finalResult;
  }
}
