import { Injectable, Logger } from '@nestjs/common';
import { BaseTool, Tool, ToolParameter } from '../tools/tool.interface';
import { ToolsService } from '../tools/tools.service';
import { McpClientService } from './mcp-client.service';
import { McpStdioClientService } from './mcp-stdio-client.service';

/**
 * 工具回调接口
 */
export interface ToolCallback extends BaseTool {
  /** 获取工具定义 */
  getToolDefinition(): Tool;
}

/**
 * 工具回调包装器
 */
class ToolCallbackWrapper extends BaseTool implements ToolCallback {
  name: string;
  description: string;
  parameters: ToolParameter[];
  private readonly executeFn: (args: Record<string, unknown>) => Promise<string>;

  constructor(
    name: string,
    description: string,
    parameters: ToolParameter[],
    executeFn: (args: Record<string, unknown>) => Promise<string>,
  ) {
    super();
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.executeFn = executeFn;
  }

  async execute(args: Record<string, unknown>): Promise<string> {
    return this.executeFn(args);
  }

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    };
  }
}

/**
 * 工具回调提供者
 * 统一管理所有工具来源：本地工具、MCP HTTP 工具、MCP Stdio 工具
 */
@Injectable()
export class ToolCallbackProvider {
  private readonly logger = new Logger(ToolCallbackProvider.name);

  constructor(
    private readonly toolsService: ToolsService,
    private readonly mcpClientService: McpClientService,
    private readonly mcpStdioClientService: McpStdioClientService,
  ) {}

  /**
   * 获取所有可用的工具回调
   */
  getToolCallbacks(): ToolCallback[] {
    const callbacks: ToolCallback[] = [];

    // 1. 添加本地工具
    const localTools = this.toolsService.getAllTools();
    for (const tool of localTools) {
      const localTool = this.toolsService.getTool(tool.name);
      if (localTool) {
        callbacks.push(this.wrapLocalTool(localTool));
      }
    }

    // 2. 添加 MCP HTTP 工具
    if (this.mcpClientService.isConnected()) {
      const mcpTools = this.mcpClientService.getTools();
      for (const tool of mcpTools) {
        callbacks.push(this.wrapMcpTool(tool, 'http'));
      }
    }

    // 3. 添加 MCP Stdio 工具
    const stdioTools = this.mcpStdioClientService.getAllTools();
    for (const tool of stdioTools) {
      callbacks.push(this.wrapMcpTool(tool, 'stdio'));
    }

    this.logger.log(`ToolCallbackProvider: ${callbacks.length} tools available`);
    return callbacks;
  }

  /**
   * 获取所有工具定义（用于传递给 LLM）
   */
  getAllToolDefinitions(): Tool[] {
    return this.getToolCallbacks().map((cb) => cb.getToolDefinition());
  }

  /**
   * 执行工具
   */
  async executeTool(toolName: string, args: Record<string, unknown> | string): Promise<string> {
    const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

    // 优先查找本地工具
    const localTool = this.toolsService.getTool(toolName);
    if (localTool) {
      return localTool.execute(parsedArgs);
    }

    // 查找 MCP HTTP 工具
    if (this.mcpClientService.isConnected()) {
      const mcpTools = this.mcpClientService.getTools();
      const mcpTool = mcpTools.find((t) => t.name === toolName);
      if (mcpTool) {
        return mcpTool.execute(parsedArgs);
      }
    }

    // 查找 MCP Stdio 工具
    const stdioResult = await this.mcpStdioClientService.executeTool(toolName, parsedArgs);
    if (!stdioResult.startsWith('MCP Stdio tool not found:')) {
      return stdioResult;
    }

    return `Tool not found: ${toolName}`;
  }

  /**
   * 按名称获取工具回调
   */
  getToolCallback(toolName: string): ToolCallback | undefined {
    return this.getToolCallbacks().find((cb) => cb.name === toolName);
  }

  /**
   * 检查工具是否存在
   */
  hasTool(toolName: string): boolean {
    return this.getToolCallback(toolName) !== undefined;
  }

  /**
   * 包装本地工具
   */
  private wrapLocalTool(tool: BaseTool): ToolCallback {
    return new ToolCallbackWrapper(tool.name, tool.description, tool.parameters, (args) =>
      tool.execute(args),
    );
  }

  /**
   * 包装 MCP 工具
   */
  private wrapMcpTool(tool: BaseTool, source: 'http' | 'stdio'): ToolCallback {
    return new ToolCallbackWrapper(
      tool.name,
      `[MCP-${source}] ${tool.description}`,
      tool.parameters,
      (args) => tool.execute(args),
    );
  }
}
