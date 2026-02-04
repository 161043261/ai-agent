import { Logger } from '@nestjs/common';
import { AgentState } from './model/agent-state.enum';
import { ChatModel } from '../llm/chat-model';
import { createUserMessage, Message } from './model/message';
import { Observable, Subject } from 'rxjs';
import { EventName } from './model/event-name.enum';

export abstract class BaseAgent {
  protected readonly logger = new Logger(
    // BaseAgent.name
    this.constructor.name,
  );

  name = this.constructor.name;
  systemPrompt = '';
  nextStepPrompt = '';
  state: AgentState = AgentState.IDLE;
  currentStep = 0;
  maxSteps = 10;
  chatModel: ChatModel | null = null;
  messageList: Message[] = [];

  protected get isNotFinished() {
    return this.state !== AgentState.FINISHED;
  }

  async run(userPrompt: string): Promise<string> {
    if (this.state !== AgentState.IDLE) {
      throw new Error(`Cannot run agent from state: ${this.state}`);
    }
    if (!userPrompt.trim()) {
      throw new Error('Cannot run agent with empty user prompt');
    }
    this.state = AgentState.RUNNING;
    this.messageList.push(createUserMessage(userPrompt));
    const results: string[] = [];
    try {
      for (let i = 0; i < this.maxSteps && this.isNotFinished; i++) {
        const stepNumber = i + 1;
        this.currentStep = stepNumber;
        this.logger.log(`Executing step ${stepNumber}/${this.maxSteps}`);
        const stepResult = await this.step();
        const result = `Step ${stepNumber}: ${stepResult}`;
        results.push(result);
      }
      return results.join('\n');
    } catch (err) {
      this.state = AgentState.ERROR;
      this.logger.error('Executing agent error:', err);
      return 'Executing agent error';
    } finally {
      this.cleanup();
    }
  }

  runStream(userPrompt: string): Observable<string> {
    const subject = new Subject<string>();

    // Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.
    (async () => {
      try {
        if (this.state !== AgentState.IDLE) {
          subject.next(
            JSON.stringify({
              type: EventName.ERROR,
              content: `Cannot run agent from state: ${this.state}`,
            }),
          );
          subject.complete();
          return;
        }
        if (!userPrompt.trim()) {
          subject.next(
            JSON.stringify({
              type: EventName.ERROR,
              content: 'Cannot run agent with empty user prompt',
            }),
          );
          subject.complete();
          return;
        }
      } catch (err) {
        subject.error(err);
        return;
      }

      this.state = AgentState.RUNNING;
      this.messageList.push(createUserMessage(userPrompt));
      try {
        for (let i = 0; i < this.maxSteps && this.isNotFinished; i++) {
          const stepNumber = i + 1;
          this.currentStep = stepNumber;
          this.logger.log(`Executing step ${stepNumber}/${this.maxSteps}`);
          subject.next(
            JSON.stringify({
              type: EventName.STEP_START,
              step: stepNumber,
              max_steps: this.maxSteps,
            }),
          );
          const stepResult = await this.stepWithEmitter(subject);
          subject.next(
            JSON.stringify({
              type: EventName.STEP_RESULT,
              step: stepNumber,
              content: stepResult,
            }),
          );
        }
        if (this.currentStep >= this.maxSteps) {
          this.state = AgentState.FINISHED;
          subject.next(
            JSON.stringify({
              type: AgentState.FINISHED,
              content: `Terminated, reached max steps (${this.maxSteps})`,
            }),
          );
        }
        subject.complete();
      } catch (err) {
        this.state = AgentState.ERROR;
        this.logger.error('Executing agent error:', err);
        subject.next(
          JSON.stringify({
            type: EventName.ERROR,
            content: 'Executing agent error',
          }),
        );
        subject.complete();
      } finally {
        this.cleanup();
      }
    })().catch((err) => {
      this.logger.error('Stream error:', err);
    });

    return subject.asObservable();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async stepWithEmitter(emitter: Subject<string>): Promise<string> {
    return this.step();
  }

  abstract step(): Promise<string>;

  protected cleanup(): void {}
}
