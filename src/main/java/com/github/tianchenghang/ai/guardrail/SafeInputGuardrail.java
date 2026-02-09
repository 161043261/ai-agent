package com.github.tianchenghang.ai.guardrail;

import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.guardrail.InputGuardrail;
import dev.langchain4j.guardrail.InputGuardrailResult;
import java.util.Set;

public class SafeInputGuardrail implements InputGuardrail {
  private static final Set<String> sensitiveWords = Set.of("fuck", "fucker", "motherfucker");

  @Override
  public InputGuardrailResult validate(UserMessage userMessage) {
    var inputText = userMessage.singleText().toLowerCase();
    var words = inputText.split("\\W+");
    for (var word : words) {
      if (sensitiveWords.contains(word)) {
        return fatal("Sensitive word detected: " + word);
      }
    }
    return success();
  }
}
