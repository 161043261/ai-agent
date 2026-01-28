import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import fastifyCors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ImageSearchTool } from "../tools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// 会话超时时间 (毫秒) - 从环境变量读取，默认 1 小时
const SESSION_TIMEOUT_MS = parseInt(
  process.env.SESSION_TIMEOUT_MS || "3600000",
  10,
);

interface SessionData {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  timeoutId: NodeJS.Timeout;
  lastActivity: number;
}

/**
 * Fastify MCP 服务器 - 使用 StreamableHTTPServerTransport (新版协议)
 */
export class SseServer {
  private app: FastifyInstance;
  private imageSearchTool: ImageSearchTool;
  // 存储每个会话的数据
  private sessions: Map<string, SessionData> = new Map();

  constructor() {
    this.app = Fastify({ logger: true });
    this.imageSearchTool = new ImageSearchTool();
  }

  /**
   * 创建 MCP Server 实例
   */
  private createMcpServer(): McpServer {
    const server = new McpServer({
      name: "yu-image-search-mcp-server",
      version: "0.0.1",
    });

    server.tool(
      "searchImage",
      "Search for images using Pexels API",
      {
        query: z.string().describe("Search query for images"),
      },
      async ({ query }) => {
        const result = await this.imageSearchTool.searchImage(query);
        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      },
    );

    return server;
  }

  /**
   * 重置会话超时计时器
   */
  private resetSessionTimeout(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 清除旧的超时计时器
    clearTimeout(session.timeoutId);

    // 更新最后活动时间
    session.lastActivity = Date.now();

    // 设置新的超时计时器
    session.timeoutId = setTimeout(() => {
      this.destroySession(sessionId, "timeout");
    }, SESSION_TIMEOUT_MS);
  }

  /**
   * 销毁会话
   */
  private async destroySession(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`Destroying MCP session ${sessionId} (reason: ${reason})`);

    // 清除超时计时器
    clearTimeout(session.timeoutId);

    // 关闭 transport
    try {
      await session.transport.close();
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }

    // 从 Map 中移除
    this.sessions.delete(sessionId);
    console.log(
      `MCP session ${sessionId} destroyed, active sessions: ${this.sessions.size}`,
    );
  }

  /**
   * 设置中间件和路由
   */
  private async setupServer(): Promise<void> {
    // CORS 中间件
    await this.app.register(fastifyCors, {
      origin: true,
    });

    // 健康检查
    this.app.get(
      "/health",
      async (_request: FastifyRequest, reply: FastifyReply) => {
        return reply.send({
          status: "ok",
          server: "yu-image-search-mcp-server",
          version: "0.0.1",
          activeSessions: this.sessions.size,
          timestamp: new Date().toISOString(),
        });
      },
    );

    // MCP 端点 - 处理所有 MCP 请求 (GET/POST/DELETE)
    this.app.all(
      "/mcp",
      async (request: FastifyRequest, reply: FastifyReply) => {
        console.log(`MCP request received: ${request.method}`);

        const sessionId = request.headers["mcp-session-id"] as
          | string
          | undefined;

        try {
          const req = request.raw as any;
          const res = reply.raw;

          // 如果有 sessionId，尝试获取已存在的 session
          if (sessionId && this.sessions.has(sessionId)) {
            const session = this.sessions.get(sessionId)!;
            // 重置超时计时器
            this.resetSessionTimeout(sessionId);
            await session.transport.handleRequest(req, res, request.body);
            return reply.hijack();
          }

          // 新连接：创建新的 transport 和 server
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (newSessionId) => {
              const server = this.createMcpServer();

              // 创建超时计时器
              const timeoutId = setTimeout(() => {
                this.destroySession(newSessionId, "timeout");
              }, SESSION_TIMEOUT_MS);

              // 保存会话数据
              this.sessions.set(newSessionId, {
                transport,
                server,
                timeoutId,
                lastActivity: Date.now(),
              });

              console.log(
                `New MCP session created: ${newSessionId}, active sessions: ${this.sessions.size}`,
              );
            },
          });

          // 当 transport 关闭时清理会话
          transport.onclose = () => {
            for (const [id, session] of this.sessions.entries()) {
              if (session.transport === transport) {
                this.destroySession(id, "transport closed");
                break;
              }
            }
          };

          const server = this.createMcpServer();
          await server.connect(transport);
          await transport.handleRequest(req, res, request.body);

          return reply.hijack();
        } catch (error) {
          console.error("Error handling MCP request:", error);
          return reply.status(500).send("Error handling request");
        }
      },
    );
  }

  /**
   * 启动服务器
   */
  async start(port: number): Promise<void> {
    await this.setupServer();

    try {
      await this.app.listen({ port, host: "0.0.0.0" });
      console.log(`MCP Server running on http://localhost:${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
      console.log(`MCP endpoint: http://localhost:${port}/mcp`);
      console.log(`Session timeout: ${SESSION_TIMEOUT_MS / 1000}s`);
    } catch (err) {
      this.app.log.error(err);
      process.exit(1);
    }
  }
}
