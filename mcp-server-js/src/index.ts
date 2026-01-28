import dotenv from "dotenv";
import { MyMcpServer, SseServer as SseServer } from "./mcp";

// 加载环境变量
dotenv.config();

const PORT = parseInt(process.env.PORT || "8127", 10);
const MCP_MODE = process.env.MCP_MODE || "sse";

async function main() {
  console.log("=".repeat(50));
  console.log("  Yu Image Search MCP Server");
  console.log("=".repeat(50));
  console.log(`Mode: ${MCP_MODE}`);
  console.log(`Port: ${PORT}`);
  console.log("=".repeat(50));

  if (MCP_MODE === "stdio") {
    // STDIO 模式
    const mcpServer = new MyMcpServer();
    await mcpServer.runStdio();
  } else {
    // SSE 模式 (默认)
    const sseServer = new SseServer();
    await sseServer.start(PORT);
  }
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
