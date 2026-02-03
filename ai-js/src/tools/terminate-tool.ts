import { BaseTool, ToolParameter } from './base-tool';

export class TerminateTool extends BaseTool {
  name = TerminateTool.name;
  description = `
    Terminate the interaction when the request is met or if the assistant cannot   proceed further with the task.
    Call this tool when all tasks are completed to end the session.
  `;
  parameters: ToolParameter[] = [];

  async execute(): Promise<string> {
    return 'Task completed';
  }
}
