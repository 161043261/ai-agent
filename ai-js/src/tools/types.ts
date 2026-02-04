import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Re-export LangChain tool types
export { StructuredTool, z };

// Tool executor interface (project-specific)
export interface ToolExecutor {
  execute(toolName: string, args: string): Promise<string>;
}

// Type alias for convenience
export type Tool = StructuredTool;
