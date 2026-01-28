# ChatMemory 对话记忆模块

## 模块概述

ChatMemory 模块实现 AI 对话记忆持久化, 使用 Kryo 序列化存储到文件系统;

## 文件清单

| 文件                       | 类名                | 功能               |
| -------------------------- | ------------------- | ------------------ |
| `FileBasedChatMemory.java` | FileBasedChatMemory | 基于文件的对话记忆 |

## FileBasedChatMemory 详解

```java
public class FileBasedChatMemory implements ChatMemory {
    private final String BASE_DIR;
    private static final Kryo kryo = new Kryo();

    // 核心方法
    public void add(String conversationId, List<Message> messages);
    public List<Message> get(String conversationId);
    public void clear(String conversationId);
}
```

### 存储结构

```
{BASE_DIR}/
├── user123.kryo      # 用户123的对话记录
├── user456.kryo      # 用户456的对话记录
└── default.kryo      # 默认会话记录
```

### 使用示例

```java
// 创建记忆实例
FileBasedChatMemory memory = new FileBasedChatMemory("/tmp/chat");

// 配合 Advisor 使用
ChatClient client = ChatClient.builder(chatModel)
    .defaultAdvisors(new MessageChatMemoryAdvisor(memory))
    .build();

// 指定会话 ID
client.prompt()
    .user("你好")
    .advisors(spec -> spec.param(
        MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY,
        "user123"
    ))
    .call();
```

### 依赖

```xml
<dependency>
    <groupId>com.esotericsoftware</groupId>
    <artifactId>kryo</artifactId>
    <version>5.5.0</version>
</dependency>
```
