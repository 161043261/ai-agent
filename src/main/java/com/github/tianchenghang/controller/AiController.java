package com.github.tianchenghang.controller;

import com.github.tianchenghang.ai.IAiCodeService;
import jakarta.annotation.Resource;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/ai")
public class AiController {
  @Resource private IAiCodeService aiCodeService;

  @GetMapping("/chat")
  public Flux<ServerSentEvent> chat(String memoryId, String message) {
    return aiCodeService
        .chatStream(memoryId, message)
        .map(chunk -> ServerSentEvent.<String>builder().data(chunk).build());
  }
}
