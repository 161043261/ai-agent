package com.github.tianchenghang.ai;

import jakarta.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class AiCodeServiceTest {

  @Resource private IAiCodeService aiCodeService;

  @Test
  void chat() {
    var res = aiCodeService.chat("你好, 我是一名前端程序员");
    System.out.println(res);
  }

  @Test
  void chatWithMemory() {
    var res = aiCodeService.chat("你好, 我是一名前端程序员");
    System.out.println(res);
    var res2 = aiCodeService.chat("你好, 我是谁?");
    System.out.println(res2);
  }

  @Test
  void chatWithReport() {
    var message = "你好, 我是一名前端程序员, 我想学习 Node.js 后端, 请制定学习计划";
    var report = aiCodeService.chatForReport(message);
    System.out.println(report);
  }

  @Test
  void chatWithRag() {
    var res = aiCodeService.chatWithRag("JS 错误处理方式?");
    var content = res.content();
    var sources = res.sources();
    System.out.println(content);
    System.out.println(sources);
  }

  @Test
  void chatWithTools() {
    var res = aiCodeService.chat("有哪些高频的计算机网络面试题?");
    System.out.println(res);
  }

  @Test
  void chatWithMcp() {
    var res = aiCodeService.chat("联网搜索深圳有哪些美食?");
    System.out.println(res);
  }

  @Test
  void chatWithGuardrail() {
    var res = aiCodeService.chat("Damn, motherfucker");
    System.out.println(res);
  }
}
