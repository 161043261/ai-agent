import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ImageSearchTool, imageSearchToolDefinition } from "../tools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MyMcpServer {
  private server: any;
  private imageSearchTool: ImageSearchTool;

  constructor() {
    this.server = new McpServer(
      {
        name: "yu-image-search-mcp-server",
        version: "0.0.1",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.imageSearchTool = new ImageSearchTool();
    this.setupHandlers();
  }

  /**
   * 设置请求处理器
   */
  private setupHandlers(): void {
    // 列出所有工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [imageSearchToolDefinition],
      };
    });

    // 调用工具
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: {
        params: { name: string; arguments?: Record<string, unknown> };
      }) => {
        const { name, arguments: args } = request.params;

        if (name === "searchImage") {
          const query = (args as { query: string }).query;
          const result = await this.imageSearchTool.searchImage(query);
          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        throw new Error(`Unknown tool: ${name}`);
      },
    );
  }

  /**
   * 以 STDIO 模式运行
   */
  async runStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP Server running in STDIO mode");
  }
}
