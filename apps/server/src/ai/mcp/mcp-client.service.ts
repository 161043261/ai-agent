import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface McpTool {
  name: string;
  description: string;
  execute: (params: Record<string, unknown>) => Promise<string>;
}

export interface McpClientConfig {
  key: string;
  sseUrl: string;
  logRequests: boolean;
  logResponses: boolean;
}

@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpClientService.name);
  private apiKey = '';
  private mcpTools: McpTool[] = [];
  private config: McpClientConfig = {
    key: McpClientService.name,
    sseUrl: '',
    logRequests: true,
    logResponses: true,
  };
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.apiKey = this.configService.get<string>('BIGMODEL_API_KEY', '');
    if (!this.apiKey) {
      this.logger.error(
        'BIGMODEL_API_KEY is empty: https://bigmodel.cn/usercenter/proj-mgmt/apikeys',
      );
      return;
    }
    this.config.sseUrl = `https://open.bigmodel.cn/api/mcp/web_search/sse?Authorization=${this.apiKey}`;
    this.setupBuiltinTools();
    this.logger.log('McpClientService initialized with builtin tools');
  }

  onModuleDestroy() {
    this.mcpTools = [];
    this.initialized = false;
  }

  private setupBuiltinTools() {
    this.mcpTools = [
      {
        name: 'web_search',
        description:
          'Search the web for real-time information using BigModel web search',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        execute: this.executeTool.bind(this),
      },
    ];
    this.initialized = true;
    this.logger.log('Web search MCP tool initialized');
  }

  getTools() {
    return this.mcpTools;
  }

  async executeTool(toolName: string, params: Record<string, unknown>) {
    const tool = this.mcpTools.find((item) => item.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    if (this.config.logRequests) {
      this.logger.debug(
        `Executing tool ${toolName} with params ${JSON.stringify(params)}`,
      );
    }
    if (toolName === 'web_search') {
      return this.executeWebSearch(params);
    }
    throw new Error(`Tool ${toolName} not implemented`);
  }

  private async executeWebSearch(params: Record<string, unknown>) {
    const query = String(params.query);
    if (!query) {
      return 'Search query is required';
    }
    if (!this.apiKey) {
      return 'BIGMODEL_API_KEY is empty: https://bigmodel.cn/usercenter/proj-mgmt/apikeys';
    }
    try {
      const response = await fetch(
        'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'glm-4',
            messages: [
              {
                role: 'user',
                content: `Search and summary: ${query}`,
              },
            ],
            tools: [
              {
                type: 'web_search',
                web_search: {
                  enable: true,
                },
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      if (this.config.logRequests) {
        this.logger.debug(`Web search response: ${JSON.stringify(data)}`);
      }
      return data.choices?.[0]?.message?.content ?? 'No results found';
    } catch (err) {
      this.logger.error('Web search error:', err);
      return 'Web search error';
    }
  }

  isInitialized() {
    return this.initialized;
  }
}
