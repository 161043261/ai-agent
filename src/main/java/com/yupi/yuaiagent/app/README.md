# App 应用模块

## 模块概述

App 模块是业务应用层, 提供面向用户的 AI 应用服务; 目前包含"恋爱大师"应用 (LoveApp) , 整合了对话、RAG 知识库、工具调用、MCP 服务等多种 AI 能力;

## 架构设计

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            LoveApp                                       │
│                         (恋爱大师应用)                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   基础对话      │    │   RAG 知识库    │    │   工具调用      │
│   doChat()      │    │  doChatWithRag()│    │doChatWithTools()│
│                 │    │                 │    │                 │
│ - 对话记忆      │    │ - 向量检索      │    │ - 工具列表      │
│ - 日志拦截      │    │ - 查询重写      │    │ - 自动调用      │
│ - 流式输出      │    │ - 上下文增强    │    │ - 结果处理      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                        ┌─────────────────┐
                        │   MCP 服务调用   │
                        │doChatWithMcp()  │
                        └─────────────────┘
```

## 文件清单

| 文件           | 类名    | 功能描述         |
| -------------- | ------- | ---------------- |
| `LoveApp.java` | LoveApp | 恋爱大师 AI 应用 |

---

## LoveApp 详细说明

**文件路径**: `LoveApp.java`

**功能**: 提供恋爱咨询 AI 服务, 支持多种交互模式

### 核心属性

```java
@Component
@Slf4j
public class LoveApp {

    private final ChatClient chatClient;

    // 系统提示词
    private static final String SYSTEM_PROMPT = """
        扮演深耕恋爱心理领域的专家, 在婚恋行业有多年的服务经验,
        通过丰富的案例实践和系统的知识梳理, 总结出完整的恋爱指南,
        能够用通俗易懂的语言为来访者提供恰当的方案;
        """;

    // 依赖注入
    @Resource
    private VectorStore loveAppVectorStore;          // 内存向量存储

    @Resource
    private Advisor loveAppRagCloudAdvisor;          // 阿里云 RAG 顾问

    @Resource
    private VectorStore pgVectorVectorStore;         // PgVector 存储

    @Resource
    private QueryRewriter queryRewriter;             // 查询重写器

    @Resource
    private ToolCallback[] allTools;                 // 所有工具

    @Resource
    private ToolCallbackProvider toolCallbackProvider; // MCP 工具提供者
}
```

### 构造函数

```java
public LoveApp(ChatModel dashscopeChatModel) {
    // 创建对话记忆 (基于文件持久化)
    FileBasedChatMemory chatMemory = new FileBasedChatMemory(
        FileConstant.FILE_SAVE_DIR
    );

    // 构建 ChatClient
    this.chatClient = ChatClient.builder(dashscopeChatModel)
        .defaultSystem(SYSTEM_PROMPT)
        .defaultAdvisors(
            new MessageChatMemoryAdvisor(chatMemory),  // 对话记忆
            new MyLoggerAdvisor()                      // 日志记录
        )
        .build();
}
```

---

### 功能方法详解

#### 1. 基础同步对话 `doChat()`

```java
public String doChat(String message, String chatId) {
    return chatClient.prompt()
        .user(message)
        .advisors(spec -> spec.param(
            MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY,
            chatId
        ))
        .call()
        .content();
}
```

**功能特点**:

- 同步调用, 等待完整响应
- 自动关联对话记忆 (通过 chatId)
- 返回纯文本响应

**调用流程**:

```
用户消息 → MessageChatMemoryAdvisor(加载历史)
         → MyLoggerAdvisor(记录日志)
         → ChatModel(AI 推理)
         → 返回响应
```

---

#### 2. 流式对话 `doChatByStream()`

```java
public Flux<String> doChatByStream(String message, String chatId) {
    return chatClient.prompt()
        .user(message)
        .advisors(spec -> spec.param(
            MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY,
            chatId
        ))
        .stream()
        .content();
}
```

**功能特点**:

- 返回 `Flux<String>`, 支持响应式流
- 实时输出 AI 生成的内容
- 适合长文本生成场景

**前端对接示例**:

```javascript
// SSE 方式
const eventSource = new EventSource("/ai/love_app/chat/sse?message=...");
eventSource.onmessage = (event) => {
  console.log(event.data);
};
```

---

#### 3. 结构化输出 `doChatWithReport()`

```java
// 内部记录类定义
record LoveReport(String title, List<String> suggestions) {}

public LoveReport doChatWithReport(String message, String chatId) {
    return chatClient.prompt()
        .user(message)
        .advisors(spec -> spec.param(
            MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY,
            chatId
        ))
        .call()
        .entity(LoveReport.class);  // 自动解析为结构化对象
}
```

**功能特点**:

- AI 输出自动解析为 Java 对象
- 使用 Spring AI 的 `.entity()` 功能
- 适合需要结构化数据的场景

**返回示例**:

```json
{
  "title": "如何提升恋爱信心",
  "suggestions": [
    "首先要认识到自己的价值",
    "尝试多参加社交活动",
    "保持积极乐观的心态"
  ]
}
```

---

#### 4. RAG 知识库问答 `doChatWithRag()`

```java
public String doChatWithRag(String message, String chatId) {
    // 1. 查询重写 (优化检索效果)
    List<String> rewrittenQueries = queryRewriter.doQueryRewrite(message);
    String optimizedQuery = String.join(" ", rewrittenQueries);

    return chatClient.prompt()
        .user(optimizedQuery)
        .advisors(spec -> spec.param(
            MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY,
            chatId
        ))
        // 添加 RAG 顾问
        .advisors(new QuestionAnswerAdvisor(loveAppVectorStore))
        .call()
        .content();
}
```

**功能特点**:

- 集成知识库检索
- 支持查询重写优化
- 基于检索结果生成回答

**RAG 流程**:

```
用户问题 → QueryRewriter(重写优化)
         → VectorStore(向量检索)
         → QuestionAnswerAdvisor(注入上下文)
         → ChatModel(生成回答)
```

---

#### 5. 工具调用对话 `doChatWithTools()`

```java
public String doChatWithTools(String message, String chatId) {
    return chatClient.prompt()
        .user(message)
        .advisors(spec -> spec.param(
            MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY,
            chatId
        ))
        .tools(allTools)  // 注入所有工具
        .call()
        .content();
}
```

**功能特点**:

- AI 可自动选择并调用工具
- 支持多轮工具调用
- 结果自动整合到响应中

**可用工具**:
| 工具 | 功能 |
|------|------|
| FileOperationTool | 文件读写 |
| WebSearchTool | 网络搜索 |
| WebScrapingTool | 网页抓取 |
| TerminalOperationTool | 命令执行 |
| PDFGenerationTool | PDF 生成 |
| ResourceDownloadTool | 资源下载 |

---

#### 6. MCP 服务调用 `doChatWithMcp()`

```java
public String doChatWithMcp(String message, String chatId) {
    return chatClient.prompt()
        .user(message)
        .advisors(spec -> spec.param(
            MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY,
            chatId
        ))
        .tools(toolCallbackProvider)  // 注入 MCP 工具
        .call()
        .content();
}
```

**功能特点**:

- 调用外部 MCP Server 提供的工具
- 支持动态工具发现
- 适合分布式工具服务

**MCP 配置**:

```yaml
spring:
  ai:
    mcp:
      client:
        sse:
          connections:
            - name: image-search
              url: http://localhost:8127/sse
```

---

## 使用示例

### 1. Controller 层调用

```java
@RestController
@RequestMapping("/ai")
public class AiController {

    @Resource
    private LoveApp loveApp;

    // 同步对话
    @GetMapping("/love_app/chat/sync")
    public String chat(
        @RequestParam String message,
        @RequestParam(defaultValue = "default") String chatId
    ) {
        return loveApp.doChat(message, chatId);
    }

    // 流式对话
    @GetMapping(value = "/love_app/chat/sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> chatStream(
        @RequestParam String message,
        @RequestParam(defaultValue = "default") String chatId
    ) {
        return loveApp.doChatByStream(message, chatId);
    }

    // RAG 问答
    @GetMapping("/love_app/chat/rag")
    public String chatWithRag(
        @RequestParam String message,
        @RequestParam(defaultValue = "default") String chatId
    ) {
        return loveApp.doChatWithRag(message, chatId);
    }

    // 工具调用
    @GetMapping("/love_app/chat/tools")
    public String chatWithTools(
        @RequestParam String message,
        @RequestParam(defaultValue = "default") String chatId
    ) {
        return loveApp.doChatWithTools(message, chatId);
    }
}
```

### 2. 前端调用示例

```javascript
// 同步调用
const response = await fetch(
  "/ai/love_app/chat/sync?message=如何追求暗恋对象&chatId=user123",
);
const answer = await response.text();

// SSE 流式调用
const eventSource = new EventSource(
  "/ai/love_app/chat/sse?message=如何追求暗恋对象&chatId=user123",
);
eventSource.onmessage = (event) => {
  document.getElementById("output").innerHTML += event.data;
};
eventSource.onerror = () => {
  eventSource.close();
};
```

---

## 依赖关系

```
LoveApp 依赖
├── ChatModel (dashscopeChatModel)
│   └── Spring AI DashScope 自动配置
├── VectorStore (loveAppVectorStore)
│   └── RAG 模块配置
├── Advisor (loveAppRagCloudAdvisor)
│   └── RAG 模块配置
├── QueryRewriter
│   └── RAG 模块
├── ToolCallback[] (allTools)
│   └── Tools 模块
├── ToolCallbackProvider
│   └── MCP 配置
└── ChatMemory
    └── FileBasedChatMemory
```

---

## 配置要求

```yaml
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        model: qwen-plus

# MCP 客户端配置
  ai:
    mcp:
      client:
        sse:
          connections:
            - name: image-search
              url: http://localhost:8127/sse
```

---

## 扩展指南

### 创建新的 AI 应用

```java
@Component
public class MyNewApp {

    private final ChatClient chatClient;

    public MyNewApp(ChatModel chatModel) {
        this.chatClient = ChatClient.builder(chatModel)
            .defaultSystem("你是一个专门处理XXX的AI助手...")
            .defaultAdvisors(
                new MessageChatMemoryAdvisor(new InMemoryChatMemory()),
                new MyLoggerAdvisor()
            )
            .build();
    }

    public String chat(String message) {
        return chatClient.prompt()
            .user(message)
            .call()
            .content();
    }
}
```
