package com.github.tianchenghang.rag;

import org.springframework.ai.chat.client.advisor.api.Advisor;
import org.springframework.ai.rag.advisor.RetrievalAugmentationAdvisor;
import org.springframework.ai.rag.retrieval.search.VectorStoreDocumentRetriever;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;

/** Factory for creating custom RAG retrieval augmentation advisors. */
public class RagCustomAdvisorFactory {

  /**
   * Creates a custom RAG retrieval augmentation advisor.
   *
   * @param vectorStore The vector store.
   * @param status The status for filtering documents.
   * @return A custom RAG retrieval augmentation advisor.
   */
  public static Advisor createRagCustomAdvisor(VectorStore vectorStore, String status) {
    // Filter documents by the specified status
    var expression = new FilterExpressionBuilder().eq("status", status).build();
    // Create a document retriever
    var documentRetriever =
        VectorStoreDocumentRetriever.builder()
            .vectorStore(vectorStore)
            .filterExpression(expression) // Filter condition
            .similarityThreshold(0.5) // Similarity threshold
            .topK(3) // Number of documents to return
            .build();
    return RetrievalAugmentationAdvisor.builder()
        .documentRetriever(documentRetriever)
        .queryAugmenter(ContextualQueryAugmenterFactory.createInstance())
        .build();
  }
}
