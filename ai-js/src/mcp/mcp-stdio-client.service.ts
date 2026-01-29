import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { BaseTool, ToolParameter } from '../tools/tool.interface';
import { McpConfigLoader } from './mcp-config-loader';

/**
 * MCP Stdio 工具包装器
 */
export class McpStdioToolWrapper extends BaseTool {
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
      return `Error calling MCP Stdio tool ${this.toolName}: ${errorMessage}`;
    }
  }
}

/**
 * MCP Stdio Server 配置
 */
export interface McpStdioServerConfig {
  /** 服务器名称 */
  name: string;
  /** 命令 */
  command: string;
  /** 参数 */
  args?: string[];
  /** 环境变量 */
  env?: Record<string, string>;
}

/**
 * MCP Stdio 客户端服务 - 通过 Stdio 协议连接 MCP 服务器
 */
@Injectable()
export class McpStdioClientService implements OnModuleDestroy {
  private readonly logger = new Logger(McpStdioClientService.name);
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();
  private tools: Map<string, McpStdioToolWrapper[]> = new Map();
  private serverConfigs: McpStdioServerConfig[] = [];

  constructor(private readonly configService: ConfigService) {
    this.loadServerConfigs();
  }

  /**
   * 从环境变量或配置文件加载服务器配置
   */
  private loadServerConfigs(): void {
    const configLoader = new McpConfigLoader();

    // 1. 尝试从配置文件加载
    const configPath = this.configService.get<string>('MCP_SERVERS_CONFIG');
    if (configPath) {
      const fileConfigs = configLoader.loadFromFile(configPath);
      if (fileConfigs.length > 0) {
        this.serverConfigs = fileConfigs;
        this.logger.log(`Loaded ${this.serverConfigs.length} MCP Stdio server configs from file`);
        return;
      }
    }

    // 2. 尝试从默认位置加载配置文件
    const defaultConfigs = configLoader.loadDefault();
    if (defaultConfigs.length > 0) {
      this.serverConfigs = defaultConfigs;
      this.logger.log(`Loaded ${this.serverConfigs.length} MCP Stdio server configs from default location`);
      return;
    }

    // 3. 从环境变量读取 MCP Stdio 服务器配置（兼容旧格式）
    // 格式: MCP_STDIO_SERVERS={"servers":[{"name":"xxx","command":"node","args":["path/to/server.js"]}]}
    const configStr = this.configService.get<string>('MCP_STDIO_SERVERS');

    if (configStr) {
      const envConfigs = configLoader.loadFromEnv(configStr);
      if (envConfigs.length > 0) {
        this.serverConfigs = envConfigs;
        this.logger.log(`Loaded ${this.serverConfigs.length} MCP Stdio server configs from env`);
        return;
      }
    }

    this.logger.warn('No MCP Stdio server configs found');
  }

  /**
   * 连接到指定的 MCP Stdio 服务器
   */
  async connect(serverName: string): Promise<boolean> {
    const config = this.serverConfigs.find((s) => s.name === serverName);
    if (!config) {
      this.logger.error(`MCP Stdio server config not found: ${serverName}`);
      return false;
    }

    return this.connectWithConfig(config);
  }

  /**
   * 使用配置连接 MCP Stdio 服务器
   */
  async connectWithConfig(config: McpStdioServerConfig): Promise<boolean> {
    try {
      this.logger.log(`Connecting to MCP Stdio server: ${config.name}`);

      // 如果已连接，先断开
      if (this.clients.has(config.name)) {
        await this.disconnectServer(config.name);
      }

      const client = new Client(
        {
          name: `yu-ai-agent-stdio-client-${config.name}`,
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: { ...process.env, ...config.env } as Record<string, string>,
      });

      await client.connect(transport);

      // 保存客户端和传输
      this.clients.set(config.name, client);
      this.transports.set(config.name, transport);

      // 加载工具
      await this.loadTools(config.name, client);

      this.logger.log(
        `Connected to MCP Stdio server: ${config.name}, loaded ${this.tools.get(config.name)?.length || 0} tools`,
      );
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to connect to MCP Stdio server ${config.name}: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 加载服务器提供的工具
   */
  private async loadTools(serverName: string, client: Client): Promise<void> {
    try {
      const toolsResult = await client.listTools();
      const tools = toolsResult.tools.map(
        (tool) =>
          new McpStdioToolWrapper(
            client,
            tool.name,
            tool.description || '',
            (tool.inputSchema as Record<string, unknown>) || {},
          ),
      );
      this.tools.set(serverName, tools);
    } catch (error) {
      this.logger.error(`Failed to load tools from ${serverName}:`, error);
      this.tools.set(serverName, []);
    }
  }

  /**
   * 连接所有配置的服务器
   */
  async connectAll(): Promise<void> {
    for (const config of this.serverConfigs) {
      await this.connectWithConfig(config);
    }
  }

  /**
   * 断开指定服务器
   */
  async disconnectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      try {
        await client.close();
      } catch (error) {
        this.logger.error(`Error closing client ${serverName}:`, error);
      }
      this.clients.delete(serverName);
    }

    const transport = this.transports.get(serverName);
    if (transport) {
      try {
        await transport.close();
      } catch (error) {
        this.logger.error(`Error closing transport ${serverName}:`, error);
      }
      this.transports.delete(serverName);
    }

    this.tools.delete(serverName);
    this.logger.log(`Disconnected from MCP Stdio server: ${serverName}`);
  }

  /**
   * 断开所有服务器
   */
  async disconnectAll(): Promise<void> {
    for (const serverName of this.clients.keys()) {
      await this.disconnectServer(serverName);
    }
  }

  /**
   * 模块销毁时断开所有连接
   */
  async onModuleDestroy(): Promise<void> {
    await this.disconnectAll();
  }

  /**
   * 获取指定服务器的工具
   */
  getTools(serverName: string): McpStdioToolWrapper[] {
    return this.tools.get(serverName) || [];
  }

  /**
   * 获取所有服务器的工具
   */
  getAllTools(): McpStdioToolWrapper[] {
    const allTools: McpStdioToolWrapper[] = [];
    for (const tools of this.tools.values()) {
      allTools.push(...tools);
    }
    return allTools;
  }

  /**
   * 检查服务器是否已连接
   */
  isConnected(serverName: string): boolean {
    return this.clients.has(serverName);
  }

  /**
   * 获取已连接的服务器列表
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * 执行工具
   */
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<string> {
    for (const tools of this.tools.values()) {
      const tool = tools.find((t) => t.name === toolName);
      if (tool) {
        return tool.execute(args);
      }
    }
    return `MCP Stdio tool not found: ${toolName}`;
  }

  /**
   * 添加服务器配置并连接
   */
  async addServer(config: McpStdioServerConfig): Promise<boolean> {
    // 检查是否已存在
    const existingIndex = this.serverConfigs.findIndex((s) => s.name === config.name);
    if (existingIndex >= 0) {
      this.serverConfigs[existingIndex] = config;
    } else {
      this.serverConfigs.push(config);
    }

    return this.connectWithConfig(config);
  }
}
