import { Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { AgentState } from './model/agent-state.enum';
import { Message, createUserMessage } from './model/message.interface';
import { ChatModel } from '../llm/chat-model.interface';

/**
 * 抽象基础代理类, 用于管理代理状态和执行流程
 *
 * 提供状态转换、内存管理和基于步骤的执行循环的基础功能
 * 子类必须实现 step 方法
 */
export abstract class BaseAgent {
  protected readonly logger = new Logger(this.constructor.name);

  /** Agent 名称 */
  name: string = 'BaseAgent';

  /** 系统提示词 */
  systemPrompt: string = '';

  /** 下一步提示词 */
  nextStepPrompt: string = '';

  /** Agent 状态 */
  state: AgentState = AgentState.IDLE;

  /** 当前执行步骤 */
  currentStep: number = 0;

  /** 最大执行步骤 */
  maxSteps: number = 10;

  /** LLM 大模型 */
  chatModel: ChatModel | null = null;

  /** 消息记录列表 */
  messageList: Message[] = [];

  // 检查是否未结束
  protected get isNotFinished(): boolean {
    return this.state !== AgentState.FINISHED;
  }

  /**
   * 运行代理 (同步)
   * @param userPrompt 用户提示词
   * @returns 执行结果
   */
  async run(userPrompt: string): Promise<string> {
    // 1. 基础校验
    if (this.state !== AgentState.IDLE) {
      throw new Error(`Cannot run agent from state: ${this.state}`);
    }
    if (!userPrompt?.trim()) {
      throw new Error('Cannot run agent with empty user prompt');
    }

    // 2. 执行, 更改状态
    this.state = AgentState.RUNNING;
    this.messageList.push(createUserMessage(userPrompt));

    const results: string[] = [];

    try {
      // 执行循环 (与 Java 版本一致: state != FINISHED)
      for (let i = 0; i < this.maxSteps && this.isNotFinished; i++) {
        const stepNumber = i + 1;
        this.currentStep = stepNumber;
        this.logger.log(`Executing step ${stepNumber}/${this.maxSteps}`);

        // 单步执行
        const stepResult = await this.step();
        const result = `Step ${stepNumber}: ${stepResult}`;
        results.push(result);
      }

      // 检查是否超出步骤限制
      if (this.currentStep >= this.maxSteps) {
        this.state = AgentState.FINISHED;
        results.push(`Terminated: Reached max steps (${this.maxSteps})`);
      }

      return results.join('\n');
    } catch (error) {
      this.state = AgentState.ERROR;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error executing agent', error);
      return `执行错误: ${errorMessage}`;
    } finally {
      // 3. 清理资源
      this.cleanup();
    }
  }

  /**
   * 运行代理 (流式输出)
   * @param userPrompt 用户提示词
   * @returns SSE Observable
   */
  runStream(userPrompt: string): Observable<string> {
    const subject = new Subject<string>();

    // 异步执行
    (async () => {
      // 1. 基础校验
      try {
        if (this.state !== AgentState.IDLE) {
          subject.next(
            JSON.stringify({ type: 'error', content: `无法从状态运行代理：${this.state}` }),
          );
          subject.complete();
          return;
        }
        if (!userPrompt?.trim()) {
          subject.next(JSON.stringify({ type: 'error', content: '不能使用空提示词运行代理' }));
          subject.complete();
          return;
        }
      } catch (error) {
        subject.error(error);
        return;
      }

      // 2. 执行, 更改状态
      this.state = AgentState.RUNNING;
      this.messageList.push(createUserMessage(userPrompt));

      try {
        // 执行循环 (与 Java 版本一致: state != FINISHED)
        for (let i = 0; i < this.maxSteps && this.isNotFinished; i++) {
          const stepNumber = i + 1;
          this.currentStep = stepNumber;
          this.logger.log(`Executing step ${stepNumber}/${this.maxSteps}`);

          // 发送步骤开始事件
          subject.next(
            JSON.stringify({ type: 'step_start', step: stepNumber, maxSteps: this.maxSteps }),
          );

          // 单步执行 (子类会通过 emitThinking 发送思考内容)
          const stepResult = await this.stepWithEmitter(subject);

          // 发送步骤结果
          subject.next(
            JSON.stringify({ type: 'step_result', step: stepNumber, content: stepResult }),
          );
        }

        // 检查是否超出步骤限制
        if (this.currentStep >= this.maxSteps) {
          this.state = AgentState.FINISHED;
          subject.next(
            JSON.stringify({ type: 'finished', content: `达到最大步骤 (${this.maxSteps})` }),
          );
        }

        subject.complete();
      } catch (error) {
        this.state = AgentState.ERROR;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error('Error executing agent', error);
        subject.next(JSON.stringify({ type: 'error', content: `执行错误：${errorMessage}` }));
        subject.complete();
      } finally {
        // 3. 清理资源
        this.cleanup();
      }
    })();

    return subject.asObservable();
  }

  /**
   * 带事件发射器的步骤执行 (用于流式输出)
   * 子类可以重写此方法来发送思考内容
   */
  protected async stepWithEmitter(_emitter: Subject<string>): Promise<string> {
    return this.step();
  }

  /**
   * 定义单个步骤 (子类必须实现)
   */
  abstract step(): Promise<string>;

  /**
   * 清理资源
   */
  protected cleanup(): void {
    // 子类可以重写此方法来清理资源
  }
}
