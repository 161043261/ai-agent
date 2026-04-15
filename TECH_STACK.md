# AI Agent - 技术栈与架构指南

本项目是一个基于现代前端与 Node.js 服务端的全栈大语言模型（LLM）对话应用，强调类型安全、模块化分层与可扩展的模型接入能力。

## 1. 核心技术栈概览

### 1.1 前端 (Client)

- **核心框架**: React 19 + TypeScript
- **构建工具**: Vite (使用 Rolldown 作为底层打包器)
- **UI & 样式**: Tailwind CSS v4 + DaisyUI 5
- **路由与状态**: React Router v7 + Jotai (原子化状态管理)
- **数据获取**: TanStack Query (React Query)
- **表单与校验**: React Hook Form + Zod
- **列表虚拟化**: @tanstack/react-virtual (支持长对话列表高性能渲染)
- **国际化**: i18next + react-i18next
- **Markdown 渲染**: react-markdown + remark-gfm
- **通知系统**: sonner
- **工程规范**: ESLint + Prettier (含 Tailwind 规则)

### 1.2 后端 (Server)

- **核心框架**: Koa + TypeScript + @koa/router
- **大模型引擎**: LangChain + Ollama 本地模型
- **RAG 向量存储**: LangChain MemoryVectorStore (内存向量数据库) + Ollama Embeddings
- **数据库**: MySQL (Knex.js 查询构建器) + Redis (ioredis 缓存与会话)
- **运行时**: Node.js (通过 tsx 实现极速开发重载)
- **校验与安全**: Zod + JWT
- **日志**: Pino
- **代码规范**: Biome (极致的格式化与 Lint 性能)
- **配置管理**: dotenv (.env 驱动的配置注入)
- **上传能力**: @koa/multer (文件上传到本地)

---

## 2. 架构与工程化设计

### 2.1 pnpm Monorepo 架构与磁盘友好性

项目采用了 `pnpm-workspace` 构建 Monorepo（单体仓库）架构，将 `client` 和 `server` 统一管理。
**为什么说它对磁盘极度友好？**

- **软链接机制**: `pnpm` 不会像 `npm` 那样在每个项目中都复制一份依赖，而是将所有包统一存储在全局的 store 中，通过硬链接（hard link）和符号链接（symlink）链接到 `node_modules` 中。这极大地节省了磁盘空间。
- **依赖提升与版本一致性**: 在 Monorepo 中，前后端可以共享相同的依赖版本（如 `zod`, `typescript` 等），避免了多版本冲突。

### 2.2 Zod：端到端的类型安全 (Type Safety)

本项目将 **Zod** 作为连接前后端的类型契约桥梁：

- **前端应用**: 结合 `react-hook-form` 和 `@hookform/resolvers/zod`，Zod 被用于表单数据的严格校验。只有通过 Schema 校验的数据才会被提交，消除了运行时潜在的 `undefined` 错误。
- **后端应用**: Zod 被用于对 Koa 的 Request Body、Query 和 Params 进行强校验，确保进入 Service 层的数据都是合法的、类型明确的。

### 2.3 TanStack Query 的应用哲学

在前端，我们彻底抛弃了传统的 `useEffect` + `useState` 组合来获取数据，而是全面拥抱了 **TanStack Query**：

- **自动缓存与后台验证**: 聊天记录、会话列表等数据会被自动缓存。当组件重新挂载或窗口重新聚焦时，Query 会在后台自动静默刷新（Stale-While-Revalidate），保证数据的实时性。
- **突变与乐观更新**: 使用 `useMutation` 处理发送消息、新建会话等操作。结合 Query 缓存失效（`queryClient.invalidateQueries`），一旦操作成功，相关的列表会自动重新拉取。

### 2.4 网络与流式通信

- **统一请求层**: Axios 实例在请求拦截器中注入 Bearer Token，在响应拦截器中对 401 做统一失效处理，降低各业务模块的重复代码。
- **版本化 API 前缀**: 后端路由统一挂载在 `/api/v1` 前缀下；前端开发环境通过 Vite Proxy 将 `/api/*` 重写到后端 `/api/v1/*`。
- **SSE 流式输出**: 后端以 `text/event-stream` 输出 `data:` 行并以 `[DONE]` 作为结束标记；前端使用 `fetch + TextDecoder + ReadableStream` 逐行解析并增量更新消息内容，实现低延迟的流式渲染。

### 2.5 配置与运行时治理

- **dotenv 配置注入**: 服务端在启动时加载 `.env`，并在配置模块中做类型化聚合（端口、数据库、JWT、RAG、模型提供方等）。
- **开发体验优化**: 前端 Vite 提供快速 HMR 与本地代理；后端采用 `tsx watch` 进行热更新与快速迭代。

### 2.6 统一错误码与响应契约

- **错误码体系**: 后端以 `Code` 枚举定义业务错误码与语义（如参数非法、鉴权失败、模型错误等），客户端可据此做统一提示与分支处理。
- **统一响应结构**: Controller 层使用 `success()` / `codeOf()` 生成一致的响应体，保障前后端交互的稳定性与可观测性。

---

## 3. 后端架构与设计模式

### 3.1 Koa 的洋葱圈模型 (Onion Model)

后端框架 Koa 的核心是其著名的“洋葱圈模型”。在本项目中，这一模型被淋漓尽致地应用在中间件的设计上（如：错误处理、日志记录、鉴权等）：

- **执行流**: 请求（Request）由外向内穿过一层层中间件，到达核心路由处理完毕后，响应（Response）再由内向外原路返回。
- **优雅的异常捕获**: 借助于 `async/await` 和洋葱圈模型，我们在最外层只需要编写一个 `try-catch` 中间件，就可以捕获到内层任何路由或服务抛出的异常，从而统一返回标准格式的 JSON 错误信息。

### 3.2 经典三层架构 (Controller - Service - DAO)

项目后端严格遵循了职责分离的设计原则：

- **Controller 层**: 负责接收 HTTP 请求，解析参数（使用 Zod 校验），调用 Service，并封装统一的响应格式返回给客户端。
- **Service 层**: 承载核心业务逻辑，如：处理大模型的流式输出（Streaming）、会话状态的维护、RAG（检索增强生成）逻辑的编排。
- **DAO 层 (Data Access Object)**: 负责与底层数据源交互，封装了 Knex.js 对 MySQL 的查询以及对 Redis 的缓存操作，将数据逻辑与业务逻辑彻底解耦。

### 3.3 核心功能的实现机制

- **设计模式 - 工厂模式 (Factory Pattern)**: 模型层通过工厂按 `model_type` 创建 Ollama 及其 RAG 变体；调用方仅依赖统一接口，便于扩展新的模型实现。
- **设计模式 - 单例模式 (Singleton Pattern)**: 模型工厂、会话管理器、数据库连接与日志对象以单例方式生命周期管理，避免重复初始化与资源浪费。
- **会话内存模型**: 服务端以“用户名 -> 会话 ID -> Agent”的映射维护对话上下文；当用户在同一会话切换模型类型时，可复用历史上下文并动态替换底层模型实现。
- **SSE 协议细节**: 创建新会话的流式接口会先下发 `session_id`，随后持续推送模型输出 chunk，并以 `[DONE]` 终止，保证前端可在首包后立即渲染并完成会话绑定。
- **长列表虚拟化渲染**: 前端对话列表采用虚拟滚动，仅渲染可视区域节点以降低 DOM 规模，保障长会话场景下的滚动与输入流畅性。

### 3.4 鉴权与安全边界

- **JWT 鉴权**: 登录/注册成功后签发 JWT，后续请求通过 `Authorization: Bearer <token>` 进行鉴权；中间件解析后将 `username` 注入 `ctx.state`，供业务逻辑使用。
- **输入校验与边界控制**: Controller 层使用 Zod 对请求体进行 `safeParse` 校验，避免非法数据进入业务层，降低运行时错误与注入风险。

### 3.5 存储、缓存与启动回放

- **MySQL 持久化**: 通过 Knex 初始化连接池并在启动阶段创建基础表结构（users/sessions/messages），消息在写入内存上下文的同时异步落库。
- **Redis/LRU 双层缓存策略**: 优先尝试连接 Redis，失败则回退到内存 LRU 缓存，并提供统一的 `cacheGet/cacheSet/cacheDelete` 接口屏蔽存储差异。
- **冷启动回放**: 服务端启动时从 MySQL 拉取历史消息，并回放到会话管理器中，恢复用户会话上下文，保证重启后仍可继续对话。

### 3.6 文件上传与 RAG 检索增强

- **上传链路**: 后端通过 `@koa/multer` 接收上传文件，校验扩展名（仅允许 `.md` / `.txt`），将临时文件按 CRC32 命名落盘到 `uploads/<username>/`，便于去重与定位。
- **RAG 检索流程**: 读取用户上传目录下文档，使用文本切分器生成 chunk，调用 Embeddings 生成向量并构建 `MemoryVectorStore`；检索阶段基于相似度 Top-K 召回相关片段并注入提示词以增强回答一致性与可追溯性。

---

## 总体介绍

> 本项目是一个以 React 19 + TypeScript 与 Koa + TypeScript 为核心的全栈 AI 对话系统。前端基于 Vite（Rolldown）构建，使用 Tailwind CSS v4 + DaisyUI 统一主题与组件风格，结合 TanStack Query 管理数据缓存与异步状态，Jotai 负责全局状态持久化，Zod + React Hook Form 提供端到端类型安全校验，并通过 SSE 流式渲染与虚拟列表优化保证长对话性能。后端采用 Koa 洋葱模型与 Controller-Service-DAO 分层架构，JWT 进行鉴权，Knex 管理 MySQL 持久化，Redis/LRU 提供缓存回退，LangChain 驱动基于 Ollama 的本地大模型应用，并内置 MemoryVectorStore 实现了 RAG 检索增强能力，整体展示了严谨的工程化标准、类型安全与模块化可扩展架构。
