package com.github.tianchenghang.controller;

import com.github.tianchenghang.agent.CodeManus;
import com.github.tianchenghang.app.CodeApp;
import jakarta.annotation.Resource;
import java.io.IOException;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/ai")
public class AiController {

  @Resource private CodeApp codeApp;

  @Resource private ToolCallback[] allTools;

  @Resource private ChatModel dashscopeChatModel;

  @GetMapping("/code-app/chat/sync")
  public String doChatWithCodeAppSync(String message, String chatId) {
    return codeApp.doChat(message, chatId);
  }

  @GetMapping(value = "/code-app/chat/sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<String> doChatWithCodeAppSSE(String message, String chatId) {
    return codeApp.doChatByStream(message, chatId);
  }

  @GetMapping(value = "/code-app/chat/sse")
  public Flux<ServerSentEvent<String>> doChatWithCodeAppSse(String message, String chatId) {
    return codeApp
        .doChatByStream(message, chatId)
        .map(chunk -> ServerSentEvent.<String>builder().data(chunk).build());
  }

  @GetMapping(value = "/code-app/chat/sse-emitter")
  public SseEmitter doChatWithCodeAppSseEmitter(String message, String chatId) {
    var sseEmitter = new SseEmitter(180000L); // 3 分钟超时
    codeApp
        .doChatByStream(message, chatId)
        .subscribe(
            chunk -> {
              try {
                sseEmitter.send(chunk);
              } catch (IOException e) {
                sseEmitter.completeWithError(e);
              }
            },
            sseEmitter::completeWithError,
            sseEmitter::complete);
    return sseEmitter;
  }

  @GetMapping("/manus/chat")
  public SseEmitter doChatWithManus(String message) {
    var codeManus = new CodeManus(allTools, dashscopeChatModel);
    return codeManus.runStream(message);
  }
}
