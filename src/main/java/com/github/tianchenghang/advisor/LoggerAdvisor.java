package com.github.tianchenghang.advisor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClientMessageAggregator;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.CallAdvisor;
import org.springframework.ai.chat.client.advisor.api.CallAdvisorChain;
import org.springframework.ai.chat.client.advisor.api.StreamAdvisor;
import org.springframework.ai.chat.client.advisor.api.StreamAdvisorChain;
import reactor.core.publisher.Flux;

@Slf4j
public class LoggerAdvisor implements CallAdvisor, StreamAdvisor {

  private ChatClientRequest before(ChatClientRequest request) {
    log.info("AI request: {}", request.prompt());
    return request;
  }

  private void observeAfter(ChatClientResponse chatClientResponse) {
    log.info(
        "AI response: {}", chatClientResponse.chatResponse().getResult().getOutput().getText());
  }

  @Override
  public ChatClientResponse adviseCall(
      ChatClientRequest chatClientRequest, CallAdvisorChain callAdvisorChain) {
    chatClientRequest = before(chatClientRequest);
    var chatClientResponse = callAdvisorChain.nextCall(chatClientRequest);
    observeAfter(chatClientResponse);
    return chatClientResponse;
  }

  @Override
  public Flux<ChatClientResponse> adviseStream(
      ChatClientRequest chatClientRequest, StreamAdvisorChain streamAdvisorChain) {
    chatClientRequest = before(chatClientRequest);
    var chatClientResponseFlux = streamAdvisorChain.nextStream(chatClientRequest);
    return (new ChatClientMessageAggregator())
        .aggregateChatClientResponse(chatClientResponseFlux, this::observeAfter);
  }

  @Override
  public String getName() {
    return this.getClass().getSimpleName();
  }

  @Override
  public int getOrder() {
    return 0;
  }
}
