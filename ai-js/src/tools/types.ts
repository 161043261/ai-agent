// Tool executor interface (project-specific)
export interface ToolExecutor {
  execute(toolName: string, args: Record<string, unknown>): Promise<string>;
}
