package com.github.tianchenghang.advisor;

import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.CallAdvisor;
import org.springframework.ai.chat.client.advisor.api.CallAdvisorChain;
import org.springframework.ai.chat.client.advisor.api.StreamAdvisor;
import org.springframework.ai.chat.client.advisor.api.StreamAdvisorChain;
import reactor.core.publisher.Flux;

// Re-Reading Improves Reasoning in Large Language Models
public class ReReadingAdvisor implements CallAdvisor, StreamAdvisor {

  private ChatClientRequest before(ChatClientRequest chatClientRequest) {
    var userText = chatClientRequest.prompt().getUserMessage().getText();
    chatClientRequest.context().put("re2_input_query", userText);
    var newUserText =
        """
      %s
      Read the question again: %s
      """
            .formatted(userText, userText);
    var newPrompt = chatClientRequest.prompt().augmentUserMessage(newUserText);
    return new ChatClientRequest(newPrompt, chatClientRequest.context());
  }

  @Override
  public ChatClientResponse adviseCall(
      ChatClientRequest chatClientRequest, CallAdvisorChain callAdvisorChain) {
    return callAdvisorChain.nextCall(this.before(chatClientRequest));
  }

  @Override
  public Flux<ChatClientResponse> adviseStream(
      ChatClientRequest chatClientRequest, StreamAdvisorChain streamAdvisorChain) {
    return streamAdvisorChain.nextStream(this.before(chatClientRequest));
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
