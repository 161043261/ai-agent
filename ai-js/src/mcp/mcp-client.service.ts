import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { BaseTool, ToolParameter } from '../tools/tool.interface';

/**
 * MCP 工具包装器 - 将 MCP 服务的工具转换为本地工具格式
 */
export class McpToolWrapper extends BaseTool {
  name: string;
  description: string;
  parameters: ToolParameter[];

  constructor(
    private readonly mcpClient: Client,
    private readonly toolName: string,
    toolDescription: string,
    inputSchema: Record<string, unknown>,
  ) {
    super();
    this.name = toolName;
    this.description = toolDescription;
    this.parameters = this.parseParameters(inputSchema);
  }

  private parseParameters(inputSchema: Record<string, unknown>): ToolParameter[] {
    const properties = (inputSchema.properties as Record<string, unknown>) || {};
    const required = (inputSchema.required as string[]) || [];

    return Object.entries(properties).map(([name, schema]) => {
      const schemaObj = schema as Record<string, unknown>;
      return {
        name,
        type: (schemaObj.type as ToolParameter['type']) || 'string',
        description: (schemaObj.description as string) || '',
        required: required.includes(name),
      };
    });
  }

  async execute(args: Record<string, unknown>): Promise<string> {
    try {
      const result = await this.mcpClient.callTool({
        name: this.toolName,
        arguments: args,
      });

      if (result.content && Array.isArray(result.content)) {
        return result.content
          .map((item: { type: string; text?: string }) => {
            if (item.type === 'text') {
              return item.text || '';
            }
            return JSON.stringify(item);
          })
          .join('\n');
      }

      return JSON.stringify(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error calling MCP tool ${this.toolName}: ${errorMessage}`;
    }
  }
}

/**
 * MCP 客户端服务 - 连接远程 MCP 服务器
 */
@Injectable()
export class McpClientService implements OnModuleInit {
  private readonly logger = new Logger(McpClientService.name);
  private client: Client | null = null;
  private tools: McpToolWrapper[] = [];
  private connected = false;
  private serverUrl: string | null = null;

  async onModuleInit() {
    this.serverUrl = process.env.MCP_SERVER_URL || null;
    if (this.serverUrl) {
      // 延迟连接，等待 MCP Server 启动
      setTimeout(() => this.connectWithRetry(), 3000);
    } else {
      this.logger.warn('MCP_SERVER_URL not configured, MCP client disabled');
    }
  }

  /**
   * 带重试的连接
   */
  private async connectWithRetry(retries = 3, delay = 2000): Promise<void> {
    if (!this.serverUrl) return;

    for (let i = 0; i < retries; i++) {
      const success = await this.connect(this.serverUrl);
      if (success) return;

      if (i < retries - 1) {
        this.logger.log(`Retrying MCP connection in ${delay}ms... (${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    this.logger.warn('Failed to connect to MCP server after all retries');
  }

  /**
   * 连接到 MCP 服务器
   */
  async connect(serverUrl: string): Promise<boolean> {
    try {
      this.logger.log(`Connecting to MCP server: ${serverUrl}`);

      this.client = new Client(
        {
          name: 'yu-ai-agent-mcp-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
      await this.client.connect(transport);

      // 获取可用工具列表
      await this.loadTools();

      this.connected = true;
      this.logger.log(`Connected to MCP server, loaded ${this.tools.length} tools`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to connect to MCP server: ${errorMessage}`);
      this.connected = false;
      return false;
    }
  }

  /**
   * 加载 MCP 服务器提供的工具
   */
  private async loadTools(): Promise<void> {
    if (!this.client) return;

    try {
      const toolsResult = await this.client.listTools();
      this.tools = toolsResult.tools.map(
        (tool) =>
          new McpToolWrapper(
            this.client!,
            tool.name,
            tool.description || '',
            (tool.inputSchema as Record<string, unknown>) || {},
          ),
      );
    } catch (error) {
      this.logger.error(`Failed to load MCP tools: ${error}`);
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 获取所有 MCP 工具
   */
  getTools(): McpToolWrapper[] {
    return this.tools;
  }

  /**
   * 执行 MCP 工具
   */
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<string> {
    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) {
      return `MCP tool not found: ${toolName}`;
    }
    return tool.execute(args);
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.connected = false;
      this.tools = [];
      this.logger.log('Disconnected from MCP server');
    }
  }
}
