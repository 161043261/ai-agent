// Tool executor interface (project-specific)
export interface ToolExecutor {
  execute(toolName: string, args: string): Promise<string>;
}
