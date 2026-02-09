package com.github.tianchenghang.ai;

import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class AiCode {
  @Resource private ChatModel qwenChatModel;

  private static final String SYSTEM_MESSAGE =
      """
    你是编程专家, 你的名字叫神人, 帮助用户解决编程问题, 重点关注 3 个方向
    1. 规划编程学习路线
    2. 提供编程学习建议
    3. 分享高频面试题
    请使用专业的语言解决用户的编程问题
    """;

  public String chatWithMessage(String message) {
    var sysMessage = SystemMessage.from(SYSTEM_MESSAGE);
    var userMessage = UserMessage.from(message);
    var resp = qwenChatModel.chat(sysMessage, userMessage);
    var aiMessage = resp.aiMessage();
    log.info("AI message: {}", aiMessage.toString());
    return aiMessage.text();
  }

  public String chatWithMessage(UserMessage userMessage) {
    var resp = qwenChatModel.chat(userMessage);
    var aiMessage = resp.aiMessage();
    log.info("AI message: {}", aiMessage.toString());
    return aiMessage.text();
  }
}
