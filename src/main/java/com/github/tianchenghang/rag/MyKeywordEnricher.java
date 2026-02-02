package com.github.tianchenghang.rag;

import jakarta.annotation.Resource;
import java.util.List;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.document.Document;
import org.springframework.ai.model.transformer.KeywordMetadataEnricher;
import org.springframework.stereotype.Component;

@Component
public class MyKeywordEnricher {

  @Resource private ChatModel dashscopeChatModel;

  public List<Document> enrichDocuments(List<Document> documents) {
    var keywordMetadataEnricher = new KeywordMetadataEnricher(dashscopeChatModel, 5);
    return keywordMetadataEnricher.apply(documents);
  }
}
