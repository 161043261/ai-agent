# Agent 智能体模块

## 模块概述

Agent 模块是 yu-ai-agent 项目的核心模块, 实现了基于 ReAct (Reasoning and Acting) 模式的 AI 智能体框架; 该模块采用分层继承架构, 提供从基础代理到超级智能体的完整实现;

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                         YuManus                                  │
│                   (超级智能体实现层)                              │
│              @Component, 可直接使用的智能体                       │
└─────────────────────────────────────────────────────────────────┘
                              │ 继承
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ToolCallAgent                               │
│                     (工具调用实现层)                              │
│         实现 think() 和 act(), 支持 LLM 工具调用                  │
└─────────────────────────────────────────────────────────────────┘
                              │ 继承
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ReActAgent                                 │
│                      (ReAct 模式层)                              │
│           定义 think() 和 act() 抽象方法                         │
└─────────────────────────────────────────────────────────────────┘
                              │ 继承
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BaseAgent                                 │
│                       (基础代理层)                               │
│         管理状态、消息记忆、执行循环、SSE 流式输出                 │
└─────────────────────────────────────────────────────────────────┘
```

## 文件清单

| 文件                    | 类名          | 职责               |
| ----------------------- | ------------- | ------------------ |
| `model/AgentState.java` | AgentState    | 代理状态枚举定义   |
| `BaseAgent.java`        | BaseAgent     | 抽象基础代理类     |
| `ReActAgent.java`       | ReActAgent    | ReAct 模式抽象代理 |
| `ToolCallAgent.java`    | ToolCallAgent | 工具调用代理实现   |
| `YuManus.java`          | YuManus       | 超级智能体实现     |

---

## 类详细说明

### 1. AgentState (代理状态枚举)

**文件路径**: `model/AgentState.java`

**功能**: 定义代理运行过程中的四种状态

```java
public enum AgentState {
    IDLE,      // 空闲状态, 代理未启动
    RUNNING,   // 运行中, 正在执行任务
    FINISHED,  // 已完成, 任务执行结束
    ERROR      // 错误状态, 执行过程中发生异常
}
```

**状态转换图**:

```
     start()
IDLE ──────► RUNNING ──┬──► FINISHED (正常完成)
                       │
                       └──► ERROR (异常发生)
```

---

### 2. BaseAgent (基础代理类)

**文件路径**: `BaseAgent.java`

**功能**: 提供代理的核心框架, 包括状态管理、消息记忆、执行循环和流式输出

#### 核心属性

| 属性             | 类型          | 说明                 | 默认值    |
| ---------------- | ------------- | -------------------- | --------- |
| `name`           | String        | 代理名称             | -         |
| `systemPrompt`   | String        | 系统提示词           | -         |
| `nextStepPrompt` | String        | 下一步提示词         | -         |
| `state`          | AgentState    | 当前状态             | IDLE      |
| `currentStep`    | int           | 当前执行步数         | 0         |
| `maxSteps`       | int           | 最大执行步数         | 10        |
| `chatClient`     | ChatClient    | Spring AI 聊天客户端 | -         |
| `messageList`    | List<Message> | 消息记忆列表         | ArrayList |

#### 核心方法

**1. 同步执行方法 `run(String userPrompt)`**

```java
public String run(String userPrompt) {
    // 1. 状态检查：只有 IDLE 状态才能启动
    // 2. 初始化：添加用户消息到记忆
    // 3. 循环执行 step() 直到 FINISHED 或达到 maxSteps
    // 4. 返回最终结果
}
```

**执行流程**:

```
┌─────────────────────────────────────────────┐
│              run(userPrompt)                │
└─────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  state == IDLE?       │ ── No ──► 抛出异常
        └───────────────────────┘
                    │ Yes
                    ▼
        ┌───────────────────────┐
        │ state = RUNNING       │
        │ 添加用户消息到记忆    │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ while (state==RUNNING │◄─────────┐
        │   && step < maxSteps) │          │
        └───────────────────────┘          │
                    │                      │
                    ▼                      │
        ┌───────────────────────┐          │
        │      step()           │──────────┘
        │  (子类实现具体逻辑)    │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  state = FINISHED     │
        │  返回结果             │
        └───────────────────────┘
```

**2. 流式执行方法 `runStream(String userPrompt)`**

```java
public SseEmitter runStream(String userPrompt) {
    // 1. 创建 SseEmitter (30分钟超时)
    // 2. 异步执行循环
    // 3. 每步执行结果通过 SSE 发送
    // 4. 返回 SseEmitter
}
```

**SSE 输出格式**:

```
data: {"step": 1, "result": "思考中...", "state": "RUNNING"}

data: {"step": 2, "result": "执行工具调用...", "state": "RUNNING"}

data: {"step": 3, "result": "任务完成", "state": "FINISHED"}
```

**3. 抽象方法 `step()`**

```java
public abstract String step();
```

由子类实现具体的单步执行逻辑;

---

### 3. ReActAgent (ReAct 模式代理)

**文件路径**: `ReActAgent.java`

**功能**: 实现 ReAct (Reasoning and Acting) 模式, 将每一步分解为"思考"和"行动"两个阶段

#### ReAct 模式说明

ReAct 是一种 AI 推理模式, 结合了：

- **Reasoning (推理) **: AI 分析当前情况, 决定下一步行动
- **Acting (行动) **: AI 执行具体操作 (如调用工具)

```
┌─────────────────────────────────────────────────────────────┐
│                    ReAct 执行循环                           │
│                                                             │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐          │
│  │  Think   │ ───► │   Act    │ ───► │  Observe │ ──┐      │
│  │ (思考)   │      │  (行动)  │      │  (观察)  │   │      │
│  └──────────┘      └──────────┘      └──────────┘   │      │
│       ▲                                             │      │
│       └─────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

#### 核心方法

**1. 思考方法 `think()`**

```java
public abstract boolean think();
// 返回值：true - 需要执行行动, false - 无需行动
```

**2. 行动方法 `act()`**

```java
public abstract String act();
// 返回值：行动执行的结果描述
```

**3. 步骤实现 `step()`**

```java
@Override
public String step() {
    boolean shouldAct = think();
    if (!shouldAct) {
        return "思考完成 - 无需行动";
    }
    return act();
}
```

---

### 4. ToolCallAgent (工具调用代理)

**文件路径**: `ToolCallAgent.java`

**功能**: 实现具体的工具调用逻辑, 支持 AI 自动选择和执行工具

#### 核心属性

| 属性                   | 类型               | 说明                        |
| ---------------------- | ------------------ | --------------------------- |
| `availableTools`       | ToolCallback[]     | 可用工具数组                |
| `toolCallChatResponse` | ChatResponse       | 工具调用响应                |
| `toolCallingManager`   | ToolCallingManager | 工具调用管理器              |
| `chatOptions`          | ChatOptions        | 聊天选项 (禁用内置工具调用) |

#### 核心方法实现

**1. think() 方法**

```java
@Override
public boolean think() {
    // 1. 构建提示词
    String userMessage = buildUserMessage();

    // 2. 调用 AI 获取响应 (包含工具调用信息)
    toolCallChatResponse = getChatClient()
        .prompt()
        .system(getSystemPrompt())
        .user(userMessage)
        .toolCallbacks(availableTools)
        .options(chatOptions)  // 禁用内置工具执行
        .call()
        .chatResponse();

    // 3. 解析工具调用列表
    List<AssistantMessage.ToolCall> toolCalls =
        toolCallChatResponse.getResult()
            .getOutput()
            .getToolCalls();

    // 4. 返回是否需要调用工具
    return !toolCalls.isEmpty();
}
```

**2. act() 方法**

```java
@Override
public String act() {
    // 1. 获取工具调用列表
    List<AssistantMessage.ToolCall> toolCalls =
        toolCallChatResponse.getResult().getOutput().getToolCalls();

    // 2. 执行每个工具调用
    StringBuilder results = new StringBuilder();
    for (AssistantMessage.ToolCall toolCall : toolCalls) {
        // 使用 ToolCallingManager 执行工具
        String result = toolCallingManager.executeToolCall(toolCall);
        results.append(result).append("\n");

        // 检查是否调用了终止工具
        if ("terminate".equals(toolCall.name())) {
            setState(AgentState.FINISHED);
        }
    }

    // 3. 更新消息记忆
    addToMemory(toolCallChatResponse.getResult().getOutput());
    addToMemory(new ToolResponseMessage(results.toString()));

    return results.toString();
}
```

#### 工具调用流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      ToolCallAgent 执行流程                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  think(): 调用 AI 分析任务                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ChatClient.prompt()                                      │  │
│  │    .system(systemPrompt)                                  │  │
│  │    .user(userMessage + nextStepPrompt)                    │  │
│  │    .toolCallbacks(availableTools)  // 传入可用工具        │  │
│  │    .call()                                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ AI 返回工具调用列表
┌─────────────────────────────────────────────────────────────────┐
│  act(): 执行工具调用                                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  for (toolCall : toolCalls) {                             │  │
│  │      result = toolCallingManager.executeToolCall(toolCall);│  │
│  │      // 检查终止工具                                       │  │
│  │  }                                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ 继续循环或结束
```

---

### 5. YuManus (超级智能体)

**文件路径**: `YuManus.java`

**功能**: 可直接使用的超级智能体实现, 整合所有工具能力

#### Spring Bean 定义

```java
@Component
public class YuManus extends ToolCallAgent {

    public YuManus(
        ToolCallback[] allTools,           // 注入所有工具
        ChatModel dashscopeChatModel       // 注入 DashScope 模型
    ) {
        super(allTools);

        // 设置代理属性
        this.setName("yuManus");
        this.setSystemPrompt(SYSTEM_PROMPT);
        this.setNextStepPrompt(NEXT_STEP_PROMPT);
        this.setMaxSteps(20);

        // 初始化 ChatClient
        this.setChatClient(
            ChatClient.builder(dashscopeChatModel).build()
        );
    }
}
```

#### 提示词配置

**系统提示词 (SYSTEM_PROMPT)**:

```
You are YuManus, an all-capable AI assistant, aimed at solving any task
presented by the user. You have various tools at your disposal that you
can call upon to efficiently complete complex requests. Whether it's
programming, information retrieval, file processing, or web browsing,
you can handle it all.
```

**下一步提示词 (NEXT_STEP_PROMPT)**:

```
Based on user needs, proactively select the most appropriate tool or
combination of tools. For complex tasks, you can break down the problem
and use different tools step by step to solve it. After completing the
task, clearly inform the user of the results and ask if further
assistance is needed.
```

---

## 使用示例

### 1. 直接使用 YuManus

```java
@RestController
public class AiController {

    @Resource
    private ToolCallback[] allTools;

    @Resource
    private ChatModel dashscopeChatModel;

    @GetMapping("/ai/manus/chat")
    public SseEmitter chat(@RequestParam String message) {
        YuManus manus = new YuManus(allTools, dashscopeChatModel);
        return manus.runStream(message);
    }
}
```

### 2. 自定义工具调用代理

```java
public class MyCustomAgent extends ToolCallAgent {

    public MyCustomAgent(ToolCallback[] tools, ChatModel chatModel) {
        super(tools);
        this.setName("MyAgent");
        this.setSystemPrompt("你是一个专门处理XXX任务的助手...");
        this.setChatClient(ChatClient.builder(chatModel).build());
    }
}
```

### 3. 扩展 ReAct 代理

```java
public class MyReActAgent extends ReActAgent {

    @Override
    public boolean think() {
        // 自定义思考逻辑
        // 例如：分析用户意图、规划执行步骤
        return shouldTakeAction;
    }

    @Override
    public String act() {
        // 自定义行动逻辑
        // 例如：执行 API 调用、数据处理
        return actionResult;
    }
}
```

---

## 依赖关系

```
Agent 模块依赖
├── Spring AI
│   ├── ChatClient
│   ├── ChatModel
│   ├── ToolCallback
│   └── ToolCallingManager
├── Spring Web
│   └── SseEmitter
└── Tools 模块
    └── allTools Bean
```

## 配置要求

```yaml
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        model: qwen-plus
```
