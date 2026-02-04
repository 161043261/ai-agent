import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export class TerminateTool extends StructuredTool {
  name = TerminateTool.name;
  description = `
    Terminate the interaction when the request is met or if the assistant cannot proceed further with the task.
    Call this tool when all tasks are completed to end the session.
  `;
  schema = z.object({});

  async _call(): Promise<string> {
    return 'Task completed';
  }
}
