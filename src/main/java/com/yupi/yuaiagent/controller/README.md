# Controller 控制器模块

## 模块概述

Controller 模块提供 HTTP API 接口, 暴露 AI 服务能力;

## 文件清单

| 文件                    | 类名             | 路径前缀  |
| ----------------------- | ---------------- | --------- |
| `AiController.java`     | AiController     | `/ai`     |
| `HealthController.java` | HealthController | `/health` |

## API 接口列表

### AiController

| 端点                                  | 方法 | 功能            | 返回类型              |
| ------------------------------------- | ---- | --------------- | --------------------- |
| `/ai/love_app/chat/sync`              | GET  | 同步对话        | String                |
| `/ai/love_app/chat/sse`               | GET  | SSE 流式 (Flux) | Flux<String>          |
| `/ai/love_app/chat/server_sent_event` | GET  | ServerSentEvent | Flux<ServerSentEvent> |
| `/ai/love_app/chat/sse_emitter`       | GET  | SseEmitter      | SseEmitter            |
| `/ai/love_app/chat/rag`               | GET  | RAG 问答        | String                |
| `/ai/love_app/chat/tools`             | GET  | 工具调用        | String                |
| `/ai/manus/chat`                      | GET  | Manus 智能体    | SseEmitter            |

### 请求参数

| 参数    | 类型   | 必填 | 说明                   |
| ------- | ------ | ---- | ---------------------- |
| message | String | 是   | 用户消息               |
| chatId  | String | 否   | 会话ID, 默认 "default" |

### 示例

```bash
# 同步调用
curl "http://localhost:8123/ai/love_app/chat/sync?message=你好&chatId=user1"

# SSE 流式
curl -N "http://localhost:8123/ai/love_app/chat/sse?message=你好"

# Manus 智能体
curl -N "http://localhost:8123/ai/manus/chat?message=搜索今天的新闻"
```

### HealthController

```java
@RestController
@RequestMapping("/health")
public class HealthController {
    @GetMapping
    public String health() {
        return "OK";
    }
}
```
