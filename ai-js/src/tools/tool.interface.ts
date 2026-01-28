/**
 * 工具参数定义
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
}

/**
 * 工具定义接口
 */
export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

/**
 * 工具执行器接口
 */
export interface ToolExecutor {
  /**
   * 执行工具
   * @param toolName 工具名称
   * @param args 工具参数 (JSON 字符串)
   */
  execute(toolName: string, args: string): Promise<string>;
}

/**
 * 工具实现基类
 */
export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: ToolParameter[];

  /**
   * 执行工具逻辑
   * @param args 解析后的参数对象
   */
  abstract execute(args: Record<string, unknown>): Promise<string>;
}
