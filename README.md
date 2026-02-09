# ai-code

## git worktree

```bash
git worktree add ../ai-code-dev dev
git worktree list
git worktree remove ../ai-code-dev
```

.git/hooks/pre-commit

```bash
#!/bin/bash

echo "run mvn fmt:format"

mvn com.spotify.fmt:fmt-maven-plugin:format -q

if ! git diff --quiet; then
  echo "run git add -u"
  git add -u
fi

echo "format ok"
exit 0
```

## 大模型

- 多模态
- 系统提示词
- 会话记忆
- 结构化输出 (JSON)
  - 大模型 JSON schema
  - Prompt + JSON Mode
  - Prompt
- 检索增强生成 (RAG, Retrieval-Augmented Generation) 解决大模型时效性限制, 和幻觉问题
  - 创建索引: 原始文档 -> 文档预处理 -> 文档切片 (基于固定大小, 语义边界, 递归分割) -> embedding 模型向量转换 -> 向量表示 -> 向量存储
  - 检索生成
    - 文档检索: 用户问题 -> embedding 模型向量转换 -> 向量表示 -> 条件搜索, 相似度搜索向量数据库 -> 相关文档切片 -> rank 模型精排 -> topK 最相关文档切片
    - 查询增强: 增强提示词 (用户问题 + topK 最相关文档切片) -> 大模型 LLM -> response
- 工具
- MCP: Model Context Protocol 模型上下文协议
  - [mcp.so](https://mcp.so/)
- 护轨 Guardrail, 类似拦截器, 分为输入护轨和输出护轨, 例如调用 AI 前鉴权, 敏感词检测, 调用 AI 后记录日志
- SSE 流式响应


## Start

```bash
mvn spring-boot:run
```
