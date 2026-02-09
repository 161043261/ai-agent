package com.github.tianchenghang.ai;

import com.github.tianchenghang.ai.tools.CodeQuestionTool;
import dev.langchain4j.mcp.McpToolProvider;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.StreamingChatModel;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.service.AiServices;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiCodeServiceFactory {
  //  @Resource private ChatModel chatModel;
  @Resource private ChatModel larkQwenChatModel;

  @Resource private ContentRetriever retriever;

  @Resource private McpToolProvider mcpToolProvider;

  @Resource private StreamingChatModel qwenStreamingChatModel;

  @Bean
  public IAiCodeService aiCodeService() {
    var chatMemory = MessageWindowChatMemory.withMaxMessages(10);
    //    var aiService = AiServices.create(IAiCodeService.class, chatModel);
    var aiService =
        AiServices.builder(IAiCodeService.class)
            .chatModel(larkQwenChatModel)
            .streamingChatModel(qwenStreamingChatModel) // 流式输出
            .chatMemory(chatMemory) // 会话记忆
            .chatMemoryProvider(memoryId -> MessageWindowChatMemory.withMaxMessages(10)) // 每个会话独立存储
            .contentRetriever(retriever) // 检索增强生成
            .tools(new CodeQuestionTool()) // 工具
            .toolProvider(mcpToolProvider) // mcp 工具
            .build();
    return aiService;
  }
}
