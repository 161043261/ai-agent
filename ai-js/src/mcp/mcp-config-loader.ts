import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { McpStdioServerConfig } from './mcp-stdio-client.service';

/**
 * MCP 服务器配置项（JSON格式）
 */
export interface McpServerJsonConfig {
  /** 命令 */
  command: string;
  /** 参数 */
  args?: string[];
  /** 环境变量 */
  env?: Record<string, string>;
}

/**
 * MCP 服务器配置文件结构
 */
export interface McpServersJson {
  mcpServers: Record<string, McpServerJsonConfig>;
}

/**
 * MCP 配置加载器
 * 支持从 JSON 配置文件加载 MCP 服务器配置
 */
export class McpConfigLoader {
  private readonly logger = new Logger(McpConfigLoader.name);

  /**
   * 从配置文件加载 MCP 服务器配置
   * @param configPath 配置文件路径（支持绝对路径或相对于 resources 目录的路径）
   */
  loadFromFile(configPath: string): McpStdioServerConfig[] {
    try {
      // 解析配置文件路径
      let fullPath = configPath;

      // 如果是 classpath: 前缀，转换为实际路径
      if (configPath.startsWith('classpath:')) {
        const relativePath = configPath.replace('classpath:', '');
        fullPath = path.join(process.cwd(), 'resources', relativePath);
      } else if (!path.isAbsolute(configPath)) {
        fullPath = path.join(process.cwd(), configPath);
      }

      // 检查文件是否存在
      if (!fs.existsSync(fullPath)) {
        this.logger.warn(`MCP config file not found: ${fullPath}`);
        return [];
      }

      // 读取并解析配置文件
      const content = fs.readFileSync(fullPath, 'utf-8');
      const config = JSON.parse(content) as McpServersJson;

      // 转换为 McpStdioServerConfig 数组
      return this.convertToServerConfigs(config);
    } catch (error) {
      this.logger.error(`Failed to load MCP config from ${configPath}:`, error);
      return [];
    }
  }

  /**
   * 从默认位置加载配置
   */
  loadDefault(): McpStdioServerConfig[] {
    const defaultPaths = ['resources/mcp-servers.json', 'mcp-servers.json', 'config/mcp-servers.json'];

    for (const configPath of defaultPaths) {
      const fullPath = path.join(process.cwd(), configPath);
      if (fs.existsSync(fullPath)) {
        this.logger.log(`Loading MCP config from: ${fullPath}`);
        return this.loadFromFile(fullPath);
      }
    }

    this.logger.warn('No MCP config file found in default locations');
    return [];
  }

  /**
   * 将 JSON 配置转换为 McpStdioServerConfig 数组
   */
  private convertToServerConfigs(config: McpServersJson): McpStdioServerConfig[] {
    if (!config.mcpServers) {
      return [];
    }

    const servers: McpStdioServerConfig[] = [];

    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      servers.push({
        name,
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env || {},
      });
      this.logger.debug(`Loaded MCP server config: ${name}`);
    }

    this.logger.log(`Loaded ${servers.length} MCP server configs`);
    return servers;
  }

  /**
   * 从环境变量加载配置（兼容旧格式）
   */
  loadFromEnv(envValue: string): McpStdioServerConfig[] {
    try {
      const config = JSON.parse(envValue);

      // 支持两种格式
      // 格式1: { servers: [...] }
      if (config.servers && Array.isArray(config.servers)) {
        return config.servers;
      }

      // 格式2: { mcpServers: {...} }
      if (config.mcpServers) {
        return this.convertToServerConfigs(config);
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to parse MCP config from env:', error);
      return [];
    }
  }

  /**
   * 合并多个配置源
   */
  mergeConfigs(...configs: McpStdioServerConfig[][]): McpStdioServerConfig[] {
    const merged = new Map<string, McpStdioServerConfig>();

    for (const configList of configs) {
      for (const config of configList) {
        merged.set(config.name, config);
      }
    }

    return Array.from(merged.values());
  }
}
