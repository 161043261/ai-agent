# Demo 演示模块

## 模块概述

Demo 模块包含各种 AI 调用方式的演示代码, 用于学习和测试;

## 目录结构

```
demo/
├── invoke/                 # AI 调用方式演示
│   ├── TestApiKey.java     # API Key 常量
│   ├── HttpAiInvoke.java   # 原生 HTTP 调用
│   ├── SdkAiInvoke.java    # 阿里云 SDK 调用
│   ├── LangChainAiInvoke.java  # LangChain4j 调用
│   ├── SpringAiAiInvoke.java   # Spring AI 调用
│   └── OllamaAiInvoke.java     # Ollama 本地调用
└── rag/
    └── MultiQueryExpanderDemo.java  # 查询扩展演示
```

## 调用方式对比

### 1. HttpAiInvoke (原生 HTTP)

```java
// 直接使用 HTTP 请求调用阿里云 API
String response = HttpUtil.post(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    jsonBody
);
```

### 2. SdkAiInvoke (阿里云 SDK)

```java
Generation gen = new Generation();
GenerationResult result = gen.call(
    GenerationParam.builder()
        .model("qwen-plus")
        .messages(messages)
        .build()
);
```

### 3. LangChainAiInvoke (LangChain4j)

```java
QwenChatModel model = QwenChatModel.builder()
    .apiKey(apiKey)
    .modelName("qwen-plus")
    .build();
String response = model.chat("你好");
```

### 4. SpringAiAiInvoke (Spring AI)

```java
@Resource
private ChatModel dashscopeChatModel;

String response = ChatClient.builder(dashscopeChatModel)
    .build()
    .prompt()
    .user("你好")
    .call()
    .content();
```

### 5. OllamaAiInvoke (本地 Ollama)

```java
@Resource
private ChatModel ollamaChatModel;

String response = ChatClient.builder(ollamaChatModel)
    .build()
    .prompt()
    .user("你好")
    .call()
    .content();
```

## 推荐使用

| 场景     | 推荐方式    |
| -------- | ----------- |
| 生产项目 | Spring AI   |
| 本地开发 | Ollama      |
| 快速原型 | HTTP 直调   |
| 复杂链路 | LangChain4j |
