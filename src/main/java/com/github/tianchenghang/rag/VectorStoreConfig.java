package com.github.tianchenghang.rag;

import jakarta.annotation.Resource;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Vector store configuration for the Love Master application (initializes an in-memory vector store
 * Bean).
 */
@Configuration
public class VectorStoreConfig {

  @Resource private DocumentLoader documentLoader;

  @Resource private MyTokenTextSplitter myTokenTextSplitter;

  @Resource private MyKeywordEnricher myKeywordEnricher;

  @Bean
  VectorStore codeAppVectorStore(EmbeddingModel dashscopeEmbeddingModel) {
    var simpleVectorStore = SimpleVectorStore.builder(dashscopeEmbeddingModel).build();
    // Load documents
    var documentList = documentLoader.loadMarkdowns();
    // Split documents (commented out for now)
    // var splitDocuments = myTokenTextSplitter.splitCustomized(documentList);

    // Automatically enrich documents with keyword metadata
    var enrichedDocuments = myKeywordEnricher.enrichDocuments(documentList);
    simpleVectorStore.add(enrichedDocuments);
    return simpleVectorStore;
  }
}
