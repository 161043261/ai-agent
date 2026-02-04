import { Subject } from 'rxjs';
import { BaseAgent } from './base-agent';
import { EventName } from './model/event-name.enum';

export abstract class ReActAgent extends BaseAgent {
  protected emitter: Subject<string> | null = null;

  abstract think(): Promise<boolean>;

  abstract act(): Promise<string>;

  // Send think content to SSE (Server-Sent Events)
  protected emitThinking(content: string) {
    if (this.emitter && content.trim()) {
      this.emitter.next(JSON.stringify({ type: EventName.THINKING, content }));
    }
  }

  // Send tool call to SSE (Server-Sent Events)
  protected emitToolCall(toolName: string, args: string) {
    if (this.emitter) {
      this.emitter.next(
        JSON.stringify({ type: EventName.TOOL_CALL, tool: toolName, args }),
      );
    }
  }

  // Send tool result to SSE (Server-Sent Events)
  protected emitToolResult(toolName: string, result: string) {
    if (this.emitter) {
      this.emitter.next(
        JSON.stringify({ type: EventName.TOOL_RESULT, tool: toolName, result }),
      );
    }
  }

  override async step(): Promise<string> {
    try {
      const shouldAct = await this.think();
      if (!shouldAct) {
        return 'Thinking complete, no action required';
      }
      return await this.act();
    } catch (err) {
      this.logger.log('Step execute error:', err);
      return 'Step execute error';
    }
  }

  protected override async stepWithEmitter(
    emitter: Subject<string>,
  ): Promise<string> {
    this.emitter = emitter;
    try {
      return await this.step();
    } finally {
      this.emitter = null;
    }
  }
}
