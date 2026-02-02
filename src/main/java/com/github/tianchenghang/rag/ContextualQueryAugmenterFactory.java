package com.github.tianchenghang.rag;

import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.rag.generation.augmentation.ContextualQueryAugmenter;

/** Factory for creating contextual query augmenters. */
public class ContextualQueryAugmenterFactory {

  public static ContextualQueryAugmenter createInstance() {
    var emptyContextPromptTemplate =
        new PromptTemplate(
            """
          You should output the following content:
          Sorry, I can only answer programming-related questions. I can't help with other topics.
          If you have any issues, feel free to contact me at https://github.com/161043261
          """);
    return ContextualQueryAugmenter.builder()
        .allowEmptyContext(false)
        .emptyContextPromptTemplate(emptyContextPromptTemplate)
        .build();
  }
}
