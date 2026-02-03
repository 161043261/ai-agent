package com.github.tianchenghang.rag;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.markdown.MarkdownDocumentReader;
import org.springframework.ai.reader.markdown.config.MarkdownDocumentReaderConfig;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;

/** Document loader for the code application. */
@Component
@Slf4j
public class DocumentLoader {

  private final ResourcePatternResolver resourcePatternResolver;

  public DocumentLoader(ResourcePatternResolver resourcePatternResolver) {
    this.resourcePatternResolver = resourcePatternResolver;
  }

  /**
   * Load multiple Markdown documents.
   *
   * @return List of loaded documents.
   */
  public List<Document> loadMarkdowns() {
    var allDocuments = new ArrayList<Document>();
    try {
      // resources/docs/*.md
      Resource[] resources = resourcePatternResolver.getResources("classpath:docs/*.md");
      for (var resource : resources) {
        var filename = resource.getFilename();
        var config =
            MarkdownDocumentReaderConfig.builder()
                .withHorizontalRuleCreateDocument(true)
                .withIncludeCodeBlock(false)
                .withIncludeBlockquote(false)
                .withAdditionalMetadata("filename", filename)
                .build();
        var markdownDocumentReader = new MarkdownDocumentReader(resource, config);
        allDocuments.addAll(markdownDocumentReader.get());
      }
    } catch (IOException e) {
      log.error("Load markdown documents error:", e);
    }
    return allDocuments;
  }
}
