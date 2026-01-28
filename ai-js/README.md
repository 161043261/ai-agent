## ai-js 使用 server-js MCP 服务指南

### 一、启动 MCP 服务 (server-js)

```bash
cd server-js

# 配置 Pexels API Key
cp .env.example .env
# 编辑 .env，设置 PEXELS_API_KEY

# 安装依赖并启动
pnpm install
pnpm start:sse
# 运行在 http://localhost:8127
```

---

### 二、配置 ai-js 连接 MCP

编辑 `ai-js/.env`：

```bash
# MCP Server URL (图片搜索服务)
MCP_SERVER_URL=http://localhost:8127
```

---

### 三、启动 ai-js

```bash
cd ai-js
pnpm install
pnpm start:dev
# 运行在 http://localhost:8123
```

---

### 四、架构说明

```
┌─────────────────┐                    ┌─────────────────────┐
│     ai-js       │     MCP SSE        │     server-js       │
│  (NestJS 后端)  │ ◄──────────────────│  (MCP 图片搜索服务)  │
│                 │                    │                     │
│  ToolsService   │                    │  searchImage 工具   │
│  + 本地工具     │                    │  (Pexels API)       │
│  + MCP 远程工具 │                    │                     │
└─────────────────┘                    └─────────────────────┘
```

---

### 五、新增文件

| 文件                    | 功能                          |
| ----------------------- | ----------------------------- |
| `mcp-client.service.ts` | MCP 客户端，连接远程 MCP 服务 |

---

### 六、工作流程

1. `ai-js` 启动时，`McpClientService` 自动连接 `MCP_SERVER_URL`
2. 加载远程 MCP 工具（如 `searchImage`）
3. `ToolsService.getAllTools()` 返回本地 + MCP 工具
4. 智能体调用工具时，自动路由到本地或 MCP 执行

---

### 七、使用示例

向 AI 智能体发送：

```
帮我搜索一些海滩的图片
```

AI 会调用 MCP 服务的 `searchImage("beach")` 并返回 Pexels 图片 URL。

## 配置说明

环境变量 (.env)

```bash
# 默认使用 Ollama
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# 如需切换回远程 DashScope：
# LLM_PROVIDER=dashscope
# DASHSCOPE_API_KEY=your-key
```

启动步骤

```bash
# 1. 确保 Ollama 服务运行
ollama serve

# 2. 拉取模型 (推荐 qwen2.5)
ollama pull qwen2.5:7b
# 或使用其他模型：
# ollama pull llama3.2:3b
# ollama pull mistral:7b

ollama pull nomic-embed-text

# 3. 进入项目目录
cd ai-js

# 4. 安装依赖
pnpm install

# 5. 配置环境变量
cp .env.example .env

# 6. 启动服务
pnpm start:dev
```
