package com.github.tianchenghang.ai;

import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class AiCodeTest {

  @Resource private AiCode aiCode;

  @Test
  void chat() {
    aiCode.chatWithMessage("你好, 我是一名前端程序员");
  }

  @Test
  void chatWithMessage() {
    var userMessage =
        UserMessage.from(
            TextContent.from("描述图片"),
            ImageContent.from(
                "https://www.apple.com.cn/assets-www/en_WW/mac/01_product_tile/large/mbp_14_16_581de5ee1_2x.jpg"));
    aiCode.chatWithMessage(userMessage);
  }
}
