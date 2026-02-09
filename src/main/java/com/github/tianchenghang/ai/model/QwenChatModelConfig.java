package com.github.tianchenghang.ai.model;

import dev.langchain4j.community.model.dashscope.QwenChatModel;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.listener.ChatModelListener;
import jakarta.annotation.Resource;
import java.util.List;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
@ConfigurationProperties(prefix = "langchain4j.community.dashscope.chat-model")
@Data
public class QwenChatModelConfig {
  private String modelName;
  private String apiKey;

  @Resource private ChatModelListener chatModelListener;

  //  @Bean(name = "qwenChatModel")
  @Bean
  public ChatModel larkQwenChatModel() {
    log.info("Building qwen chat model");
    return QwenChatModel.builder()
        .apiKey(apiKey)
        .modelName(modelName)
        .listeners(List.of(chatModelListener))
        .build();
  }
}
