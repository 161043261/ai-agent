package com.github.tianchenghang.ai.mcp;

import dev.langchain4j.mcp.McpToolProvider;
import dev.langchain4j.mcp.client.DefaultMcpClient;
import dev.langchain4j.mcp.client.transport.http.HttpMcpTransport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class McpConfig {

  @Value("${bigmodel.api-key}")
  private String apiKey;

  @Bean
  public McpToolProvider mcpToolProvider() {
    // 和 mcp 服务通信
    var transport =
        new HttpMcpTransport.Builder()
            .sseUrl("https://open.bigmodel.cn/api/mcp/web_search/sse?Authorization=" + apiKey)
            .logRequests(true) // 开启日志
            .logResponses(true)
            .build();
    // 创建 mcp 客户端
    var mcpClient =
        new DefaultMcpClient.Builder().key("yupiMcpClient").transport(transport).build();
    // 从 mcp 客户端获取工具
    var toolProvider = McpToolProvider.builder().mcpClients(mcpClient).build();
    return toolProvider;
  }
}
