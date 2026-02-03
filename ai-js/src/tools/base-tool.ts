export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface ToolExecutor {
  execute(toolName: string, args: Record<string, unknown>): Promise<string>;
}

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: ToolParameter[];
  abstract execute(args: Record<string, unknown>): Promise<string>;
}
