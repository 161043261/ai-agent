# Yu-AI-Agent 项目技术文档

## 项目概述

Yu-AI-Agent 是基于 **Spring Boot 3.4 + Spring AI** 构建的 AI 超级智能体项目, 支持对话记忆、RAG 知识库、工具调用、MCP 服务等核心能力;

## 技术栈

| 层级       | 技术                         |
| ---------- | ---------------------------- |
| 框架       | Spring Boot 3.4              |
| AI 框架    | Spring AI 1.0.0-M6           |
| LLM        | 阿里云 DashScope (qwen-plus) |
| 向量数据库 | SimpleVectorStore / PgVector |
| 序列化     | Kryo                         |
| 工具库     | Hutool, Jsoup, iText         |

## 模块架构

```
com.yupi.yuaiagent/
├── agent/          # 智能体核心 (BaseAgent, ReActAgent, ToolCallAgent, YuManus)
├── tools/          # 工具集 (文件/搜索/网页/终端/PDF)
├── rag/            # RAG 知识库 (向量存储/文档加载/查询重写)
├── app/            # 业务应用 (LoveApp 恋爱大师)
├── advisor/        # 拦截器 (日志/Re2推理增强)
├── chatmemory/     # 对话记忆 (文件持久化)
├── controller/     # API 接口
├── config/         # 配置 (CORS)
├── constant/       # 常量
└── demo/           # 演示代码
```

## 核心功能

| 功能       | 模块        | API                       |
| ---------- | ----------- | ------------------------- |
| 基础对话   | app         | `/ai/love_app/chat/sync`  |
| 流式对话   | app         | `/ai/love_app/chat/sse`   |
| RAG 问答   | rag + app   | `/ai/love_app/chat/rag`   |
| 工具调用   | tools + app | `/ai/love_app/chat/tools` |
| 超级智能体 | agent       | `/ai/manus/chat`          |

## 快速开始

```bash
# 1. 配置环境变量
export DASHSCOPE_API_KEY=your_api_key

# 2. 启动服务
mvn spring-boot:run

# 3. 访问接口
curl "http://localhost:8123/ai/love_app/chat/sync?message=你好"
```

## 配置文件

```yaml
# application.yml
server:
  port: 8123

spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      chat:
        model: qwen-plus

search-api:
  api-key: ${SEARCH_API_KEY}
```

## 各模块文档

- [Agent 智能体模块](agent/README.md)
- [Tools 工具模块](tools/README.md)
- [RAG 知识库模块](rag/README.md)
- [App 应用模块](app/README.md)
- [Advisor 拦截器模块](advisor/README.md)
- [ChatMemory 记忆模块](chatmemory/README.md)
- [Controller 控制器模块](controller/README.md)
- [Config 配置模块](config/README.md)
- [Demo 演示模块](demo/README.md)
