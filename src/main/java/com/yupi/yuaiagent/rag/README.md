# RAG 知识库模块

## 模块概述

RAG (Retrieval-Augmented Generation, 检索增强生成) 模块为 AI 应用提供知识库能力; 该模块支持从 Markdown 文档加载知识、向量化存储、语义检索和查询增强等功能, 使 AI 能够基于特定知识库回答问题;

## 架构设计

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          RAG 知识库流程                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Markdown   │───►│  Document    │───►│  Embedding   │───►│   Vector     │
│    Files     │    │   Loader     │    │    Model     │    │    Store     │
│  (知识文档)   │    │ (文档加载器)  │    │ (向量化模型)  │    │  (向量存储)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Keyword     │
                    │  Enricher    │
                    │ (元数据增强)  │
                    └──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    User      │───►│   Query      │───►│   Vector     │───►│     AI       │
│   Query      │    │  Rewriter    │    │   Search     │    │   Answer     │
│  (用户查询)   │    │ (查询重写)    │    │ (向量检索)    │    │  (生成回答)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

## 文件清单

| 文件                                          | 类名                                   | 功能描述              |
| --------------------------------------------- | -------------------------------------- | --------------------- |
| `LoveAppDocumentLoader.java`                  | LoveAppDocumentLoader                  | Markdown 文档加载器   |
| `LoveAppVectorStoreConfig.java`               | LoveAppVectorStoreConfig               | 内存向量存储配置      |
| `PgVectorVectorStoreConfig.java`              | PgVectorVectorStoreConfig              | PgVector 向量存储配置 |
| `LoveAppRagCloudAdvisorConfig.java`           | LoveAppRagCloudAdvisorConfig           | 阿里云 RAG 顾问配置   |
| `LoveAppRagCustomAdvisorFactory.java`         | LoveAppRagCustomAdvisorFactory         | 自定义 RAG 顾问工厂   |
| `LoveAppContextualQueryAugmenterFactory.java` | LoveAppContextualQueryAugmenterFactory | 上下文查询增强器      |
| `QueryRewriter.java`                          | QueryRewriter                          | 查询重写器            |
| `MyTokenTextSplitter.java`                    | MyTokenTextSplitter                    | Token 文本切分器      |
| `MyKeywordEnricher.java`                      | MyKeywordEnricher                      | AI 文档元信息增强     |

---

## 组件详细说明

### 1. LoveAppDocumentLoader (文档加载器)

**文件路径**: `LoveAppDocumentLoader.java`

**功能**: 从 classpath 加载 Markdown 文档, 并提取元数据

```java
@Component
public class LoveAppDocumentLoader {

    @Resource
    private ResourcePatternResolver resourcePatternResolver;

    /**
     * 加载所有 Markdown 文档
     * 文档位置: classpath:document/*.md
     */
    public List<Document> loadMarkdowns() {
        Resource[] resources = resourcePatternResolver
            .getResources("classpath:document/*.md");

        List<Document> allDocuments = new ArrayList<>();

        for (Resource resource : resources) {
            // 提取文件名中的状态标签
            // 例如: "恋爱常见问题 - 单身篇.md" -> status = "单身"
            String fileName = resource.getFilename();
            String status = fileName.substring(
                fileName.length() - 5,
                fileName.length() - 3
            );

            // 使用 MarkdownDocumentReader 解析
            MarkdownDocumentReader reader = new MarkdownDocumentReader(
                resource,
                MarkdownDocumentReaderConfig.defaultConfig()
            );

            List<Document> docs = reader.read();

            // 为每个文档添加 status 元数据
            for (Document doc : docs) {
                doc.getMetadata().put("status", status);
            }

            allDocuments.addAll(docs);
        }

        return allDocuments;
    }
}
```

**文档目录结构**:

```
resources/
└── document/
    ├── 恋爱常见问题和回答 - 单身篇.md  → status = "单身"
    ├── 恋爱常见问题和回答 - 恋爱篇.md  → status = "恋爱"
    └── 恋爱常见问题和回答 - 已婚篇.md  → status = "已婚"
```

---

### 2. LoveAppVectorStoreConfig (内存向量存储配置)

**文件路径**: `LoveAppVectorStoreConfig.java`

**功能**: 配置基于内存的向量存储, 适合小规模知识库

```java
@Configuration
public class LoveAppVectorStoreConfig {

    @Resource
    private LoveAppDocumentLoader loveAppDocumentLoader;

    @Resource
    private MyKeywordEnricher myKeywordEnricher;

    @Bean
    VectorStore loveAppVectorStore(EmbeddingModel dashscopeEmbeddingModel) {
        // 1. 创建内存向量存储
        SimpleVectorStore vectorStore = SimpleVectorStore
            .builder(dashscopeEmbeddingModel)
            .build();

        // 2. 加载文档
        List<Document> documents = loveAppDocumentLoader.loadMarkdowns();

        // 3. 使用 AI 增强文档元数据
        List<Document> enrichedDocs = myKeywordEnricher.enrichDocuments(documents);

        // 4. 添加到向量存储
        vectorStore.add(enrichedDocs);

        return vectorStore;
    }
}
```

**SimpleVectorStore 特点**:

- 基于内存存储
- 启动时加载所有文档
- 适合小规模知识库 (<10000 文档)
- 重启后数据丢失

---

### 3. PgVectorVectorStoreConfig (PgVector 向量存储配置)

**文件路径**: `PgVectorVectorStoreConfig.java`

**功能**: 配置基于 PostgreSQL + pgvector 扩展的持久化向量存储

```java
@Configuration
public class PgVectorVectorStoreConfig {

    @Resource
    private LoveAppDocumentLoader loveAppDocumentLoader;

    @Resource
    private JdbcTemplate jdbcTemplate;

    @Bean
    VectorStore pgVectorVectorStore(EmbeddingModel dashscopeEmbeddingModel) {
        // 1. 创建 PgVector 存储
        PgVectorStore vectorStore = PgVectorStore
            .builder(jdbcTemplate, dashscopeEmbeddingModel)
            .dimensions(1536)
            .tableName("love_app_vectors")
            .build();

        // 2. 检查是否需要初始化数据
        if (vectorStore.count() == 0) {
            List<Document> documents = loveAppDocumentLoader.loadMarkdowns();
            vectorStore.add(documents);
        }

        return vectorStore;
    }
}
```

**PgVector 配置要求**:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/yuaiagent
    username: postgres
    password: password
```

**PostgreSQL 准备**:

```sql
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 向量表会自动创建
```

---

### 4. QueryRewriter (查询重写器)

**文件路径**: `QueryRewriter.java`

**功能**: 使用 AI 优化用户查询, 提升检索效果

```java
@Component
public class QueryRewriter {

    @Resource
    private ChatClient.Builder chatClientBuilder;

    private static final String REWRITE_PROMPT = """
        你是一个查询优化专家; 请将用户的原始问题改写为更适合在知识库中检索的查询语句;

        要求：
        1. 保持原意不变
        2. 使用更精确的关键词
        3. 去除口语化表达
        4. 可以拆分为多个子查询

        原始问题：{query}

        请直接输出改写后的查询 (一行一个) ：
        """;

    public List<String> doQueryRewrite(String originalQuery) {
        ChatClient chatClient = chatClientBuilder.build();

        String response = chatClient.prompt()
            .user(REWRITE_PROMPT.replace("{query}", originalQuery))
            .call()
            .content();

        // 解析多行输出为查询列表
        return Arrays.stream(response.split("\n"))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    }
}
```

**查询重写示例**:

```
原始查询: "我喜欢一个人但不敢表白怎么办?"
重写结果:
  - 表白技巧
  - 如何鼓起勇气表白
  - 暗恋对象表白方法
```

---

### 5. MyKeywordEnricher (文档元数据增强器)

**文件路径**: `MyKeywordEnricher.java`

**功能**: 使用 AI 为文档生成关键词和摘要, 增强检索效果

```java
@Component
public class MyKeywordEnricher {

    @Resource
    private ChatModel dashscopeChatModel;

    private static final String ENRICH_PROMPT = """
        分析以下文本内容, 提取3-5个关键词 (用逗号分隔) ：

        {content}

        关键词：
        """;

    public List<Document> enrichDocuments(List<Document> documents) {
        ChatClient chatClient = ChatClient.builder(dashscopeChatModel).build();

        return documents.stream().map(doc -> {
            String content = doc.getText();

            // 使用 AI 提取关键词
            String keywords = chatClient.prompt()
                .user(ENRICH_PROMPT.replace("{content}", content))
                .call()
                .content();

            // 添加到元数据
            doc.getMetadata().put("keywords", keywords);

            return doc;
        }).toList();
    }
}
```

**增强效果**:

```
原始文档:
  content: "如何追求暗恋对象?首先要了解对方的兴趣爱好..."
  metadata: {status: "单身"}

增强后:
  content: "如何追求暗恋对象?首先要了解对方的兴趣爱好..."
  metadata: {
    status: "单身",
    keywords: "暗恋, 追求, 兴趣爱好, 表白, 恋爱技巧"
  }
```

---

### 6. MyTokenTextSplitter (Token 文本切分器)

**文件路径**: `MyTokenTextSplitter.java`

**功能**: 按 Token 数量切分长文档

```java
@Component
public class MyTokenTextSplitter {

    private static final int MAX_TOKENS = 500;
    private static final int OVERLAP_TOKENS = 50;

    public List<Document> splitDocuments(List<Document> documents) {
        TokenTextSplitter splitter = TokenTextSplitter.builder()
            .withChunkSize(MAX_TOKENS)
            .withChunkOverlap(OVERLAP_TOKENS)
            .build();

        return documents.stream()
            .flatMap(doc -> splitter.split(doc).stream())
            .toList();
    }
}
```

**切分策略**:

- `MAX_TOKENS = 500`: 每个切片最大 500 个 Token
- `OVERLAP_TOKENS = 50`: 相邻切片重叠 50 个 Token, 保持上下文连贯

---

### 7. LoveAppRagCloudAdvisorConfig (阿里云 RAG 顾问配置)

**文件路径**: `LoveAppRagCloudAdvisorConfig.java`

**功能**: 配置阿里云知识库服务 (DashScope RAG)

```java
@Configuration
public class LoveAppRagCloudAdvisorConfig {

    @Value("${spring.ai.dashscope.api-key}")
    private String dashScopeApiKey;

    @Bean
    Advisor loveAppRagCloudAdvisor() {
        // 配置阿里云知识库服务
        DashScopeDocumentRetriever retriever = DashScopeDocumentRetriever
            .builder()
            .apiKey(dashScopeApiKey)
            .knowledgeBaseId("kb-xxx")  // 阿里云知识库 ID
            .topK(5)
            .build();

        return RetrievalAugmentationAdvisor.builder()
            .documentRetriever(retriever)
            .build();
    }
}
```

**使用阿里云 RAG 的优势**:

- 云端知识库管理
- 自动文档处理和向量化
- 企业级可扩展性

---

### 8. LoveAppRagCustomAdvisorFactory (自定义 RAG 顾问工厂)

**文件路径**: `LoveAppRagCustomAdvisorFactory.java`

**功能**: 创建支持过滤条件的自定义 RAG 顾问

```java
@Component
public class LoveAppRagCustomAdvisorFactory {

    @Resource
    private VectorStore loveAppVectorStore;

    /**
     * 创建带状态过滤的 RAG 顾问
     * @param status 用户状态 (单身/恋爱/已婚)
     */
    public Advisor createAdvisorWithFilter(String status) {
        // 构建过滤表达式
        FilterExpressionBuilder builder = new FilterExpressionBuilder();
        Expression filter = builder.eq("status", status).build();

        // 创建带过滤的检索器
        SearchRequest searchRequest = SearchRequest.builder()
            .filterExpression(filter)
            .topK(5)
            .build();

        VectorStoreDocumentRetriever retriever = VectorStoreDocumentRetriever
            .builder()
            .vectorStore(loveAppVectorStore)
            .searchRequest(searchRequest)
            .build();

        return RetrievalAugmentationAdvisor.builder()
            .documentRetriever(retriever)
            .build();
    }
}
```

**过滤检索示例**:

```java
// 用户是单身状态, 只检索单身相关文档
Advisor advisor = factory.createAdvisorWithFilter("单身");
```

---

### 9. LoveAppContextualQueryAugmenterFactory (上下文查询增强器)

**文件路径**: `LoveAppContextualQueryAugmenterFactory.java`

**功能**: 将检索到的文档上下文注入到用户查询中

```java
@Component
public class LoveAppContextualQueryAugmenterFactory {

    private static final String CONTEXT_TEMPLATE = """
        请根据以下参考资料回答用户问题; 如果参考资料中没有相关信息, 请基于你的知识回答;

        参考资料：
        {context}

        用户问题：{query}
        """;

    public QueryAugmenter createAugmenter() {
        return ContextualQueryAugmenter.builder()
            .promptTemplate(CONTEXT_TEMPLATE)
            .build();
    }
}
```

---

## RAG 完整流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                      RAG 问答完整流程                                │
└─────────────────────────────────────────────────────────────────────┘

1. 用户提问
   │
   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  QueryRewriter.doQueryRewrite()                                      │
│  将口语化问题改写为检索友好的查询                                     │
│  "我该怎么追她?" → ["表白技巧", "追求方法", "恋爱建议"]              │
└─────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  VectorStore.similaritySearch()                                      │
│  向量相似度检索, 找到最相关的文档片段                                 │
│  返回 Top-K 个最相似的 Document                                      │
└─────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ContextualQueryAugmenter                                            │
│  将检索结果作为上下文注入到 Prompt 中                                 │
│  "参考资料：{documents}\n用户问题：{query}"                          │
└─────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ChatClient.prompt().call()                                          │
│  调用 AI 生成基于上下文的回答                                        │
└─────────────────────────────────────────────────────────────────────┘
   │
   ▼
   返回 AI 回答
```

---

## 使用示例

### 1. 基础 RAG 问答

```java
@Service
public class RagService {

    @Resource
    private ChatClient.Builder chatClientBuilder;

    @Resource
    private VectorStore loveAppVectorStore;

    public String askWithRag(String question) {
        ChatClient chatClient = chatClientBuilder.build();

        return chatClient.prompt()
            .user(question)
            .advisors(new QuestionAnswerAdvisor(loveAppVectorStore))
            .call()
            .content();
    }
}
```

### 2. 带查询重写的 RAG

```java
@Service
public class AdvancedRagService {

    @Resource
    private QueryRewriter queryRewriter;

    @Resource
    private VectorStore loveAppVectorStore;

    @Resource
    private ChatClient.Builder chatClientBuilder;

    public String askWithRewrite(String question) {
        // 1. 查询重写
        List<String> rewrittenQueries = queryRewriter.doQueryRewrite(question);

        // 2. 多查询检索
        Set<Document> allDocs = new HashSet<>();
        for (String query : rewrittenQueries) {
            List<Document> docs = loveAppVectorStore.similaritySearch(query);
            allDocs.addAll(docs);
        }

        // 3. 构建上下文
        String context = allDocs.stream()
            .map(Document::getText)
            .collect(Collectors.joining("\n\n"));

        // 4. AI 生成回答
        return chatClientBuilder.build()
            .prompt()
            .user("参考资料：\n" + context + "\n\n问题：" + question)
            .call()
            .content();
    }
}
```

### 3. 带过滤的 RAG

```java
@Service
public class FilteredRagService {

    @Resource
    private LoveAppRagCustomAdvisorFactory advisorFactory;

    @Resource
    private ChatClient.Builder chatClientBuilder;

    public String askWithFilter(String question, String userStatus) {
        // 根据用户状态创建过滤顾问
        Advisor advisor = advisorFactory.createAdvisorWithFilter(userStatus);

        return chatClientBuilder.build()
            .prompt()
            .user(question)
            .advisors(advisor)
            .call()
            .content();
    }
}
```

---

## 配置要求

```yaml
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}
      embedding:
        model: text-embedding-v2 # 向量化模型

  # PgVector 配置 (可选)
  datasource:
    url: jdbc:postgresql://localhost:5432/yuaiagent
    username: postgres
    password: password
```

---

## 依赖清单

```xml
<!-- Spring AI 向量存储 -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-pgvector</artifactId>
</dependency>

<!-- Markdown 文档读取 -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-reader-markdown</artifactId>
</dependency>
```
