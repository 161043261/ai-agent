# Tools 工具模块

## 模块概述

Tools 模块提供了一系列可供 AI 智能体调用的工具集, 基于 Spring AI 的 `@Tool` 注解实现; 这些工具涵盖文件操作、网络搜索、网页抓取、终端命令执行、PDF 生成等功能, 使 AI 具备与外部世界交互的能力;

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                     ToolRegistration                             │
│                   (@Configuration)                               │
│         负责注册所有工具到 Spring 容器                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 创建 Bean: allTools
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ToolCallback[]                                │
│                   (工具回调数组)                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │FileOperation│  │ WebSearch   │  │ WebScraping │             │
│  │    Tool     │  │    Tool     │  │    Tool     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Resource   │  │  Terminal   │  │    PDF      │             │
│  │DownloadTool │  │OperationTool│  │GenerationTool│            │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐                                                │
│  │ Terminate   │  ← 特殊工具：终止智能体执行                     │
│  │    Tool     │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

## 文件清单

| 文件                         | 类名                  | 功能描述        |
| ---------------------------- | --------------------- | --------------- |
| `ToolRegistration.java`      | ToolRegistration      | 工具注册配置类  |
| `FileOperationTool.java`     | FileOperationTool     | 文件读写操作    |
| `WebSearchTool.java`         | WebSearchTool         | 网络搜索 (百度) |
| `WebScrapingTool.java`       | WebScrapingTool       | 网页内容抓取    |
| `ResourceDownloadTool.java`  | ResourceDownloadTool  | 资源文件下载    |
| `TerminalOperationTool.java` | TerminalOperationTool | 终端命令执行    |
| `PDFGenerationTool.java`     | PDFGenerationTool     | PDF 文档生成    |
| `TerminateTool.java`         | TerminateTool         | 终止智能体执行  |

---

## 工具详细说明

### 1. ToolRegistration (工具注册配置)

**文件路径**: `ToolRegistration.java`

**功能**: 统一注册所有工具, 创建 `allTools` Bean 供智能体使用

```java
@Configuration
public class ToolRegistration {

    @Value("${search-api.api-key}")
    private String searchApiKey;

    @Bean
    public ToolCallback[] allTools() {
        return ToolCallbacks.from(
            new FileOperationTool(),
            new WebSearchTool(searchApiKey),
            new WebScrapingTool(),
            new ResourceDownloadTool(),
            new TerminalOperationTool(),
            new PDFGenerationTool(),
            new TerminateTool()
        );
    }
}
```

**配置要求**:

```yaml
search-api:
  api-key: ${SEARCH_API_KEY} # SearchAPI.io 的 API Key
```

---

### 2. FileOperationTool (文件操作工具)

**文件路径**: `FileOperationTool.java`

**功能**: 提供文件读取和写入操作

#### 工具方法

**读取文件 `readFile`**

```java
@Tool(description = "Read content from a file at the specified path")
public String readFile(
    @ToolParam(description = "The path of the file to read") String filePath
) {
    return FileUtil.readUtf8String(filePath);
}
```

| 参数     | 类型   | 必填 | 说明             |
| -------- | ------ | ---- | ---------------- |
| filePath | String | 是   | 要读取的文件路径 |

| 返回值 | 说明                  |
| ------ | --------------------- |
| String | 文件内容 (UTF-8 编码) |

**写入文件 `writeFile`**

```java
@Tool(description = "Write content to a file at the specified path")
public String writeFile(
    @ToolParam(description = "The path of the file to write to") String filePath,
    @ToolParam(description = "The content to write to the file") String content
) {
    FileUtil.writeUtf8String(content, filePath);
    return "File written successfully to " + filePath;
}
```

| 参数     | 类型   | 必填 | 说明         |
| -------- | ------ | ---- | ------------ |
| filePath | String | 是   | 目标文件路径 |
| content  | String | 是   | 要写入的内容 |

**依赖**:

- `cn.hutool:hutool-all` - Hutool 工具库

---

### 3. WebSearchTool (网络搜索工具)

**文件路径**: `WebSearchTool.java`

**功能**: 使用 SearchAPI.io 进行百度搜索

#### 工具方法

```java
@Tool(description = "Search for information on Baidu using SearchAPI")
public String searchWeb(
    @ToolParam(description = "The search query string") String query
) {
    // 1. 构建 SearchAPI 请求
    String url = String.format(
        "https://www.searchapi.io/api/v1/search?engine=baidu&q=%s&api_key=%s",
        URLUtil.encode(query),
        apiKey
    );

    // 2. 发送请求获取结果
    String response = HttpUtil.get(url);

    // 3. 解析 JSON 结果
    JSONObject json = JSONUtil.parseObj(response);
    JSONArray organicResults = json.getJSONArray("organic_results");

    // 4. 格式化返回结果
    StringBuilder result = new StringBuilder();
    for (int i = 0; i < Math.min(10, organicResults.size()); i++) {
        JSONObject item = organicResults.getJSONObject(i);
        result.append(String.format("%d. %s\n   %s\n   %s\n\n",
            i + 1,
            item.getStr("title"),
            item.getStr("snippet"),
            item.getStr("link")
        ));
    }
    return result.toString();
}
```

| 参数  | 类型   | 必填 | 说明       |
| ----- | ------ | ---- | ---------- |
| query | String | 是   | 搜索关键词 |

| 返回值 | 说明                        |
| ------ | --------------------------- |
| String | 格式化的搜索结果 (最多10条) |

**返回格式示例**:

```
1. 标题1
   摘要内容1
   https://example1.com

2. 标题2
   摘要内容2
   https://example2.com
```

**依赖**:

- SearchAPI.io API Key
- `cn.hutool:hutool-all`

---

### 4. WebScrapingTool (网页抓取工具)

**文件路径**: `WebScrapingTool.java`

**功能**: 抓取网页内容, 提取纯文本

#### 工具方法

```java
@Tool(description = "Scrape the content from a web page URL and return the text content")
public String scrapeWebPage(
    @ToolParam(description = "The URL of the web page to scrape") String url
) {
    // 使用 Jsoup 抓取网页
    Document document = Jsoup.connect(url)
        .userAgent("Mozilla/5.0 ...")
        .get();

    // 提取纯文本
    return document.text();
}
```

| 参数 | 类型   | 必填 | 说明             |
| ---- | ------ | ---- | ---------------- |
| url  | String | 是   | 要抓取的网页 URL |

| 返回值 | 说明             |
| ------ | ---------------- |
| String | 网页的纯文本内容 |

**依赖**:

- `org.jsoup:jsoup` - HTML 解析库

---

### 5. ResourceDownloadTool (资源下载工具)

**文件路径**: `ResourceDownloadTool.java`

**功能**: 从 URL 下载资源文件到本地

#### 工具方法

```java
@Tool(description = "Download a resource from a URL and save it to a local file")
public String downloadResource(
    @ToolParam(description = "The URL of the resource to download") String url,
    @ToolParam(description = "The local file path to save the resource") String filePath
) {
    // 下载文件
    HttpUtil.downloadFile(url, FileUtil.file(filePath));
    return "Resource downloaded successfully to " + filePath;
}
```

| 参数     | 类型   | 必填 | 说明           |
| -------- | ------ | ---- | -------------- |
| url      | String | 是   | 资源 URL       |
| filePath | String | 是   | 保存的本地路径 |

| 返回值 | 说明         |
| ------ | ------------ |
| String | 下载结果消息 |

**依赖**:

- `cn.hutool:hutool-all`

---

### 6. TerminalOperationTool (终端操作工具)

**文件路径**: `TerminalOperationTool.java`

**功能**: 执行系统终端命令

#### 工具方法

```java
@Tool(description = "Execute a terminal command and return the output")
public String executeTerminalCommand(
    @ToolParam(description = "The terminal command to execute") String command
) {
    // 执行命令并获取输出
    String result = RuntimeUtil.execForStr(command);
    return result;
}
```

| 参数    | 类型   | 必填 | 说明         |
| ------- | ------ | ---- | ------------ |
| command | String | 是   | 要执行的命令 |

| 返回值 | 说明               |
| ------ | ------------------ |
| String | 命令执行的输出结果 |

**安全警告**:

> ⚠️ 此工具可执行任意系统命令, 请谨慎使用, 建议添加命令白名单机制

**依赖**:

- `cn.hutool:hutool-all` (RuntimeUtil)

---

### 7. PDFGenerationTool (PDF 生成工具)

**文件路径**: `PDFGenerationTool.java`

**功能**: 生成 PDF 文档

#### 工具方法

```java
@Tool(description = "Generate a PDF document with the given content")
public String generatePDF(
    @ToolParam(description = "The title of the PDF") String title,
    @ToolParam(description = "The content of the PDF") String content,
    @ToolParam(description = "The output file path") String outputPath
) {
    // 使用 iText 生成 PDF
    PdfWriter writer = new PdfWriter(outputPath);
    PdfDocument pdfDoc = new PdfDocument(writer);
    Document document = new Document(pdfDoc);

    // 添加标题和内容
    document.add(new Paragraph(title)
        .setFontSize(18)
        .setBold());
    document.add(new Paragraph(content));

    document.close();
    return "PDF generated successfully at " + outputPath;
}
```

| 参数       | 类型   | 必填 | 说明         |
| ---------- | ------ | ---- | ------------ |
| title      | String | 是   | PDF 标题     |
| content    | String | 是   | PDF 内容     |
| outputPath | String | 是   | 输出文件路径 |

| 返回值 | 说明         |
| ------ | ------------ |
| String | 生成结果消息 |

**依赖**:

- `com.itextpdf:itext7-core` - iText PDF 库

---

### 8. TerminateTool (终止工具)

**文件路径**: `TerminateTool.java`

**功能**: 特殊工具, 用于标记任务完成, 让智能体停止执行

#### 工具方法

```java
@Tool(description = "A tool to terminate the agent's execution when the task is completed")
public String doTerminate(
    @ToolParam(description = "The result or final message to return") String result
) {
    return "Task completed: " + result;
}
```

| 参数   | 类型   | 必填 | 说明           |
| ------ | ------ | ---- | -------------- |
| result | String | 是   | 最终结果或消息 |

**使用说明**:

- AI 调用此工具时, ToolCallAgent 会检测到并将状态设为 `FINISHED`
- 这是让智能体知道"任务已完成"的标准方式

---

## Spring AI @Tool 注解说明

### @Tool 注解

```java
@Tool(description = "工具描述, AI 会根据此描述决定何时调用此工具")
```

| 属性        | 说明                                    |
| ----------- | --------------------------------------- |
| description | 工具功能描述, AI 根据此内容判断是否调用 |

### @ToolParam 注解

```java
@ToolParam(description = "参数描述, 告诉 AI 应该传入什么值")
```

| 属性        | 说明         |
| ----------- | ------------ |
| description | 参数功能描述 |

---

## 使用示例

### 1. 在智能体中使用工具

```java
@Component
public class MyAgent extends ToolCallAgent {

    public MyAgent(ToolCallback[] allTools, ChatModel chatModel) {
        super(allTools);  // 传入所有可用工具
        // ...
    }
}
```

### 2. 手动调用工具

```java
@Service
public class MyService {

    public void processFile() {
        FileOperationTool tool = new FileOperationTool();

        // 读取文件
        String content = tool.readFile("/path/to/file.txt");

        // 写入文件
        tool.writeFile("/path/to/output.txt", "处理后的内容");
    }
}
```

### 3. 添加自定义工具

```java
// 1. 创建工具类
public class MyCustomTool {

    @Tool(description = "自定义工具描述")
    public String myToolMethod(
        @ToolParam(description = "参数描述") String param
    ) {
        // 实现逻辑
        return "result";
    }
}

// 2. 注册到 ToolRegistration
@Bean
public ToolCallback[] allTools() {
    return ToolCallbacks.from(
        new FileOperationTool(),
        new WebSearchTool(searchApiKey),
        new MyCustomTool()  // 添加自定义工具
        // ...
    );
}
```

---

## 依赖清单

```xml
<!-- Hutool 工具库 -->
<dependency>
    <groupId>cn.hutool</groupId>
    <artifactId>hutool-all</artifactId>
    <version>5.8.25</version>
</dependency>

<!-- Jsoup HTML 解析 -->
<dependency>
    <groupId>org.jsoup</groupId>
    <artifactId>jsoup</artifactId>
    <version>1.17.2</version>
</dependency>

<!-- iText PDF 生成 -->
<dependency>
    <groupId>com.itextpdf</groupId>
    <artifactId>itext7-core</artifactId>
    <version>7.2.5</version>
    <type>pom</type>
</dependency>
```

---

## 配置要求

```yaml
# SearchAPI 配置
search-api:
  api-key: ${SEARCH_API_KEY}

# 文件存储目录 (常量定义)
# FileConstant.FILE_SAVE_DIR = System.getProperty("user.dir") + "/tmp"
```

---

## 安全注意事项

1. **TerminalOperationTool**: 可执行任意命令, 生产环境建议：
   - 添加命令白名单
   - 限制可执行命令范围
   - 添加审计日志

2. **FileOperationTool**: 可读写任意文件, 建议：
   - 限制可操作的目录范围
   - 添加文件路径校验

3. **WebSearchTool**: 需要 API Key, 建议：
   - 使用环境变量存储
   - 添加请求频率限制
