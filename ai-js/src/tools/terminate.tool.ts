import { BaseTool, ToolParameter } from './tool.interface';

/**
 * 终止工具
 * 让自主规划智能体能够合理地中断
 */
export class TerminateTool extends BaseTool {
  name = 'doTerminate';
  description = `Terminate the interaction when the request is met OR if the assistant cannot proceed further with the task.
When you have finished all the tasks, call this tool to end the work.`;
  parameters: ToolParameter[] = [];

  async execute(_args: Record<string, unknown>): Promise<string> {
    return '任务结束';
  }
}
