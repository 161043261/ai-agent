import { Subject } from 'rxjs';
import { BaseAgent } from './base-agent';

/**
 * ReAct (Reasoning and Acting) 模式的代理抽象类
 * 实现了思考-行动的循环模式
 */
export abstract class ReActAgent extends BaseAgent {
  /** 事件发射器 (用于流式输出) */
  protected emitter: Subject<string> | null = null;

  /**
   * 处理当前状态并决定下一步行动
   * @returns 是否需要执行行动, true 表示需要执行, false 表示不需要执行
   */
  abstract think(): Promise<boolean>;

  /**
   * 执行决定的行动
   * @returns 行动执行结果
   */
  abstract act(): Promise<string>;

  /**
   * 发送思考内容到 SSE
   */
  protected emitThinking(content: string): void {
    if (this.emitter && content?.trim()) {
      this.emitter.next(JSON.stringify({ type: 'thinking', content }));
    }
  }

  /**
   * 发送工具调用信息到 SSE
   */
  protected emitToolCall(toolName: string, args: string): void {
    if (this.emitter) {
      this.emitter.next(JSON.stringify({ type: 'tool_call', tool: toolName, args }));
    }
  }

  /**
   * 发送工具结果到 SSE
   */
  protected emitToolResult(toolName: string, result: string): void {
    if (this.emitter) {
      this.emitter.next(JSON.stringify({ type: 'tool_result', tool: toolName, result }));
    }
  }

  /**
   * 执行单个步骤：思考和行动
   * @returns 步骤执行结果
   */
  async step(): Promise<string> {
    try {
      // 先思考
      const shouldAct = await this.think();
      if (!shouldAct) {
        return '思考完成 - 无需行动';
      }
      // 再行动
      return await this.act();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Step execution failed', error);
      return `步骤执行失败：${errorMessage}`;
    }
  }

  /**
   * 带事件发射器的步骤执行
   */
  protected override async stepWithEmitter(emitter: Subject<string>): Promise<string> {
    this.emitter = emitter;
    try {
      return await this.step();
    } finally {
      this.emitter = null;
    }
  }
}
