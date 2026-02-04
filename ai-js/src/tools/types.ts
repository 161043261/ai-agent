import { Logger } from '@nestjs/common';

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
  execute(toolName: string, args: string): Promise<string>;
}

export abstract class BaseTool implements Tool {
  protected readonly logger = new Logger(this.constructor.name);
  abstract name: string;
  abstract description: string;
  abstract parameters: ToolParameter[];
  abstract execute(args: Record<string, unknown>): Promise<string>;
}
